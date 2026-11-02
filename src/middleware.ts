import { NextResponse, type NextRequest } from 'next/server';

/**
 * Passes the request path to the admin layout as a header.
 *
 * A layout has no other way to read the pathname, and the admin layout needs
 * it to turn away accounts whose permissions do not cover the page being
 * rendered.
 *
 * It runs on the admin alone, and must stay that way. Rewriting a request's
 * headers takes a page out of the static cache, so widening this to the whole
 * site made every prerendered product page fail with "changed from static to
 * dynamic at runtime" the next time it refreshed. Anything on the public side
 * that needs to know its own address reads it from its route parameters —
 * see (site)/[...missing]/page.tsx.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/admin/:path*'],
};
