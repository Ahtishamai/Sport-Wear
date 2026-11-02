import type { Metadata } from 'next';
import { NotFoundView } from '@/components/site/NotFoundView';

/**
 * The 404 for addresses the site's own pages threw away.
 *
 * Nothing but drawing happens here. The redirect was already looked for by
 * the page that gave up — it knew the address from its own parameters — and
 * the dead end is reported by the browser once this is on screen. Reading a
 * request header in this file would make every prerendered product page turn
 * dynamic the next time it refreshed, and fail with it.
 */

export const metadata: Metadata = {
  title: { absolute: 'Page not found' },
  robots: { index: false, follow: true },
};

export default function SiteNotFound() {
  return <NotFoundView />;
}
