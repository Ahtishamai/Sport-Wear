import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { siteBase } from '@/lib/seo';
import { freshness } from '@/lib/schema';
import { getSettings } from '@/lib/settings';
import { getCatalogFacets } from '@/lib/queries';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBase();

  /*
   * The three routes that are not listed from a table of their own.
   *
   * Each is still written in the CMS, under the slug beside it, so the date
   * is a real one rather than nothing. Printed without a date these were the
   * only entries in the file a crawler could learn nothing from, and the
   * home page was one of them.
   */
  const STATIC: { path: string; slug: string; changeFrequency: 'weekly' | 'monthly'; priority: number }[] = [
    { path: '/', slug: 'home', changeFrequency: 'weekly', priority: 1 },
    { path: '/collections', slug: 'collections', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/team-packages', slug: 'team-packages', changeFrequency: 'monthly', priority: 0.8 },
  ];

  /** With no database, the addresses are still worth giving; the dates are not. */
  const bareRoutes: MetadataRoute.Sitemap = STATIC.map((r) => ({
    url: `${base}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  try {
    const [settings, pages, products, collections, facets] = await Promise.all([
      getSettings(),
      prisma.page.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, createdAt: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { handle: true, createdAt: true, updatedAt: true },
      }),
      prisma.collection.findMany({
        where: { status: 'PUBLISHED' },
        select: { handle: true, createdAt: true, updatedAt: true },
      }),
      // The same live counts the collection page reads to decide whether it
      // asks not to be indexed.
      getCatalogFacets(),
    ]);

    /*
     * A collection with nothing on it asks not to be indexed (see
     * collections/[handle]/page.tsx), so listing it here would be the site
     * contradicting itself — the same reason products are left out below.
     * Read from the same count, so the two cannot disagree; it rejoins the
     * sitemap by itself the moment a product is filed there.
     */
    const stocked = new Set(facets.collections.filter((c) => c.count > 0).map((c) => c.handle));
    // No counts at all means they could not be read (the shared cache falls
    // back to an empty list), not that every shelf is bare. List them all
    // rather than drop every collection from the sitemap on a database blip.
    const isListed = (handle: string) => facets.collections.length === 0 || stocked.has(handle);

    const skip = new Set(['home', 'collections', 'team-packages', 'product-extras']);

    /*
     * One date per address, and the same one the page itself prints in its
     * structured data and its meta tags. Taken from `freshness` rather than
     * read off the row here, so the two cannot drift apart later.
     */
    const lastModified = (row: { createdAt: Date; updatedAt: Date }) =>
      freshness(row).dateModified;

    return [
      ...STATIC.map((r) => {
        const row = pages.find((p) => p.slug === r.slug);
        return {
          url: `${base}${r.path}`,
          lastModified: row ? lastModified(row) : undefined,
          changeFrequency: r.changeFrequency,
          priority: r.priority,
        };
      }),
      ...pages
        // Ad landing pages (lp-…) ask not to be indexed; see lib/landing.ts.
        .filter((p) => !skip.has(p.slug) && !p.slug.startsWith('lp-'))
        .map((p) => ({
          url: `${base}/${p.slug}`,
          lastModified: lastModified(p),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        })),
      ...collections.filter((c) => isListed(c.handle)).map((c) => ({
        url: `${base}/collections/${c.handle}`,
        lastModified: lastModified(c),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      /*
       * Products are left out while they are asked not to be indexed.
       *
       * A sitemap is a list of pages worth ranking, so listing one that
       * carries a noindex tag is the site contradicting itself — Search
       * Console reports it as an error, and rightly.
       */
      ...(settings.indexProducts === false
        ? []
        : products.map((p) => ({
            url: `${base}/products/${p.handle}`,
            lastModified: lastModified(p),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))),
    ];
  } catch {
    return bareRoutes;
  }
}
