import 'server-only';
import { cache } from 'react';
import { prisma } from './db';
import { storeClosedReason } from './store';
import { formatStoreDeadline } from './utils';
import type { StoreHeader, StoreItem } from '@/components/store/StoreFront';

/** Loads a published team store and its items, shaped for the storefront. */
export const getTeamStore = cache(async (slug: string) => {
  const store = await prisma.teamStore.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { position: 'asc' } },
      items: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: { categoryRef: { select: { id: true, name: true, position: true } } },
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
    closesAt: store.closesAt ? formatStoreDeadline(store.closesAt) : null,
    closesAtISO: store.closesAt ? store.closesAt.toISOString() : null,
    closedReason: storeClosedReason(store),
  };

  const items: StoreItem[] = store.items.map((i) => ({
    id: i.id,
    name: i.name,
    // A design with no category yet still has to land somewhere.
    category: i.categoryRef?.name ?? i.category ?? 'Other',
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

  // Sections follow the order set on the categories themselves, not the order
  // designs happen to be in.
  const sections = store.categories.map((c) => c.name);

  return {
    store,
    header,
    items,
    sections,
    seoTitle: store.seoTitle,
    seoDescription: store.seoDescription,
  };
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
