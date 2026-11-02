import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import {
  checkPassword,
  claimRememberedOrder,
  CustomerError,
  endCustomerSession,
  getCustomer,
  hashPassword,
  issueToken,
  looksLikeEmail,
  normalizeEmail,
  passwordProblem,
  spendToken,
  startCustomerSession,
} from '@/lib/customer';
import { sendAccountEmail } from '@/lib/emails/account';
import { isMailReady, getMailConfig } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Everything an account can do, as one endpoint keyed by `action`.
 *
 * Two rules run through all of it. Nothing ever reveals whether an address
 * has an account — not signing in, not asking for a reset — because that
 * answer is worth money to whoever is asking. And nothing trusts the browser
 * about who it is: the session cookie is the only thing that says so.
 */

const PUBLIC_SHAPE = (c: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  shipTo: unknown;
  verifiedAt: Date | null;
}) => ({
  id: c.id,
  email: c.email,
  name: c.name,
  phone: c.phone,
  shipTo: c.shipTo ?? null,
  verified: Boolean(c.verifiedAt),
});

/** Who is signed in, for the checkout form and the header. */
export async function GET() {
  try {
    const me = await getCustomer();
    return json({ customer: me ? PUBLIC_SHAPE(me) : null });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request.');
  }
  const action = String(body?.action ?? '');

  try {
    switch (action) {
      case 'register':
        return await register(ip, body);
      case 'login':
        return await login(ip, body);
      case 'logout':
        await endCustomerSession();
        return json({ ok: true });
      case 'forgot':
        return await forgot(ip, body);
      case 'reset':
        return await reset(ip, body);
      case 'verify':
        return await verify(body);
      case 'resend':
        return await resend(ip);
      case 'details':
        return await details(body);
      case 'password':
        return await changePassword(body);
      default:
        return badRequest(`Unknown action "${action}"`);
    }
  } catch (err) {
    if (err instanceof CustomerError) return json({ error: err.message }, err.status);
    return serverError(err);
  }
}

// ------------------------------------------------------------------ joining

async function register(ip: string, body: Record<string, any>) {
  const email = normalizeEmail(body.email);
  const name = String(body.name ?? '').trim().slice(0, 120);
  const password = String(body.password ?? '');

  if (!name) return badRequest('Tell us your name.');
  if (!looksLikeEmail(email)) return badRequest('Check the email address.');
  const weak = passwordProblem(password);
  if (weak) return badRequest(weak);

  /*
   * Counted after the form has been checked, not before.
   *
   * A whole baseball club shares one address at the field, and a coach who
   * mistypes their password twice must not use up the team's allowance. What
   * this is guarding against is a machine making accounts in bulk, and that
   * machine gets the form right every time.
   */
  if (!rateLimit(`acct-new:${ip}`, 10, 60 * 60_000).ok) {
    return json({ error: 'Too many accounts from here. Try again later.' }, 429);
  }

  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Saying "that address already has an account" would turn this form into
    // a way of testing which of your customers shops here. The reset email
    // is the honest way back in, and it goes to the address itself.
    return json({
      ok: true,
      pending: true,
      message:
        'Check your email. If that address can have an account, there is a link waiting in it.',
    });
  }

  const customer = await prisma.customer.create({
    data: { email, name, passwordHash: await hashPassword(password) },
    select: { id: true, email: true, name: true },
  });

  await startCustomerSession(customer);

  // An order placed in this browser minutes ago belongs to whoever is making
  // this account — the browser that checked out is the one asking.
  const claimed = await claimRememberedOrder(customer.id);

  const mail = await sendVerification(customer.id, customer.email, customer.name);
  return json({
    ok: true,
    customer: { id: customer.id, email: customer.email, name: customer.name, verified: false },
    claimed,
    mail,
  });
}

/** Issues a link and sends it, reporting plainly when email is not set up. */
async function sendVerification(id: string, email: string, name: string) {
  const cfg = await getMailConfig();
  if (!isMailReady(cfg)) {
    console.warn('[account] email is not configured; no verification link was sent');
    return { sent: false, reason: 'not_configured' as const };
  }
  const token = await issueToken(id, 'VERIFY', 48 * 60);
  const res = await sendAccountEmail('VERIFY', email, { name, token });
  if (!res.ok) console.error('[account] verification email failed:', res.error);
  return { sent: res.ok, reason: res.ok ? null : ('send_failed' as const) };
}

// ------------------------------------------------------------------ signing in

async function login(ip: string, body: Record<string, any>) {
  if (!rateLimit(`acct-in:${ip}`, 12, 10 * 60_000).ok) {
    return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429);
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password ?? '');
  if (!email || !password) return badRequest('Enter your email and password.');

  const row = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, verifiedAt: true },
  });

  // One message for both halves, so this cannot be used to find out which
  // addresses have accounts.
  const wrong = json({ error: 'That email and password do not match.' }, 401);
  if (!row) return wrong;
  if (!(await checkPassword(password, row.passwordHash))) return wrong;

  await startCustomerSession({ id: row.id, email: row.email, name: row.name });
  await prisma.customer.update({ where: { id: row.id }, data: { lastLoginAt: new Date() } });
  const claimed = await claimRememberedOrder(row.id);

  return json({
    ok: true,
    claimed,
    customer: { id: row.id, email: row.email, name: row.name, verified: Boolean(row.verifiedAt) },
  });
}

// ------------------------------------------------------------------ passwords

async function forgot(ip: string, body: Record<string, any>) {
  if (!rateLimit(`acct-forgot:${ip}`, 6, 60 * 60_000).ok) {
    return json({ error: 'Too many requests. Try again later.' }, 429);
  }

  const email = normalizeEmail(body.email);
  // The same answer whether or not the address is on file.
  const same = json({
    ok: true,
    message: 'If that address has an account, a link to set a new password is on its way.',
  });
  if (!looksLikeEmail(email)) return same;

  const row = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!row) return same;

  const cfg = await getMailConfig();
  if (!isMailReady(cfg)) {
    console.warn('[account] email is not configured; no reset link was sent');
    return same;
  }

  const token = await issueToken(row.id, 'RESET', 60);
  const res = await sendAccountEmail('RESET', row.email, { name: row.name, token });
  if (!res.ok) console.error('[account] reset email failed:', res.error);
  return same;
}

async function reset(ip: string, body: Record<string, any>) {
  if (!rateLimit(`acct-reset:${ip}`, 20, 60 * 60_000).ok) {
    return json({ error: 'Too many attempts. Try again later.' }, 429);
  }

  const password = String(body.password ?? '');
  const weak = passwordProblem(password);
  if (weak) return badRequest(weak);

  const customerId = await spendToken(String(body.token ?? ''), 'RESET');
  if (!customerId) {
    return badRequest('That link has expired or has already been used. Ask for a new one.');
  }

  const row = await prisma.customer.update({
    where: { id: customerId },
    data: {
      passwordHash: await hashPassword(password),
      // Reading the address is proof enough of owning it, and it saves the
      // customer a second email that asks for the same thing.
      verifiedAt: new Date(),
    },
    select: { id: true, email: true, name: true },
  });

  await startCustomerSession(row);
  const claimed = await claimRememberedOrder(row.id);
  return json({ ok: true, claimed, customer: { ...row, verified: true } });
}

async function changePassword(body: Record<string, any>) {
  const me = await getCustomer();
  if (!me) return json({ error: 'Sign in first.' }, 401);

  const current = String(body.current ?? '');
  const next = String(body.password ?? '');
  const weak = passwordProblem(next);
  if (weak) return badRequest(weak);

  const row = await prisma.customer.findUnique({
    where: { id: me.id },
    select: { passwordHash: true },
  });
  if (!row || !(await checkPassword(current, row.passwordHash))) {
    return badRequest('That is not your current password.');
  }

  await prisma.customer.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return json({ ok: true });
}

// ------------------------------------------------------------------ the address

async function verify(body: Record<string, any>) {
  const customerId = await spendToken(String(body.token ?? ''), 'VERIFY');
  if (!customerId) {
    return badRequest('That link has expired or has already been used. Ask for a new one.');
  }

  const row = await prisma.customer.update({
    where: { id: customerId },
    data: { verifiedAt: new Date() },
    select: { id: true, email: true, name: true },
  });

  // Following the link is proof of reading the inbox, so it also signs them
  // in — on whichever device opened the email.
  await startCustomerSession(row);
  const claimed = await claimRememberedOrder(row.id);
  return json({ ok: true, claimed, customer: { ...row, verified: true } });
}

async function resend(ip: string) {
  const me = await getCustomer();
  if (!me) return json({ error: 'Sign in first.' }, 401);
  if (me.verifiedAt) return json({ ok: true, already: true });
  if (!rateLimit(`acct-resend:${me.id}`, 3, 60 * 60_000).ok) {
    return json({ error: 'A link was sent recently. Check your spam folder.' }, 429);
  }

  const mail = await sendVerification(me.id, me.email, me.name);
  return json({ ok: true, mail });
}

// ------------------------------------------------------------------ details

async function details(body: Record<string, any>) {
  const me = await getCustomer();
  if (!me) return json({ error: 'Sign in first.' }, 401);

  const name = String(body.name ?? '').trim().slice(0, 120);
  if (!name) return badRequest('Tell us your name.');

  const ship = body.shipTo ?? {};
  const shipTo = {
    line1: String(ship.line1 ?? '').trim().slice(0, 160),
    line2: String(ship.line2 ?? '').trim().slice(0, 160),
    city: String(ship.city ?? '').trim().slice(0, 80),
    state: String(ship.state ?? '').trim().slice(0, 80),
    postcode: String(ship.postcode ?? '').trim().slice(0, 24),
  };
  const anyAddress = Object.values(shipTo).some(Boolean);

  const row = await prisma.customer.update({
    where: { id: me.id },
    data: {
      name,
      phone: String(body.phone ?? '').trim().slice(0, 40) || null,
      shipTo: anyAddress ? shipTo : undefined,
    },
    select: { id: true, email: true, name: true, phone: true, shipTo: true, verifiedAt: true },
  });

  // The name is in the session token, so it has to be reissued or the header
  // keeps greeting them by the old one.
  await startCustomerSession({ id: row.id, email: row.email, name: row.name });
  return json({ ok: true, customer: PUBLIC_SHAPE(row) });
}
