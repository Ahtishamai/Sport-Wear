import { NextResponse, type NextRequest } from 'next/server';
import { matchGone, type RedirectRule } from '@/lib/redirects';

/**
 * Two jobs, and they must stay apart.
 *
 * On the admin, the request path is passed to the layout as a header, because
 * a layout has no other way to read it and the admin layout needs it to turn
 * away accounts whose permissions do not cover the page being rendered.
 *
 * On the public side, an address the shop has marked gone is answered 410
 * instead of 404. Everything else is passed straight through with a plain
 * `next()` and nothing added to it. That distinction matters: rewriting a
 * request's headers takes a page out of the static cache, and doing it site
 * wide once made every prerendered product page fail with "changed from
 * static to dynamic at runtime" the next time it refreshed. A plain pass
 * through does not, so the public side keeps its prerendering.
 */

/** How long the middleware trusts its copy of the rules. */
const TTL_MS = 60_000;

let cache: { at: number; rules: RedirectRule[] } = { at: 0, rules: [] };
let inFlight: Promise<void> | null = null;

/**
 * The rules, kept in memory and refreshed at most once a minute.
 *
 * A stale copy is served while the new one is fetched, and a failure leaves
 * the old copy in place rather than throwing: the worst a stale minute can do
 * is answer 404 where it should have answered 410, and the worst a failure
 * can do is the same. Neither is worth putting an error in front of a
 * shopper for.
 */
async function currentRules(origin: string): Promise<RedirectRule[]> {
  const fresh = Date.now() - cache.at < TTL_MS;
  if (fresh) return cache.rules;

  if (!inFlight) {
    inFlight = (async () => {
      try {
        const res = await fetch(origin + '/api/gone', { cache: 'no-store' });
        if (res.ok) cache = { at: Date.now(), rules: (await res.json()) as RedirectRule[] };
        else cache = { ...cache, at: Date.now() };
      } catch {
        // Keep what we have and try again after the next minute.
        cache = { ...cache, at: Date.now() };
      } finally {
        inFlight = null;
      }
    })();
  }

  // Nothing yet: wait for the first answer. Afterwards, never block.
  if (cache.at === 0) await inFlight;
  return cache.rules;
}

const GONE_BODY = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Gone</title></head>
<body style="font:16px/1.6 system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:0 1.25rem">
<h1 style="font-size:1.5rem;margin:0 0 .5rem">This page is gone</h1>
<p style="color:#55575e;margin:0 0 1.25rem">It was removed and is not coming back.</p>
<p><a href="/" style="color:#111">Go to the home page</a> &nbsp;·&nbsp;
<a href="/collections" style="color:#111">Browse everything we make</a></p>
</body></html>`;

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    const headers = new Headers(req.headers);
    headers.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers } });
  }

  try {
    if (matchGone(pathname, await currentRules(origin))) {
      return new NextResponse(GONE_BODY, {
        status: 410,
        headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
      });
    }
  } catch {
    /* A page is better than an error page. */
  }

  return NextResponse.next();
}

export const config = {
  /*
   * The admin, and the public pages a person can ask for. Next's own files,
   * the API, uploaded media and anything with a file extension are left
   * alone: none of them is an address a shop marks gone, and keeping them
   * out means no lost visitor costs an extra round trip.
   */
  matcher: ['/admin/:path*', '/((?!_next/|api/|uploads/|favicon\\.ico).*)'],
};
