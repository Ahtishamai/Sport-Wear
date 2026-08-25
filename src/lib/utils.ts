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
