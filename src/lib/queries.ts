import 'server-only';
import { cache } from 'react';
import { prisma } from './db';
import type { CardPackage, CardProduct } from '@/components/blocks/primitives';
import type { CollectionCard, ReviewItem } from '@/components/blocks/sections';
import type { FaqItem } from '@/components/blocks/FaqBlock';
import type { NavLink } from '@/components/site/Header';
import { DEFAULT_TIERS, SIZE_RUN, type VolumeTier } from './utils';

const PUBLISHED = { status: 'PUBLISHED' as const };

// ------------------------------------------------------------------ products

const productSelect = {
  id: true,
  handle: true,
  title: true,
  basePrice: true,
  badge: true,
  categoryLabel: true,
  images: { select: { url: true, alt: true }, orderBy: { position: 'asc' as const }, take: 1 },
};

type RawProduct = {
  id: string;
  handle: string;
  title: string;
  basePrice: unknown;
  badge: string | null;
  categoryLabel: string;
  images: { url: string; alt: string }[];
};

function toCard(p: RawProduct): CardProduct {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    basePrice: Number(p.basePrice),
    badge: p.badge,
    categoryLabel: p.categoryLabel,
    image: p.images[0]?.url ?? null,
  };
}

export const getProductsForBlock = cache(
  async (opts: {
    source?: string;
    collectionHandle?: string;
    handles?: string[];
    limit?: number;
    excludeId?: string;
  }): Promise<CardProduct[]> => {
    const take = Math.min(Math.max(Number(opts.limit) || 4, 1), 24);
    const where: Record<string, unknown> = { ...PUBLISHED };
    if (opts.excludeId) where.id = { not: opts.excludeId };

    if (opts.source === 'manual' && opts.handles?.length) {
      const rows = await prisma.product.findMany({
        where: { ...where, handle: { in: opts.handles } },
        select: productSelect,
      });
      const order = new Map(opts.handles.map((h, i) => [h, i]));
      return rows
        .sort((a, b) => (order.get(a.handle) ?? 99) - (order.get(b.handle) ?? 99))
        .slice(0, take)
        .map(toCard);
    }

    if (opts.source === 'collection' && opts.collectionHandle) {
      const rows = await prisma.product.findMany({
        where: {
          ...where,
          collections: { some: { collection: { handle: opts.collectionHandle } } },
        },
        select: productSelect,
        orderBy: { position: 'asc' },
        take,
      });
      return rows.map(toCard);
    }

    const rows = await prisma.product.findMany({
      where: opts.source === 'featured' ? { ...where, featured: true } : where,
      select: productSelect,
      orderBy: opts.source === 'newest' ? { createdAt: 'desc' } : { position: 'asc' },
      take,
    });
    return rows.map(toCard);
  }
);

export const getProductByHandle = cache(async (handle: string) => {
  const p = await prisma.product.findUnique({
    where: { handle },
    include: {
      images: { orderBy: { position: 'asc' } },
      collections: { include: { collection: true } },
    },
  });
  if (!p || p.status === 'ARCHIVED') return null;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    basePrice: Number(p.basePrice),
    badge: p.badge,
    categoryLabel: p.categoryLabel,
    status: p.status,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
    sports: (p.sports as string[] | null) ?? ['Baseball', 'Softball', 'Other'],
    colorways:
      (p.colorways as { name: string; from: string; to: string }[] | null) ?? DEFAULT_COLORWAYS,
    sizes: (p.sizes as string[] | null) ?? SIZE_RUN,
    defaultQty: (p.defaultQty as Record<string, number> | null) ?? { S: 2, M: 4, L: 4, XL: 2 },
    volumeTiers: (p.volumeTiers as VolumeTier[] | null) ?? DEFAULT_TIERS,
    specs: (p.specs as { q: string; a: string }[] | null) ?? [],
    trustPoints:
      (p.trustPoints as string[] | null) ?? [
        'No deposit to get a quote',
        'Names & numbers included',
        'Reorders anytime',
      ],
    collections: p.collections.map((c) => ({
      handle: c.collection.handle,
      title: c.collection.title,
    })),
  };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductByHandle>>>;

export const DEFAULT_COLORWAYS = [
  { name: 'Navy / Gold', from: '#16264B', to: '#FFD100' },
  { name: 'Black / Red', from: '#1A1A1A', to: '#C42027' },
  { name: 'Royal / White', from: '#1B4FD8', to: '#F2F2EF' },
  { name: 'Forest / Cream', from: '#1E4632', to: '#E8DFC8' },
  { name: 'Maroon / Grey', from: '#6B1D2B', to: '#9DA1A8' },
];

// ------------------------------------------------------------------ collections

export const getCollectionCards = cache(async (limit = 12): Promise<CollectionCard[]> => {
  const rows = await prisma.collection.findMany({
    where: PUBLISHED,
    orderBy: { position: 'asc' },
    take: limit,
    include: { _count: { select: { products: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    handle: c.handle,
    title: c.title,
    subtitle: c.subtitle,
    thumbUrl: c.thumbUrl ?? c.bannerUrl,
    count: c._count.products,
  }));
});

export const getCollectionByHandle = cache(async (handle: string) => {
  const c = await prisma.collection.findUnique({ where: { handle } });
  if (!c || c.status === 'ARCHIVED') return null;
  return c;
});

/** Sidebar facets: every published collection plus its live product count. */
export const getCatalogFacets = cache(async () => {
  const [total, cols] = await Promise.all([
    prisma.product.count({ where: PUBLISHED }),
    prisma.collection.findMany({
      where: PUBLISHED,
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ]);
  return {
    total,
    collections: cols.map((c) => ({
      handle: c.handle,
      title: c.title,
      count: c._count.products,
    })),
  };
});

export type CatalogQuery = {
  collection?: string;
  maxPrice?: number;
  sort?: string;
  q?: string;
  /** 'full-sub' | 'stock' — matched against the product badge. */
  fabric?: string[];
};

export async function getCatalog(query: CatalogQuery) {
  const where: Record<string, unknown> = { ...PUBLISHED };
  if (query.collection && query.collection !== 'all') {
    where.collections = { some: { collection: { handle: query.collection } } };
  }
  if (query.maxPrice) where.basePrice = { lte: query.maxPrice };
  if (query.q) where.title = { contains: query.q };
  if (query.fabric?.length) {
    const map: Record<string, string> = { 'full-sub': 'Full sub', stock: 'Stock' };
    const terms = query.fabric.map((f) => map[f]).filter(Boolean);
    if (terms.length) where.OR = terms.map((t) => ({ badge: { contains: t } }));
  }

  const orderBy =
    query.sort === 'price-asc'
      ? { basePrice: 'asc' as const }
      : query.sort === 'price-desc'
        ? { basePrice: 'desc' as const }
        : query.sort === 'name-asc'
          ? { title: 'asc' as const }
          : query.sort === 'newest'
            ? { createdAt: 'desc' as const }
            : { position: 'asc' as const };

  const rows = await prisma.product.findMany({ where, orderBy, select: productSelect });
  return rows.map(toCard);
}

export const getPriceBounds = cache(async () => {
  const agg = await prisma.product.aggregate({
    where: PUBLISHED,
    _min: { basePrice: true },
    _max: { basePrice: true },
  });
  return {
    min: Math.floor(Number(agg._min.basePrice ?? 0)),
    max: Math.ceil(Number(agg._max.basePrice ?? 250)),
  };
});

// ------------------------------------------------------------------ content

export const getPackages = cache(async (limit = 4): Promise<CardPackage[]> => {
  const rows = await prisma.teamPackage.findMany({
    where: PUBLISHED,
    orderBy: { position: 'asc' },
    take: limit,
  });
  return rows.map((p) => ({
    id: p.id,
    handle: p.handle,
    tag: p.tag,
    name: p.name,
    price: Number(p.price),
    note: p.note,
    items: (p.items as string[] | null) ?? [],
    imageUrl: p.imageUrl,
    highlight: p.highlight,
  }));
});

export const getReviews = cache(async (limit = 12): Promise<ReviewItem[]> => {
  const rows = await prisma.review.findMany({
    where: { published: true },
    orderBy: { position: 'asc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    name: r.name,
    role: r.role,
    initials: r.initials,
    rating: r.rating,
  }));
});

export const getFaqs = cache(async (group = 'home'): Promise<FaqItem[]> => {
  const rows = await prisma.faq.findMany({
    where: { group, published: true },
    orderBy: { position: 'asc' },
  });
  return rows.map((f) => ({ id: f.id, question: f.question, answer: f.answer }));
});

// ------------------------------------------------------------------ navigation & pages

export const getNav = cache(async () => {
  const rows = await prisma.navItem.findMany({ orderBy: { position: 'asc' } });
  const pick = (menu: string): NavLink[] =>
    rows
      .filter((r) => r.menu === menu)
      .map((r) => ({ id: r.id, label: r.label, href: r.href, newTab: r.newTab }));
  return {
    header: pick('header'),
    footerShop: pick('footer_shop'),
    footerCompany: pick('footer_company'),
  };
});

export const getPage = cache(async (slug: string) => {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || page.status !== 'PUBLISHED') return null;
  return page;
});

/** Used by the admin live preview — ignores publish status. */
export const getPageAnyStatus = cache(async (slug: string) => {
  return prisma.page.findUnique({ where: { slug } });
});
