import 'server-only';
import { cache } from 'react';
import { prisma } from './db';
import { storeClosedReason } from './store';
import type { StoreHeader, StoreItem } from '@/components/store/StoreFront';

/** Loads a published team store and its items, shaped for the storefront. */
export const getTeamStore = cache(async (slug: string) => {
  const store = await prisma.teamStore.findUnique({
    where: { slug },
    include: {
      items: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!store || store.status === 'DRAFT') return null;

  const header: StoreHeader = {
    slug: store.slug,
    name: store.name,
    intro: store.intro,
    logoUrl: store.logoUrl,
    heroUrl: store.heroUrl,
    shipNote: store.shipNote,
    closesAt: store.closesAt
      ? store.closesAt.toLocaleDateString('en-US', { dateStyle: 'long' })
      : null,
    closedReason: storeClosedReason(store),
  };

  const items: StoreItem[] = store.items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    description: i.description,
    price: Number(i.price),
    images: ((i.images as { url: string; alt?: string }[] | null) ?? []).filter((x) => x?.url),
    sizes: ((i.sizes as string[] | null) ?? []).filter(Boolean),
    options: ((i.options as { name: string; values: string[] }[] | null) ?? []).filter(
      (o) => o?.name && Array.isArray(o.values) && o.values.length
    ),
    allowName: i.allowName,
    namePrice: Number(i.namePrice),
    allowNumber: i.allowNumber,
    numberPrice: Number(i.numberPrice),
  }));

  return { store, header, items, seoTitle: store.seoTitle, seoDescription: store.seoDescription };
});

/** Slugs that must resolve to a team store, used by the root [slug] route. */
export const getStoreSlugs = cache(async (): Promise<string[]> => {
  try {
    const rows = await prisma.teamStore.findMany({
      where: { status: { not: 'DRAFT' } },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
});
