import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { siteBase } from '@/lib/seo';
import { freshness } from '@/lib/schema';

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
    const [pages, products, collections] = await Promise.all([
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
    ]);

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
        .filter((p) => !skip.has(p.slug))
        .map((p) => ({
          url: `${base}/${p.slug}`,
          lastModified: lastModified(p),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        })),
      ...collections.map((c) => ({
        url: `${base}/collections/${c.handle}`,
        lastModified: lastModified(c),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${base}/products/${p.handle}`,
        lastModified: lastModified(p),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return bareRoutes;
  }
}
