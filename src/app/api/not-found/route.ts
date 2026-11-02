import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { recordNotFound } from '@/lib/not-found';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The beacon the 404 page fires, which is what fills the dead-ends report.
 *
 * Counting from the browser rather than from the render is deliberate. The
 * 404 pages are cached like any other page, so a count kept server-side would
 * record the first visitor to an address and then quietly miss the next
 * hundred. A beacon is one row per visit, every time.
 *
 * The cost is that a crawler which does not run JavaScript never reports its
 * dead ends. Real visitors and Google — which does run it — are what the
 * report is for.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  // Generous: a page of broken images could fire several in a row, and the
  // limit is only here to stop one machine inventing a report.
  if (!rateLimit(`nf:${ip}`, 60, 60_000).ok) return json({ ok: false }, 429);

  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body?.path ?? '');
    if (!path || path.length > 512) return badRequest('No address given.');

    // The browser says which page linked to it; the Referer header on this
    // request is the 404 page itself, which tells us nothing.
    const referrer = typeof body?.from === 'string' && body.from ? body.from.slice(0, 500) : null;

    const recorded = await recordNotFound(path, referrer);
    return json({ ok: true, recorded });
  } catch (err) {
    return serverError(err);
  }
}
