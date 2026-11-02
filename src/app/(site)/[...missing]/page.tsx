import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { redirectAwayIfMoved } from '@/lib/not-found';

/**
 * Every address the site has no route for.
 *
 * Two or more segments deep, mostly: `/shop/jerseys/red` from a site that
 * used to be arranged differently. The router prefers any real route over a
 * catch-all, so this cannot shadow a page, a collection or a product — it
 * only ever sees addresses that were already going to be a dead end.
 *
 * It exists so that those addresses can be redirected at all. The alternative
 * is reading the path from a header the middleware sets, and rewriting
 * request headers takes every page out of the static cache.
 *
 * Rendered fresh every time, so a rule saved a second ago answers at once.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Page not found' },
  robots: { index: false, follow: true },
};

export default async function MissingPage({
  params,
}: {
  params: Promise<{ missing?: string[] }>;
}) {
  const { missing } = await params;
  const path = '/' + (missing ?? []).join('/');

  await redirectAwayIfMoved(path);
  notFound();
}
