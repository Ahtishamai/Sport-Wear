import type { Metadata } from 'next';
import SiteLayout from './(site)/layout';
import { NotFoundView } from '@/components/site/NotFoundView';

/**
 * The 404 of last resort, for anything that reaches neither the site's own
 * routes nor the catch-all beside them.
 *
 * Nothing but drawing happens here, as in (site)/not-found.tsx: the redirect
 * was already looked for by whichever route gave up, and the dead end is
 * reported by the browser once this is on screen.
 *
 * A root 404 renders inside the root layout alone, so the header, footer and
 * cart are put back by calling the site layout directly. Being a component is
 * the whole of what a route group's layout is.
 */

export const metadata: Metadata = {
  title: { absolute: 'Page not found' },
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <SiteLayout>
      <NotFoundView />
    </SiteLayout>
  );
}
