import 'server-only';
import { getSession } from '@/lib/auth';
import { json, unauthorized } from '@/lib/api';
import { readLive } from '@/lib/traffic-read';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * How many people are on the site right now.
 *
 * Its own endpoint, and deliberately one query, because the traffic screen
 * polls it. Re-rendering the whole screen every half minute would run six
 * queries a time against a database that allows five hundred new
 * connections an hour.
 */
export async function GET() {
  if (!(await getSession())) return unauthorized();
  try {
    return json(await readLive());
  } catch {
    // The number going stale is not worth an error on screen.
    return json({ visitors: 0, views: 0, unavailable: true });
  }
}
