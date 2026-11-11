import { getSession } from '@/lib/auth';
import { json } from '@/lib/api';

/**
 * Who is signed in, if anybody.
 *
 * Answered with a 200 and a null either way. "Nobody is signed in" is the
 * true answer to the question, not a failure to answer it, and a 401 here
 * put a red error in the console of every visitor who was simply not logged
 * in — which is all of them, on a shop.
 */
export async function GET() {
  const user = await getSession();
  return json({ user: user ?? null });
}
