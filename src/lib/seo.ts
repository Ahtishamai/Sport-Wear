import 'server-only';

/**
 * The bits of SEO that are the same on every page, in one place.
 *
 * Titles and descriptions here are what a search result shows, so the rules
 * are practical ones: say the thing once, keep it short enough not to be cut
 * off, and never leave a page without a description — Google writes its own
 * from the page when one is missing, and it is rarely the sentence you would
 * have chosen.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

/**
 * A page title that reads well in a result: the page's own words, with the
 * site name after them, but only while the whole thing stays short enough to
 * be shown. Google cuts a title at around 60 characters, and a site name
 * repeated twice wastes the room that is left.
 */
export function pageTitle(raw: string, siteName: string): string {
  const own = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    // "Pinstripes uniform — Design Sportswear" typed into the field by hand.
    .replace(new RegExp(`\\s*[—|-]\\s*${escapeRegExp(siteName)}\\s*$`, 'i'), '')
    .trim();

  if (!own) return siteName;
  // Already carries the name, as "About Design Sportswear" does.
  if (own.toLowerCase().includes(siteName.toLowerCase())) return own;

  const withName = `${own} — ${siteName}`;
  return withName.length <= 60 ? withName : own;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Text with any markup taken out of it, on one line. */
export function plainText(raw: string | null | undefined): string {
  return String(raw ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "baseball", "baseball and softball", "baseball, softball and lacrosse".
 *
 * "Other" is the catch-all a product is given when nobody chose for it, and
 * "custom baseball, softball and other kit" reads like a form was left half
 * filled in — so it is dropped rather than printed.
 */
function sportPhrase(sports: string[]): string {
  const list = sports
    .map((s) => String(s ?? '').trim().toLowerCase())
    .filter((s) => s && s !== 'other');
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/**
 * True when a product's description is just its name again.
 *
 * Most of them are: "Backpacks Design #1 - Fully Customizable" is both the
 * title and the whole description, and one of them is another product's name
 * altogether. A description like that is long enough to pass a length test
 * and worthless as the sentence under a search result, so it is recognised
 * and set aside rather than shown.
 */
export function echoesTitle(description: string, title: string): boolean {
  const flat = (s: string) => plainText(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const d = flat(description);
  const t = flat(title);
  if (!d || !t) return false;
  return d.includes(t) || t.includes(d);
}

/**
 * What a product page tells a search engine about itself.
 *
 * Only ever built from what is true of that product: its own name, the sports
 * it is listed under, and the bottom of its own price ladder. The sentences
 * after it are the shop's standing promises — the same ones the home page
 * makes — and the price is left out entirely when the product does not show
 * one, because a figure in a search result for a page that says "request a
 * quote" is worse than no figure.
 *
 * The result is assembled from clauses and the last ones dropped until it
 * fits, so it ends on a full stop rather than an ellipsis.
 */
export function productDescription(p: {
  title: string;
  subtitle?: string | null;
  sports?: unknown;
  /** The cheapest the ladder goes, or null when no price is shown. */
  from?: number | null;
}): string {
  const name = plainText(p.title).replace(/\s*[-–—]\s*$/, '');
  const sports = Array.isArray(p.sports) ? sportPhrase(p.sports as string[]) : '';
  const subtitle = plainText(p.subtitle);

  const lead = sports
    ? `${name} — custom ${sports} kit.`
    : `${name} — custom team kit.`;

  const rest = [
    subtitle && subtitle.length <= 60 ? subtitle.replace(/\.?$/, '.') : '',
    'Names and numbers included, no setup fees.',
    p.from && p.from > 0 ? `From $${Math.round(p.from)} each.` : '',
    'Free mockup in 24 hours.',
  ].filter(Boolean);

  // Each promise goes in whole or not at all, so the sentence always ends on
  // a full stop rather than mid-word. A long product name costs a promise
  // rather than the name — the name is what makes one of these different
  // from the next.
  let out = lead;
  for (const clause of rest) {
    if (out.length + 1 + clause.length <= 158) out += ` ${clause}`;
  }
  return out;
}

/** A description, trimmed, or the fallback when the field was left empty. */
export function pageDescription(...candidates: (string | null | undefined)[]): string | undefined {
  for (const c of candidates) {
    const t = String(c ?? '').replace(/\s+/g, ' ').trim();
    if (t.length >= 40) return t.length > 165 ? t.slice(0, 162).trimEnd() + '…' : t;
  }
  return undefined;
}

/**
 * The trail of links above the page, as search engines read it. Google shows
 * it in place of the bare URL, so a collection reads
 * "Home › Collections › Baseball uniform" rather than a path.
 */
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path}`,
    })),
  };
}
