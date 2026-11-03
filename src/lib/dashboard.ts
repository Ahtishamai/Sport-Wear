/**
 * The arithmetic behind the dashboard, kept away from the queries.
 *
 * Everything here is a pure function over plain rows, so the sums, the
 * windows and the day buckets can be checked without a database — which
 * matters, because these are the numbers a shop owner will trust to decide
 * what to do next. A tile that quietly double-counts a refund is worse than
 * no tile.
 */

/** Anything with a date and an amount: an order, a payment, a lead. */
export type DatedAmount = {
  createdAt: Date;
  /** When money actually arrived. Null while an order is unpaid. */
  paidAt?: Date | null;
  amount: number;
  status: string;
};

/** Statuses that mean the money is in. */
export const PAID_STATUSES = ['PAID', 'FULFILLED'] as const;

export function isPaid(status: string): boolean {
  return (PAID_STATUSES as readonly string[]).includes(status);
}

/**
 * A day, as the server reads the clock.
 *
 * Local parts rather than the ISO string, so a day on the chart is the day
 * the shop had — an order taken at eight in the evening belongs to that
 * evening, not to tomorrow because UTC has already turned over.
 */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The last n days, oldest first, ending today. */
export function lastDays(n: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

/** The start of the day n days before now — the edge of a window. */
export function windowStart(days: number, now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export type Bar = { day: string; label: string; leads: number; orders: number; taken: number };

/**
 * One bar per day: how many leads came in, how many orders were paid for,
 * and how much they came to.
 *
 * Orders are counted on the day they were paid, not the day the cart was
 * started — an order that sat unpaid for a week and then went through is
 * money that arrived this week.
 */
export function bars(
  days: number,
  now: Date,
  leads: { createdAt: Date }[],
  orders: DatedAmount[]
): Bar[] {
  const keys = lastDays(days, now);
  const index = new Map(keys.map((k, i) => [k, i]));
  const out: Bar[] = keys.map((day) => ({
    day,
    label: day.slice(5).replace('-', '/'),
    leads: 0,
    orders: 0,
    taken: 0,
  }));

  for (const l of leads) {
    const i = index.get(dayKey(l.createdAt));
    if (i !== undefined) out[i].leads++;
  }
  for (const o of orders) {
    if (!isPaid(o.status)) continue;
    const when = o.paidAt ?? o.createdAt;
    const i = index.get(dayKey(when));
    if (i === undefined) continue;
    out[i].orders++;
    out[i].taken += o.amount;
  }
  return out;
}

export type Takings = { count: number; total: number };

/** Paid orders inside a window, and what they came to. */
export function takings(rows: DatedAmount[], from: Date, to?: Date): Takings {
  let count = 0;
  let total = 0;
  for (const r of rows) {
    if (!isPaid(r.status)) continue;
    const when = r.paidAt ?? r.createdAt;
    if (when < from) continue;
    if (to && when >= to) continue;
    count++;
    total += r.amount;
  }
  return { count, total };
}

/** Rows created inside a window. */
export function createdBetween<T extends { createdAt: Date }>(rows: T[], from: Date, to?: Date): T[] {
  return rows.filter((r) => r.createdAt >= from && (!to || r.createdAt < to));
}

/**
 * This period against the one before it.
 *
 * Null when there is nothing to compare against: "up 100%" from a standing
 * start says nothing, and a percentage of zero is not a fact.
 */
export function trend(now: number, before: number): { pct: number | null; up: boolean } {
  if (!before) return { pct: null, up: now > 0 };
  const pct = Math.round(((now - before) / before) * 100);
  return { pct, up: pct >= 0 };
}

/** One line on a list of things to do, or things left blank. */
export type Todo = {
  label: string;
  count: number;
  href: string;
  /** Why it matters, in a few words. */
  hint: string;
  /** Worth colouring: a lead going cold, money unclaimed. */
  urgent?: boolean;
};

/** Only the lines with something in them, loudest first. */
export function pending(items: Todo[]): Todo[] {
  return items
    .filter((i) => i.count > 0)
    .sort((a, b) => Number(b.urgent ?? false) - Number(a.urgent ?? false) || b.count - a.count);
}

export type ProductGapRow = {
  sku: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  images: number;
  /** The spec list, as stored: [{q, a}]. */
  specs: unknown;
};

export type CollectionGapRow = {
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  products: number;
};

const blank = (s: string | null | undefined) => !String(s ?? '').trim();

/** True when the five spec headings are there and every answer is empty. */
export function specsUnanswered(specs: unknown): boolean {
  if (!Array.isArray(specs) || specs.length === 0) return false;
  return specs.every((s) => blank((s as { a?: string })?.a));
}

/**
 * What the shop has left for the site to generate.
 *
 * None of these break anything — every page writes its own title, sentence
 * and markup when the field is empty, which is the whole point of the SEO
 * work. They are listed because a sentence the shop writes beats a sentence
 * a program writes, and because a product with no SKU is a product search
 * engines cannot be given an identifier for.
 */
export function searchGaps(
  products: ProductGapRow[],
  collections: CollectionGapRow[],
  placeholderSocials: number
): Todo[] {
  const live = products.filter((p) => p.status === 'PUBLISHED');
  const shelves = collections.filter((c) => c.status === 'PUBLISHED');

  return pending([
    {
      label: 'Products with no SKU',
      count: live.filter((p) => blank(p.sku)).length,
      href: '/admin/products',
      hint: 'The identifier Google asks for in product markup',
    },
    {
      label: 'Products with no photo',
      count: live.filter((p) => p.images === 0).length,
      href: '/admin/products',
      hint: 'No image means no product rich result at all',
      urgent: true,
    },
    {
      label: 'Spec answers left empty',
      count: live.filter((p) => specsUnanswered(p.specs)).length,
      href: '/admin/products',
      hint: 'Five headings on the page with nothing under them',
    },
    {
      label: 'Products with no search title',
      count: live.filter((p) => blank(p.seoTitle)).length,
      href: '/admin/products',
      hint: 'The product name is used instead',
    },
    {
      label: 'Products with no search description',
      count: live.filter((p) => blank(p.seoDescription)).length,
      href: '/admin/products',
      hint: 'One is written from the product — yours would read better',
    },
    {
      label: 'Collections with no search description',
      count: shelves.filter((c) => blank(c.seoDescription)).length,
      href: '/admin/collections',
      hint: 'A generated line is used instead',
    },
    {
      label: 'Social links still placeholders',
      count: placeholderSocials,
      href: '/admin/settings',
      hint: 'Until they are real the site claims no profiles',
    },
  ]);
}

/**
 * A social link nobody has filled in.
 *
 * The site shipped pointing at facebook.com and instagram.com — the networks
 * themselves, not the shop's pages. Those are the links that must not be
 * handed to a search engine as the business's own profiles.
 */
export function isPlaceholderSocial(href: string): boolean {
  const h = String(href ?? '').trim().toLowerCase();
  if (!h) return true;
  return /^https?:\/\/(www\.)?(facebook|instagram|tiktok|twitter|x|youtube|linkedin|pinterest)\.com\/?$/.test(h);
}
