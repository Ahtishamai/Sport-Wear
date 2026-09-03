import 'server-only';
import { prisma } from './db';
import { slugify } from './utils';

/**
 * Declarative admin resource map. One config per Shopify-style object; the
 * generic CRUD handler in /api/admin/[...path] drives everything from here.
 */

export type ResourceConfig = {
  model: keyof typeof prisma;
  /** fields accepted from the client on create/update */
  fields: string[];
  /** field that must be unique + slugified (handle / slug / key) */
  slugField?: string;
  /** source field the slug is derived from when blank */
  slugFrom?: string;
  defaultOrder: Record<string, 'asc' | 'desc'>;
  include?: Record<string, unknown>;
  /** paths to revalidate after a write */
  revalidate: (row: Record<string, any>) => string[];
  /** numeric fields that must be coerced */
  decimals?: string[];
  ints?: string[];
  bools?: string[];
  jsons?: string[];
  /** rows that must never be deleted */
  protectedWhen?: (row: Record<string, any>) => boolean;
  searchFields?: string[];
};

export const RESOURCES: Record<string, ResourceConfig> = {
  products: {
    model: 'product',
    fields: [
      'handle',
      'title',
      'subtitle',
      'description',
      'basePrice',
      'compareAt',
      'badge',
      'categoryLabel',
      'status',
      'featured',
      'position',
      'sku',
      'sports',
      'colorways',
      'sizes',
      'defaultQty',
      'volumeTiers',
      'specs',
      'trustPoints',
      'seoTitle',
      'seoDescription',
    ],
    slugField: 'handle',
    slugFrom: 'title',
    defaultOrder: { position: 'asc' },
    include: {
      images: { orderBy: { position: 'asc' } },
      collections: { include: { collection: { select: { id: true, title: true, handle: true } } } },
    },
    decimals: ['basePrice', 'compareAt'],
    ints: ['position'],
    bools: ['featured'],
    jsons: ['sports', 'colorways', 'sizes', 'defaultQty', 'volumeTiers', 'specs', 'trustPoints'],
    revalidate: (r) => ['/', '/collections', `/products/${r.handle}`],
    searchFields: ['title', 'handle', 'sku'],
  },

  collections: {
    model: 'collection',
    fields: [
      'handle',
      'title',
      'subtitle',
      'description',
      'bannerUrl',
      'thumbUrl',
      'status',
      'position',
      'showInNav',
      'seoTitle',
      'seoDescription',
      'blocks',
    ],
    slugField: 'handle',
    slugFrom: 'title',
    defaultOrder: { position: 'asc' },
    include: { _count: { select: { products: true } } },
    ints: ['position'],
    bools: ['showInNav'],
    jsons: ['blocks'],
    revalidate: (r) => ['/', '/collections', `/collections/${r.handle}`],
    searchFields: ['title', 'handle'],
  },

  pages: {
    model: 'page',
    fields: [
      'slug',
      'title',
      'blocks',
      'status',
      'showInNav',
      'navLabel',
      'position',
      'seoTitle',
      'seoDescription',
      'ogImage',
    ],
    slugField: 'slug',
    slugFrom: 'title',
    defaultOrder: { position: 'asc' },
    ints: ['position'],
    bools: ['showInNav'],
    jsons: ['blocks'],
    protectedWhen: (r) => Boolean(r.isSystem),
    revalidate: (r) => (r.slug === 'home' ? ['/'] : [`/${r.slug}`]),
    searchFields: ['title', 'slug'],
  },

  packages: {
    model: 'teamPackage',
    fields: [
      'handle',
      'tag',
      'name',
      'price',
      'note',
      'items',
      'imageUrl',
      'highlight',
      'position',
      'status',
    ],
    slugField: 'handle',
    slugFrom: 'name',
    defaultOrder: { position: 'asc' },
    decimals: ['price'],
    ints: ['position'],
    bools: ['highlight'],
    jsons: ['items'],
    revalidate: () => ['/', '/team-packages'],
    searchFields: ['name', 'tag'],
  },

  reviews: {
    model: 'review',
    fields: ['text', 'name', 'role', 'initials', 'rating', 'published', 'position'],
    defaultOrder: { position: 'asc' },
    ints: ['rating', 'position'],
    bools: ['published'],
    revalidate: () => ['/'],
    searchFields: ['name', 'text'],
  },

  faqs: {
    model: 'faq',
    fields: ['question', 'answer', 'group', 'published', 'position'],
    defaultOrder: { position: 'asc' },
    ints: ['position'],
    bools: ['published'],
    revalidate: () => ['/'],
    searchFields: ['question'],
  },

  nav: {
    model: 'navItem',
    fields: ['menu', 'label', 'href', 'position', 'newTab'],
    defaultOrder: { position: 'asc' },
    ints: ['position'],
    bools: ['newTab'],
    revalidate: () => ['/'],
    searchFields: ['label', 'href'],
  },

  media: {
    model: 'media',
    fields: ['alt', 'folder'],
    defaultOrder: { createdAt: 'desc' },
    revalidate: () => [],
    searchFields: ['filename', 'alt'],
  },

  quotes: {
    model: 'quoteRequest',
    fields: ['status', 'adminNotes'],
    defaultOrder: { createdAt: 'desc' },
    include: { product: { select: { title: true, handle: true } } },
    revalidate: () => [],
    searchFields: ['team', 'name', 'email', 'reference'],
  },

  contacts: {
    model: 'contactMessage',
    fields: ['status'],
    defaultOrder: { createdAt: 'desc' },
    revalidate: () => [],
    searchFields: ['name', 'email', 'subject'],
  },

  stores: {
    model: 'teamStore',
    fields: [
      'slug',
      'name',
      'intro',
      'logoUrl',
      'heroUrl',
      'accent',
      'status',
      'opensAt',
      'closesAt',
      'passcode',
      'shipNote',
      'contactNote',
      'seoTitle',
      'seoDescription',
    ],
    slugField: 'slug',
    slugFrom: 'name',
    defaultOrder: { createdAt: 'desc' },
    // A store lives at the site root, so its own page and the home page (which
    // may link to it) both need refreshing.
    revalidate: (row) => ['/', `/${row.slug}`],
    searchFields: ['name', 'slug'],
  },

  storeCategories: {
    model: 'storeCategory',
    fields: ['storeId', 'name', 'position'],
    defaultOrder: { position: 'asc' },
    ints: ['position'],
    include: { store: { select: { slug: true } } },
    revalidate: (row) => (row.store?.slug ? [`/${row.store.slug}`] : []),
    searchFields: ['name'],
  },

  storeItems: {
    model: 'teamStoreItem',
    fields: [
      'storeId',
      'categoryId',
      'name',
      'category',
      'description',
      'price',
      'images',
      'sizes',
      'options',
      'allowName',
      'namePrice',
      'allowNumber',
      'numberPrice',
      'position',
      'status',
    ],
    defaultOrder: { position: 'asc' },
    decimals: ['price', 'namePrice', 'numberPrice'],
    ints: ['position'],
    bools: ['allowName', 'allowNumber'],
    jsons: ['images', 'sizes', 'options'],
    include: { store: { select: { slug: true, name: true } } },
    revalidate: (row) => (row.store?.slug ? [`/${row.store.slug}`] : []),
    searchFields: ['name', 'category'],
  },

  storeOrders: {
    model: 'storeOrder',
    // Orders are created by the checkout, never by hand: only fulfilment
    // fields can be edited here.
    fields: ['status', 'notes'],
    defaultOrder: { createdAt: 'desc' },
    include: {
      store: { select: { slug: true, name: true } },
      items: true,
    },
    revalidate: () => [],
    searchFields: ['reference', 'customerName', 'email'],
  },

  users: {
    model: 'user',
    fields: ['email', 'name', 'role', 'permissions'],
    jsons: ['permissions'],
    defaultOrder: { createdAt: 'asc' },
    revalidate: () => [],
    searchFields: ['name', 'email'],
  },
};

/** Coerces incoming JSON into Prisma-shaped data using the resource config. */
export function coerce(cfg: ResourceConfig, input: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of cfg.fields) {
    if (!(key in input)) continue;
    let v = input[key];

    if (cfg.decimals?.includes(key)) {
      if (v === '' || v === null || v === undefined) {
        data[key] = null;
        continue;
      }
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`${key} must be a number`);
      data[key] = n;
      continue;
    }

    if (cfg.ints?.includes(key)) {
      data[key] = v === '' || v === null || v === undefined ? 0 : Math.trunc(Number(v) || 0);
      continue;
    }

    if (cfg.bools?.includes(key)) {
      data[key] = v === true || v === 'true' || v === 1 || v === '1';
      continue;
    }

    if (cfg.jsons?.includes(key)) {
      if (typeof v === 'string') {
        try {
          v = JSON.parse(v);
        } catch {
          throw new Error(`${key} is not valid JSON`);
        }
      }
      data[key] = v ?? null;
      continue;
    }

    if (typeof v === 'string') {
      data[key] = v.trim() === '' && key !== 'description' ? null : v;
      continue;
    }

    data[key] = v;
  }

  // Required string columns must never be written as null.
  for (const k of ['title', 'name', 'description', 'question', 'answer', 'label', 'href', 'text', 'tag']) {
    if (data[k] === null) data[k] = '';
  }

  return data;
}

/** Ensures the slug/handle is present, slugified and unique. */
export async function ensureSlug(
  cfg: ResourceConfig,
  data: Record<string, unknown>,
  currentId?: string
) {
  if (!cfg.slugField) return;
  const field = cfg.slugField;
  const source = String(data[field] || data[cfg.slugFrom ?? 'title'] || '').trim();
  if (!source) return;

  let candidate = slugify(source);
  if (!candidate) candidate = 'item';

  const model = prisma[cfg.model] as unknown as {
    findFirst: (a: unknown) => Promise<{ id: string } | null>;
  };

  let suffix = 1;
  let unique = candidate;
  // Loop is bounded by the number of existing collisions.
  for (;;) {
    const clash = await model.findFirst({
      where: { [field]: unique, ...(currentId ? { NOT: { id: currentId } } : {}) },
      select: { id: true },
    });
    if (!clash) break;
    suffix += 1;
    unique = `${candidate}-${suffix}`;
  }
  data[field] = unique;
}
