/**
 * The structured data the site hands to search engines, in one place.
 *
 * Three rules hold everything here together, and they are the ones Google
 * takes manual action over when they are broken:
 *
 *  1. Nothing is marked up that a visitor cannot see on the same page. A
 *     rating, a price or an answer in the markup and not in the page is the
 *     definition of spam, however true it happens to be.
 *  2. Nothing is invented. There is no shipping or returns policy here,
 *     because the shop has not written one — a delivery promise in a search
 *     result is a promise Google holds the shop to.
 *  3. The business is one thing. Every node that refers to it carries the
 *     same @id, so the shop's name, address, rating and reviews are read as
 *     one business rather than three unrelated ones.
 */

/*
 * Its own copy of the site address rather than the one in lib/seo.ts.
 *
 * seo.ts is server-only, and the reviews section that emits the shop's
 * rating is also rendered inside the admin's live preview, which runs in the
 * browser. The address is a NEXT_PUBLIC_ value, so reading it here is the
 * same read in both places.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

/** The shop itself, named once so every node can point at the same business. */
export const BUSINESS_ID = `${SITE_URL}/#business`;
/** The site as a publication, which is what a page is a part of. */
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** A URL a search engine can fetch: a site path made whole, or one left as is. */
export function absolute(url: string | null | undefined): string | undefined {
  const raw = String(url ?? '').trim();
  if (!raw) return undefined;
  if (/^https?:/i.test(raw)) return raw;
  return `${SITE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

/**
 * A date a search engine will accept, from whatever the row happened to hold.
 *
 * Both shapes turn up: a Date straight from the database on a page rendered
 * on the server, and the same field as a string once it has been through
 * JSON on its way to a client component. Taking only one of the two is how
 * a page that works in a test throws in the browser.
 */
export function isoDate(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export type Dated = { createdAt?: Date | string | null; updatedAt?: Date | string | null };

/**
 * The two dates a page can honestly claim about itself: when it first
 * existed, and when it last changed.
 *
 * Returned as one object so the JSON-LD, the Open Graph tags and the sitemap
 * all quote the same two values rather than each working them out again. A
 * page that gives three different answers about its own age is worse than
 * one that stays quiet, because a crawler that catches a page contradicting
 * itself stops believing the date it does print.
 *
 * These are the real row timestamps and nothing else. No date here is
 * invented, rounded, or nudged forward to look freshly written. If a batch
 * of pages was genuinely edited in one sitting then they genuinely share a
 * modified date, and saying so is the honest answer.
 */
export function freshness(row: Dated): { datePublished?: string; dateModified?: string } {
  const published = isoDate(row.createdAt);
  const modified = isoDate(row.updatedAt);
  return {
    datePublished: published,
    // Never edited since it was made: the two dates really are the same one.
    dateModified: modified ?? published,
  };
}

/**
 * The same two dates as the meta tags an audit looks for.
 *
 * Worth knowing what these are and are not: Google takes a page's dates from
 * the structured data and the page itself, not from here, and the `article:`
 * tags belong to Open Graph's article type rather than to a shop page. They
 * are printed because they are asked for and cost nothing, not because they
 * are what makes a date count.
 */
export function freshnessMeta(row: Dated): Record<string, string> {
  const { datePublished, dateModified } = freshness(row);
  return {
    ...(datePublished ? { 'article:published_time': datePublished } : {}),
    ...(dateModified ? { 'article:modified_time': dateModified } : {}),
  };
}

/**
 * A plain page of the site, for the ones that are neither a product nor a
 * shelf: the about page, the FAQs, the size chart.
 */
export function webPageLd(p: {
  path: string;
  name: string;
  description?: string | null;
} & Dated) {
  const url = `${SITE_URL}${p.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#page`,
    url,
    name: p.name.trim(),
    description: p.description?.trim() || undefined,
    isPartOf: { '@id': WEBSITE_ID },
    ...freshness(p),
  };
}

/**
 * The fifty states, their postal abbreviations, and DC.
 *
 * Here to tell an address apart, not to validate one: a region this
 * recognises is in the United States, so the country can be stated. An
 * address it does not recognise keeps its words and loses the country,
 * which is better than asserting the wrong one.
 */
const US_REGIONS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};
const US_ABBREVIATIONS = new Set(Object.values(US_REGIONS));

export type PostalAddress = {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
};

/**
 * One line of address, taken apart.
 *
 * The admin keeps the address as a single field somebody types, because that
 * is the field a shop owner can fill in without being taught anything. A
 * search engine wants it in pieces, so "1601 Main St, Springfield,
 * Massachusetts 01103" is read as street, town, state and postal code.
 *
 * Anything it cannot read confidently is left whole in streetAddress rather
 * than guessed at: a wrong town is worse for a local search than no town.
 */
export function postalAddress(raw: string | null | undefined): PostalAddress | undefined {
  const parts = String(raw ?? '')
    .split(',')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;

  const out: PostalAddress = { '@type': 'PostalAddress' };

  // "Massachusetts 01103", "MA 01103", "Massachusetts", or something else.
  const tail = parts[parts.length - 1];
  const zip = tail.match(/\b(\d{5}(?:-\d{4})?)\s*$/);
  const regionWords = (zip ? tail.slice(0, zip.index) : tail).trim();
  const region = US_REGIONS[regionWords.toLowerCase()]
    ? regionWords
    : US_ABBREVIATIONS.has(regionWords.toUpperCase())
      ? regionWords.toUpperCase()
      : '';

  if (!region && !zip) {
    // Nothing recognisable on the end: keep every word, claim nothing.
    out.streetAddress = parts.join(', ');
    return out;
  }

  if (region) out.addressRegion = region;
  if (zip) out.postalCode = zip[1];
  if (region || zip) out.addressCountry = 'US';

  const rest = parts.slice(0, -1);
  if (rest.length >= 2) {
    out.addressLocality = rest[rest.length - 1];
    out.streetAddress = rest.slice(0, -1).join(', ');
  } else if (rest.length === 1) {
    // "Springfield, MA 01103" — a town and a state, no street.
    out.addressLocality = rest[0];
  }
  return out;
}

/**
 * The shop, as a local business. One node, pointed at by everything else.
 *
 * No aggregateRating: this runs on every page, the cart and the checkout
 * among them, where no review is shown. The real rating is emitted by the
 * reviews section itself, against this same @id, so the two merge into one
 * business without either claiming something its page does not show.
 *
 * sameAs lists the shop's own profiles, and only those. A link that is just
 * facebook.com with nothing after it is the placeholder the site shipped
 * with, and naming that as the business's profile would be a plain untruth,
 * so anything without a path of its own is left out rather than published.
 */
export function businessLd(s: {
  siteName: string;
  defaultSeoDescription?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoDark?: string;
  social?: { href?: string | null }[];
}) {
  const logo = absolute(s.logoDark);
  const profiles = (s.social ?? [])
    .map((l) => String(l?.href ?? '').trim())
    .filter((href) => {
      if (!/^https?:\/\//i.test(href)) return false;
      try {
        // A profile has a path. A bare domain is the placeholder.
        return new URL(href).pathname.replace(/\/+$/, '').length > 1;
      } catch {
        return false;
      }
    });
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': BUSINESS_ID,
    name: s.siteName,
    description: s.defaultSeoDescription || undefined,
    telephone: s.phone || undefined,
    email: s.email || undefined,
    address: postalAddress(s.address),
    url: SITE_URL || undefined,
    logo,
    image: logo,
    sameAs: profiles.length ? [...new Set(profiles)] : undefined,
  };
}

/** The site as a publication, so a page can say what it is part of. */
export function websiteLd(siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: siteName,
    url: SITE_URL || undefined,
    publisher: { '@id': BUSINESS_ID },
    inLanguage: 'en-US',
    /*
     * No potentialAction/SearchAction. The sitelinks search box it asks for
     * needs a search page to send a query to, and this site has none — the
     * catalogue is browsed by collection and filter. Declaring one would
     * point Google at an address that 404s.
     */
  };
}

export type ReviewForLd = {
  text: string;
  name: string;
  rating: number;
  /** ISO date, when it is known. */
  date?: string | null;
};

/**
 * The rating and the reviews printed by the reviews section, against the
 * business they are about.
 *
 * The old markup here was a bare AggregateRating with nothing above it,
 * which is not an entity a search engine can show: a rating has to belong
 * to something. It belongs to the business, which is already declared with
 * this @id, so the two merge — and the individual reviews go with it,
 * because they are on the page too.
 */
export function reviewedBusinessLd(siteName: string, reviews: ReviewForLd[]) {
  const scores = reviews.map((r) => Number(r.rating) || 5);
  const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': BUSINESS_ID,
    name: siteName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: average,
      bestRating: 5,
      worstRating: 1,
      reviewCount: reviews.length,
    },
    review: reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(r.rating) || 5,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.text,
      datePublished: r.date || undefined,
    })),
  };
}

/** The price ladder of one product, or null when it does not show a price. */
export type PriceLadder = { low: number; high: number; count: number };

/** "Baseball", "Softball" — minus the catch-all nobody chose. */
function sportList(sports: unknown): string[] {
  if (!Array.isArray(sports)) return [];
  return sports
    .map((s) => String(s ?? '').trim())
    .filter((s) => s && s.toLowerCase() !== 'other');
}

function names(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((v) => (typeof v === 'string' ? v : String((v as { name?: unknown })?.name ?? '')))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * One product, as a search engine reads it.
 *
 * What is here is what the product page shows: its name, the sentence under
 * it, its photographs, the sports it is listed for, the sizes and colourways
 * it offers, and the price ladder — the real one, from a single shirt down to
 * a full team order, so a result reads "from $20" rather than the headline
 * figure for one.
 *
 * What is deliberately not here:
 *
 *  - shippingDetails and hasMerchantReturnPolicy. Google will note their
 *    absence, and both are a commitment it will hold the shop to. The shop
 *    has not written either policy down, so there is nothing truthful to
 *    put in them.
 *  - aggregateRating. The reviews on this site are about the shop, not about
 *    one jersey. A number on a product page that no review on that page
 *    supports is the thing manual actions are for.
 *  - sku, unless the product actually has one. None of them do yet.
 */
export function productLd(p: {
  handle: string;
  title: string;
  description?: string;
  images: string[];
  sku?: string | null;
  categoryLabel?: string | null;
  sports?: unknown;
  sizes?: unknown;
  colorways?: unknown;
  siteName: string;
  /** The ladder, or null for a product sold by quote. */
  price: PriceLadder | null;
} & Dated) {
  const url = `${SITE_URL}/products/${p.handle}`;
  const sports = sportList(p.sports);
  const sizes = names(p.sizes);
  const colorways = names(p.colorways);

  const properties = [
    ...sports.map((s) => ({ '@type': 'PropertyValue', name: 'Sport', value: s })),
    sizes.length
      ? { '@type': 'PropertyValue', name: 'Sizes', value: sizes.join(', ') }
      : null,
    colorways.length
      ? { '@type': 'PropertyValue', name: 'Colorways', value: colorways.join(', ') }
      : null,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.title.trim(),
    description: p.description || undefined,
    url,
    image: p.images.map((i) => absolute(i)).filter(Boolean),
    sku: p.sku || undefined,
    brand: { '@type': 'Brand', name: p.siteName },
    category: p.categoryLabel || undefined,
    itemCondition: 'https://schema.org/NewCondition',
    additionalProperty: properties.length ? properties : undefined,
    ...freshness(p),
    ...(p.price
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: p.price.low,
            highPrice: p.price.high,
            offerCount: p.price.count,
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            url,
            seller: { '@id': BUSINESS_ID },
          },
        }
      : {}),
  };
}

export type ListedProduct = {
  handle: string;
  title: string;
  image?: string | null;
  basePrice?: number;
  /** The product's own switch; a quote-only product is listed without a price. */
  showPrice?: boolean;
};

/**
 * A collection page, and the products on it in the order they are shown.
 *
 * Collections had only a breadcrumb before this: a search engine could see
 * where the page sat and nothing about what was on it. An ItemList is how a
 * category page says "these twelve products, in this order" — it is what
 * Google reads to offer the page as a list of products rather than as one
 * more page of text, and the order is the one a visitor sees, because it is
 * built from the same list the page has just rendered.
 *
 * Prices follow the same rule as everywhere else: the figure appears only
 * where the page itself shows one.
 */
export function collectionLd(c: {
  path: string;
  name: string;
  description?: string | null;
  products: ListedProduct[];
  /** The site-wide price switch. */
  pricesShown: boolean;
} & Dated) {
  const url = `${SITE_URL}${c.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: c.name.trim(),
    description: c.description?.trim() || undefined,
    isPartOf: { '@id': WEBSITE_ID },
    ...freshness(c),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: c.products.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: c.products.map((p, i) => {
        const productUrl = `${SITE_URL}/products/${p.handle}`;
        const priced = c.pricesShown && p.showPrice !== false && Number(p.basePrice) > 0;
        return {
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            '@id': `${productUrl}#product`,
            name: p.title.trim(),
            url: productUrl,
            image: absolute(p.image),
            ...(priced
              ? {
                  offers: {
                    '@type': 'Offer',
                    priceCurrency: 'USD',
                    price: Number(p.basePrice),
                    availability: 'https://schema.org/InStock',
                    url: productUrl,
                    seller: { '@id': BUSINESS_ID },
                  },
                }
              : {}),
          },
        };
      }),
    },
  };
}
