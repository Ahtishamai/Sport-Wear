import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

/**
 * Accounts for the people who buy, kept apart from the admin's.
 *
 * A different table, a different cookie and a different claim in the token.
 * The admin and the shop share one signing secret, so without that claim a
 * shopper's token dropped into the admin cookie would verify, and the admin's
 * own reader defaults an unknown role to EDITOR. The `t: 'c'` claim below,
 * and the matching refusal in lib/auth.ts, are what close that door.
 */

const COOKIE = 'ds_customer';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — a shopper is not an operator

export type CustomerSession = { id: string; email: string; name: string };

export class CustomerError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new CustomerError('Accounts are not set up on this server yet.', 500);
  }
  return new TextEncoder().encode(s);
}

export const normalizeEmail = (raw: unknown) =>
  String(raw ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 160);

export const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/**
 * What a password has to clear.
 *
 * Length and nothing else. Rules about capitals and symbols push people
 * towards one predictable shape and a sticky note; length is what actually
 * costs an attacker time.
 */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (pw.length > 200) return 'That password is too long.';
  return null;
}

// ------------------------------------------------------------------ session

export async function startCustomerSession(c: CustomerSession) {
  const token = await new SignJWT({ ...c, t: 'c' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function endCustomerSession() {
  (await cookies()).delete(COOKIE);
}

/** Who is signed in, from the cookie alone. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    // An admin token in this cookie must not be read as a shopper either.
    if (payload.t !== 'c') return null;
    return { id: String(payload.id), email: String(payload.email), name: String(payload.name) };
  } catch {
    return null;
  }
}

export type CustomerRecord = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  shipTo: unknown;
  verifiedAt: Date | null;
};

/**
 * The account as it stands now, read fresh.
 *
 * The cookie says who they are; everything that can change — their name,
 * their address, whether the email is proved — is read from the table, so a
 * month-old cookie never shows month-old facts. An account deleted since the
 * cookie was issued reads as nobody.
 */
export async function getCustomer(): Promise<CustomerRecord | null> {
  const s = await getCustomerSession();
  if (!s) return null;
  try {
    return await prisma.customer.findUnique({
      where: { id: s.id },
      select: { id: true, email: true, name: true, phone: true, shipTo: true, verifiedAt: true },
    });
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ passwords

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// ------------------------------------------------------------------ tokens

/**
 * A single-use link.
 *
 * The caller gets the token once, to put in an email; the table only ever
 * holds its SHA-256. Older unused tokens of the same kind are spent, so a
 * link that was emailed and then superseded cannot still be followed.
 */
export async function issueToken(customerId: string, kind: 'VERIFY' | 'RESET', minutes: number) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  await prisma.$transaction([
    prisma.customerToken.updateMany({
      where: { customerId, kind, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.customerToken.create({
      data: {
        customerId,
        kind,
        tokenHash,
        expiresAt: new Date(Date.now() + minutes * 60_000),
      },
    }),
  ]);

  return token;
}

/** Spends a token and returns whose it was, or null if it is no good. */
export async function spendToken(token: string, kind: 'VERIFY' | 'RESET') {
  const tokenHash = createHash('sha256').update(String(token ?? '')).digest('hex');
  const row = await prisma.customerToken.findUnique({ where: { tokenHash } });
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt < new Date()) return null;

  // Spent by the same statement that finds it still unspent, so two clicks
  // on the same link in the same second cannot both go through.
  const { count } = await prisma.customerToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1 ? row.customerId : null;
}

// ------------------------------------------------------------------ orders

/**
 * Which orders belong to an account.
 *
 * Two ways in: it was placed while they were signed in, or it was placed as a
 * guest with their email address and they have since proved that address. The
 * second half is the whole reason `verifiedAt` exists — without it, signing up
 * with somebody else's email would be enough to read their order history.
 */
export function ordersWhere(c: { id: string; email: string; verifiedAt: Date | null }) {
  return c.verifiedAt
    ? { OR: [{ customerId: c.id }, { email: c.email }] }
    : { customerId: c.id };
}

// ------------------------------------------------------------------ claiming

const ORDER_COOKIE = 'ds_order';
const ORDER_MAX_AGE = 60 * 60 * 2; // long enough to make an account afterwards

/**
 * Remembers, in this browser alone, the order it has just placed.
 *
 * So that making an account on the thank-you page can pick that order up.
 * It has to be a signed cookie rather than the order number: references are
 * DS plus five digits, which anyone could work through in an afternoon, and a
 * claim based on one would hand over other people's orders. A cookie set by
 * this server to the browser that actually checked out cannot be guessed.
 */
export async function rememberOrder(orderId: string) {
  try {
    const token = await new SignJWT({ oid: orderId, t: 'o' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${ORDER_MAX_AGE}s`)
      .sign(secret());

    (await cookies()).set(ORDER_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ORDER_MAX_AGE,
    });
  } catch (err) {
    // A convenience, never a reason to fail a checkout.
    console.error('[account] could not remember the order:', err);
  }
}

/**
 * Hands the order this browser just placed to an account.
 *
 * Called whenever a session starts, so it catches both the shopper who makes
 * an account on the thank-you page and the one who remembers they already had
 * one. An order that already belongs to somebody is left alone.
 */
export async function claimRememberedOrder(customerId: string): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(ORDER_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret());
    if (payload.t !== 'o' || !payload.oid) return null;

    const { count } = await prisma.shopOrder.updateMany({
      where: { id: String(payload.oid), customerId: null },
      data: { customerId },
    });
    jar.delete(ORDER_COOKIE);
    if (count === 0) return null;

    const row = await prisma.shopOrder.findUnique({
      where: { id: String(payload.oid) },
      select: { reference: true },
    });
    return row?.reference ?? null;
  } catch {
    return null;
  }
}
