import { getSession } from '@/lib/auth';
import { json } from '@/lib/api';

export async function GET() {
  const user = await getSession();
  if (!user) return json({ user: null }, 401);
  return json({ user });
}
