import { login } from '@/lib/auth';
import { badRequest, clientIp, json, rateLimit } from '@/lib/api';

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

  const user = await login(email, password);
  if (!user) return json({ error: 'Those credentials did not match.' }, 401);

  return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
