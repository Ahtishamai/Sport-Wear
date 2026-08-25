import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/collections`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/team-packages`, changeFrequency: 'monthly', priority: 0.8 },
  ];

  try {
    const [pages, products, collections] = await Promise.all([
      prisma.page.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { handle: true, updatedAt: true },
      }),
      prisma.collection.findMany({
        where: { status: 'PUBLISHED' },
        select: { handle: true, updatedAt: true },
      }),
    ]);

    const skip = new Set(['home', 'collections', 'team-packages', 'product-extras']);

    return [
      ...staticRoutes,
      ...pages
        .filter((p) => !skip.has(p.slug))
        .map((p) => ({
          url: `${base}/${p.slug}`,
          lastModified: p.updatedAt,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        })),
      ...collections.map((c) => ({
        url: `${base}/collections/${c.handle}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${base}/products/${p.handle}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
