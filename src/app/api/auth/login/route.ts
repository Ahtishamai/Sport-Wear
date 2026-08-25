import { ConfigError, login } from '@/lib/auth';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { isDbCapacityError, isDbUnreachableError } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 10, 5 * 60_000).ok) {
    return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429);
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request body.');
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  if (!email || !password) return badRequest('Email and password are required.');

  try {
    const user = await login(email, password);
    if (!user) return json({ error: 'Those credentials did not match.' }, 401);

    return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    // Without this, a thrown error became a bare 500 with no JSON body and the
    // sign-in form could only say "Sign in failed" — indistinguishable from a
    // wrong password. Each cause now reports itself.
    if (err instanceof ConfigError) {
      console.error('[auth] sign-in blocked by configuration:', err.message);
      return json(
        {
          error:
            'Sign-in is not configured on this server. Set AUTH_SECRET (32+ characters) in the environment and restart.',
          reason: 'auth_not_configured',
        },
        500
      );
    }

    if (isDbUnreachableError(err)) {
      console.error('[auth] database unreachable during sign-in:', err);
      return json(
        {
          error: 'The site cannot reach its database right now. Check DATABASE_URL on the server.',
          reason: 'db_unreachable',
        },
        503
      );
    }

    if (isDbCapacityError(err)) {
      console.error('[auth] database at capacity during sign-in:', err);
      return json(
        { error: 'The database is briefly at capacity. Try again in a moment.', reason: 'db_capacity' },
        503,
      );
    }

    return serverError(err);
  }
}
