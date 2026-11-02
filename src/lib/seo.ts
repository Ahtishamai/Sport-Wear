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
