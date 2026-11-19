/**
 * Where a visitor came from, kept for the length of their visit and sent with
 * any lead they leave.
 *
 * An ad click lands with `?gclid=…&utm_campaign=…` on the first page only. By
 * the time the quote form is filled in, two pages later, the address no
 * longer says so — and a lead that cannot be tied to the ad that bought it
 * cannot be reported back to Google Ads, or weighed against what it cost.
 * So the first page of a visit notes it in sessionStorage (this tab, this
 * visit, no cookie) and the forms read it back.
 *
 * Used in the browser by the forms, and on the server by `cleanAttribution`,
 * which is the only thing that decides what is stored.
 */

export const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  // Google Ads (and its iOS / web-to-app variants), Microsoft Ads, Meta.
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'fbclid',
] as const;

export type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number] | 'landing', string>>;

const STORE = 'ds_attr';

/**
 * Notes the campaign the visit arrived from. A later page of the same visit
 * with tags of its own (a second ad click) replaces it; a page without tags
 * leaves it alone, so browsing on does not wipe the ad that brought them.
 */
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found: Attribution = {};
    for (const k of ATTRIBUTION_KEYS) {
      const v = params.get(k);
      if (v) found[k] = v.slice(0, 300);
    }
    if (Object.keys(found).length === 0) return;
    found.landing = window.location.pathname.slice(0, 300);
    sessionStorage.setItem(STORE, JSON.stringify(found));
  } catch {
    /* storage blocked: the lead still goes through, just without its source */
  }
}

/** What was noted for this visit, as a JSON string for a form field. */
export function attributionField(): string {
  try {
    return sessionStorage.getItem(STORE) ?? '';
  } catch {
    return '';
  }
}

/**
 * The server's copy: only the known keys, only short strings. Whatever the
 * browser sends is a claim, so nothing else from it is stored.
 */
export function cleanAttribution(raw: string): Attribution | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const out: Attribution = {};
  for (const k of [...ATTRIBUTION_KEYS, 'landing'] as const) {
    const v = (parsed as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 300);
  }
  return Object.keys(out).length ? out : null;
}
