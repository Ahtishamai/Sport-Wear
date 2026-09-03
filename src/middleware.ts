import { NextResponse, type NextRequest } from 'next/server';

/**
 * Passes the request path to server components as a header.
 *
 * The admin layout needs to know which page is being rendered so it can turn
 * away accounts whose permissions do not cover it, and a layout has no other
 * way to read the pathname.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/admin/:path*'],
};
