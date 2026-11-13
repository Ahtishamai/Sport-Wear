import { prisma } from '@/lib/db';
import { shared } from '@/lib/cache';

/**
 * The address rules, for the middleware.
 *
 * Middleware runs before the app and cannot reach the database, so it asks
 * here instead and keeps the answer for a minute. There are only ever a
 * handful of rules, so the whole set is cheaper to hand over than a query
 * per lost visitor would be — and this shop is allowed five hundred new
 * database connections an hour, which a query per request would eat.
 *
 * Only whether a rule has a target is sent, never the target itself. The
 * middleware needs that much to work out precedence: an exact redirect has
 * to beat a wildcard that marks everything below it as gone. Where a redirect
 * actually points is the app's business and is not published here.
 */
export const dynamic = 'force-dynamic';

const rules = shared(
  'gone-rules',
  ['redirects'],
  async () =>
    (
      await prisma.redirect.findMany({
        where: { active: true },
        select: { from: true, to: true, kind: true },
      })
    ).map((r) => ({
      from: r.from,
      // Present or absent, never the value.
      to: String(r.to ?? '').trim() ? 'x' : '',
      kind: r.kind,
    })),
  []
);

export async function GET() {
  const body = JSON.stringify(await rules());
  return new Response(body, {
    headers: {
      'content-type': 'application/json',
      // The middleware holds its own copy for a minute; this is for anything
      // in front of the app that might also be holding one.
      'cache-control': 'public, max-age=0, s-maxage=60',
    },
  });
}
