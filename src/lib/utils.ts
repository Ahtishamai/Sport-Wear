export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function money(n: number | string | null | undefined, opts: { cents?: boolean } = {}) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '$0';
  const showCents = opts.cents ?? v % 1 !== 0;
  return '$' + v.toFixed(showCents ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function reference(prefix = 'DS') {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export type VolumeTier = {
  label: string;
  minQty: number;
  maxQty: number | null;
  discount: number;
  savingsLabel: string;
};

export const DEFAULT_TIERS: VolumeTier[] = [
  { label: '1–11', minQty: 1, maxQty: 11, discount: 0, savingsLabel: '' },
  { label: '12–23', minQty: 12, maxQty: 23, discount: 1.5, savingsLabel: 'Save 5%' },
  { label: '24–47', minQty: 24, maxQty: 47, discount: 3, savingsLabel: 'Save 10%' },
  { label: '48+', minQty: 48, maxQty: null, discount: 5, savingsLabel: 'Save 16%' },
];

export function activeTier(tiers: VolumeTier[], units: number) {
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    if (units >= t.minQty && (t.maxQty === null || units <= t.maxQty)) return i;
  }
  return 0;
}

export function unitPriceFor(base: number, tiers: VolumeTier[], units: number) {
  const idx = activeTier(tiers, units);
  return Math.max(0, base - (tiers[idx]?.discount ?? 0));
}

export const SIZE_RUN = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export function sumQty(qty: Record<string, number>) {
  return Object.values(qty).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/* ------------------------------------------------------------- store clock */

/**
 * The one wall clock a team store runs on.
 *
 * A store closes at a single moment for everyone, but the deadline is quoted
 * to teams in US Eastern time — so the admin types 12:00 meaning noon ET, and
 * every shopper reads 12:00 PM ET no matter which timezone their browser is
 * in. Without pinning this, the same store would show a different closing
 * time in Illinois than it does in California.
 */
export const STORE_TZ = 'America/New_York';

/** Milliseconds `tz` is ahead of UTC at the given instant (DST-aware). */
function tzOffset(at: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value;
  const wall = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second)
  );
  return wall - at.getTime();
}

/**
 * Turns the `YYYY-MM-DDTHH:mm` a datetime-local input produces into the
 * instant that wall-clock time falls on in STORE_TZ.
 *
 * Passing the bare string to Prisma instead would store it as UTC, so a store
 * set to close at noon would shut at 8am Eastern.
 */
export function storeTimeToDate(wall: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(wall).trim());
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes: the first offset is sampled at the wrong instant within an
  // hour of a DST change, and the second lands on the right side of it.
  let utc = naive - tzOffset(new Date(naive), STORE_TZ);
  utc = naive - tzOffset(new Date(utc), STORE_TZ);
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The inverse: a stored instant as the STORE_TZ wall clock, for the admin input. */
export function dateToStoreInput(d: Date | null): string {
  if (!d) return '';
  return new Date(d.getTime() + tzOffset(d, STORE_TZ)).toISOString().slice(0, 16);
}

/** "Sunday, September 20 at 12:00 PM EDT" — the same string for every shopper. */
export function formatStoreDeadline(d: Date | string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
