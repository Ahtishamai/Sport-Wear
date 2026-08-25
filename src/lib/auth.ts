import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const COOKIE = 'ds_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR';
};

/** Thrown when the deployment is missing required configuration. */
export class ConfigError extends Error {}

export function authSecretConfigured() {
  const s = process.env.AUTH_SECRET;
  return Boolean(s && s.length >= 16);
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new ConfigError(
      "AUTH_SECRET is missing or shorter than 16 characters. Set it in the server environment and restart."
    );
  }
  return new TextEncoder().encode(s);
}

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
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

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role === 'ADMIN' ? 'ADMIN' : 'EDITOR',
    };
  } catch {
    return null;
  }
}

/** Throws a 401-shaped error for route handlers. */
export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new AuthError('Not authenticated');
  return s;
}

export class AuthError extends Error {}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const su: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'ADMIN' | 'EDITOR',
  };
  await createSession(su);
  return su;
}
