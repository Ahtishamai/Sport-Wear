import 'server-only';
import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from './auth';
import { isDbCapacityError } from './db';

export { isDbCapacityError };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
}

export function serverError(err: unknown) {
  if (isDbCapacityError(err)) {
    console.error(
      '[db] Connection quota reached. Check `npm run db:limits`; lower connection_limit ' +
        'in DATABASE_URL or reduce the number of app instances.',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: 'The site is briefly at capacity. Please try again in a moment.' },
      { status: 503, headers: { 'Retry-After': '30' } }
    );
  }

  if (process.env.NODE_ENV === 'development') console.error(err);
  return NextResponse.json({ error: 'Something went wrong on our end.' }, { status: 500 });
}

/** Wraps an admin route handler with a session check. */
export async function withAdmin<T>(
  fn: (user: SessionUser) => Promise<T>
): Promise<T | NextResponse> {
  const user = await getSession();
  if (!user) return unauthorized();
  try {
    return await fn(user);
  } catch (err) {
    return serverError(err) as T;
  }
}

// ------------------------------------------------------------------ rate limit

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Naive in-process limiter — good enough for form spam on a single instance. */
export function rateLimit(key: string, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - b.count };
}

export function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}
