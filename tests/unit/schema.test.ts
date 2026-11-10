import { describe, expect, it } from 'vitest';
import {
  BUSINESS_ID,
  WEBSITE_ID,
  absolute,
  businessLd,
  collectionLd,
  freshness,
  freshnessMeta,
  isoDate,
  postalAddress,
  productLd,
  reviewedBusinessLd,
  webPageLd,
  websiteLd,
} from '@/lib/schema';

const SITE = 'Design Sportswear';

/**
 * What actually reaches the page. A key set to undefined is dropped by
 * JSON.stringify, so "absent" is asserted against the written JSON rather
 * than against the object in memory.
 */
const emitted = (ld: unknown) => JSON.parse(JSON.stringify(ld));
const BASE = 'https://design-sportswear.com';

describe('a URL a search engine can fetch', () => {
  it('makes a site path whole', () => {
    expect(absolute('/uploads/a.jpg')).toBe(`${BASE}/uploads/a.jpg`);
  });

  it('leaves one that is already whole alone', () => {
    expect(absolute('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  it('gives nothing for nothing, rather than a bare domain', () => {
    expect(absolute('')).toBeUndefined();
    expect(absolute(null)).toBeUndefined();
  });
});

describe('one line of address, taken apart', () => {
  it('reads street, town, state and postal code', () => {
    expect(postalAddress('1601 Main St, Springfield, Massachusetts 01103')).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '1601 Main St',
      addressLocality: 'Springfield',
      addressRegion: 'Massachusetts',
      postalCode: '01103',
      addressCountry: 'US',
    });
  });

  it('reads a two-letter state the same way', () => {
    expect(postalAddress('88 Elm Ave, Hartford, CT 06103')).toMatchObject({
      addressLocality: 'Hartford',
      addressRegion: 'CT',
      postalCode: '06103',
      addressCountry: 'US',
    });
  });

  it('keeps a suite line with the street', () => {
    expect(postalAddress('1601 Main St, Suite 4, Springfield, MA 01103')).toMatchObject({
      streetAddress: '1601 Main St, Suite 4',
      addressLocality: 'Springfield',
    });
  });

  it('handles a town and state with no street', () => {
    expect(postalAddress('Springfield, MA 01103')).toEqual({
      '@type': 'PostalAddress',
      addressLocality: 'Springfield',
      addressRegion: 'MA',
      postalCode: '01103',
      addressCountry: 'US',
    });
  });

  it('claims no country when it cannot read the address', () => {
    // A wrong town or country is worse for a local search than none: the
    // words are kept, nothing is asserted.
    const out = postalAddress('Unit 7, Some Industrial Estate, Overseas');
    expect(out).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Unit 7, Some Industrial Estate, Overseas',
    });
  });

  it('says nothing at all about an empty field', () => {
    expect(postalAddress('')).toBeUndefined();
    expect(postalAddress(null)).toBeUndefined();
  });
});

describe('the business, declared once', () => {
  const s = {
    siteName: SITE,
    defaultSeoDescription: 'Custom baseball and softball uniforms.',
    phone: '+1 (959) 241-9213',
    email: 'info@design-sportswear.com',
    address: '1601 Main St, Springfield, Massachusetts 01103',
    logoDark: '/uploads/brand/logo.png',
  };

  it('carries an id everything else can point at', () => {
    expect(businessLd(s)['@id']).toBe(BUSINESS_ID);
    expect(BUSINESS_ID).toBe(`${BASE}/#business`);
  });

  it('gives the address in pieces', () => {
    expect(businessLd(s).address).toMatchObject({ addressLocality: 'Springfield' });
  });

  it('makes the logo a whole URL', () => {
    expect(businessLd(s).logo).toBe(`${BASE}/uploads/brand/logo.png`);
  });

  it('carries no rating, because it runs on pages with no reviews', () => {
    expect(emitted(businessLd(s))).not.toHaveProperty('aggregateRating');
  });

  it('claims no social profiles, because the links are still placeholders', () => {
    expect(emitted(businessLd(s))).not.toHaveProperty('sameAs');
  });
});

describe('the site as a publication', () => {
  it('names the business as its publisher, by id', () => {
    const ld = websiteLd(SITE);
    expect(ld['@id']).toBe(WEBSITE_ID);
    expect(ld.publisher).toEqual({ '@id': BUSINESS_ID });
  });

  it('declares no search box, because there is no search page', () => {
    expect(emitted(websiteLd(SITE))).not.toHaveProperty('potentialAction');
  });
});

describe('the rating the reviews section prints', () => {
  const reviews = [
    { text: 'Kits arrived early.', name: 'Dana R.', rating: 5, date: '2026-04-02' },
    { text: 'Second season with them.', name: 'Marcus T.', rating: 4, date: '2026-03-11' },
  ];

  it('belongs to the business, by the same id the layout declares', () => {
    const ld = reviewedBusinessLd(SITE, reviews);
    // A bare AggregateRating belongs to nothing and can show nothing.
    expect(ld['@type']).toBe('Organization');
    expect(ld['@id']).toBe(BUSINESS_ID);
    expect(ld.aggregateRating['@type']).toBe('AggregateRating');
  });

  it('is the average of the reviews on the page, and counts them', () => {
    const ld = reviewedBusinessLd(SITE, reviews);
    expect(ld.aggregateRating.ratingValue).toBe(4.5);
    expect(ld.aggregateRating.reviewCount).toBe(2);
  });

  it('carries the reviews themselves, because the page prints them', () => {
    const ld = reviewedBusinessLd(SITE, reviews);
    expect(ld.review).toHaveLength(2);
    expect(ld.review[0]).toMatchObject({
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Dana R.' },
      reviewBody: 'Kits arrived early.',
      datePublished: '2026-04-02',
    });
  });

  it('rounds to one decimal place rather than printing a recurring figure', () => {
    const three = [
      { text: 'a', name: 'A', rating: 5 },
      { text: 'b', name: 'B', rating: 4 },
      { text: 'c', name: 'C', rating: 4 },
    ];
    expect(reviewedBusinessLd(SITE, three).aggregateRating.ratingValue).toBe(4.3);
  });
});

describe('a product, as a search engine reads it', () => {
  const jersey = {
    handle: 'crew-neck-jerseys-design-10',
    title: 'Crew Neck Jerseys Design #10',
    description: 'Crew Neck Jerseys Design #10 — custom baseball and softball kit.',
    images: ['/uploads/a.jpg', '/uploads/b.jpg'],
    sku: null,
    categoryLabel: 'Fully customizable',
    sports: ['Baseball', 'Softball', 'Other'],
    sizes: ['YS', 'YM', 'S', 'M'],
    colorways: [{ name: 'Navy / Gold', from: '#16264B', to: '#FFD100' }],
    siteName: SITE,
    price: { low: 20, high: 50, count: 4 },
  };

  it('is addressable, so the collection list and this page mean one product', () => {
    const ld = productLd(jersey);
    expect(ld['@id']).toBe(`${BASE}/products/${jersey.handle}#product`);
    expect(ld.url).toBe(`${BASE}/products/${jersey.handle}`);
  });

  it('gives whole image URLs', () => {
    expect(productLd(jersey).image).toEqual([`${BASE}/uploads/a.jpg`, `${BASE}/uploads/b.jpg`]);
  });

  it('quotes the whole price ladder, not the headline figure', () => {
    const offers = productLd(jersey).offers as Record<string, unknown>;
    expect(offers).toMatchObject({
      '@type': 'AggregateOffer',
      lowPrice: 20,
      highPrice: 50,
      offerCount: 4,
      priceCurrency: 'USD',
    });
  });

  it('names the shop as the seller, by the same id', () => {
    const offers = productLd(jersey).offers as { seller: unknown };
    expect(offers.seller).toEqual({ '@id': BUSINESS_ID });
  });

  it('carries no price at all for a product sold by quote', () => {
    const ld = emitted(productLd({ ...jersey, price: null }));
    expect(ld).not.toHaveProperty('offers');
    expect(JSON.stringify(ld)).not.toMatch(/price/i);
  });

  it('lists the sports, sizes and colourways the page shows', () => {
    const props = productLd(jersey).additionalProperty as { name: string; value: string }[];
    expect(props.filter((p) => p.name === 'Sport').map((p) => p.value)).toEqual([
      'Baseball',
      'Softball',
    ]);
    expect(props.find((p) => p.name === 'Sizes')?.value).toBe('YS, YM, S, M');
    expect(props.find((p) => p.name === 'Colorways')?.value).toBe('Navy / Gold');
  });

  it('does not print "other", which is the sport nobody chose', () => {
    const props = productLd(jersey).additionalProperty as { value: string }[];
    expect(props.map((p) => p.value)).not.toContain('Other');
  });

  it('leaves the property list out entirely when there is nothing to say', () => {
    const bag = emitted(productLd({ ...jersey, sports: [], sizes: [], colorways: [] }));
    expect(bag).not.toHaveProperty('additionalProperty');
  });

  it('gives a SKU only when the product has one', () => {
    expect(emitted(productLd(jersey))).not.toHaveProperty('sku');
    expect(productLd({ ...jersey, sku: 'DS-CN-10' }).sku).toBe('DS-CN-10');
  });

  it('claims no rating, no delivery promise and no returns policy', () => {
    // The shop has written none of the three. A promise in a search result
    // is one Google holds the shop to.
    const flat = JSON.stringify(productLd(jersey));
    expect(flat).not.toMatch(/aggregateRating|shippingDetails|ReturnPolicy/);
  });
});

describe('a collection, and what is on the shelf', () => {
  const shelf = {
    path: '/collections/crew-neck-jerseys',
    name: 'Crew neck jerseys',
    description: 'Sublimated crew necks, names and numbers included.',
    pricesShown: true,
    products: [
      { handle: 'design-10', title: 'Design #10', image: '/uploads/a.jpg', basePrice: 24, showPrice: true },
      { handle: 'design-11', title: 'Design #11', image: null, basePrice: 26, showPrice: true },
    ],
  };

  it('is a collection page holding a list, not a page of text', () => {
    const ld = collectionLd(shelf);
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.mainEntity['@type']).toBe('ItemList');
    expect(ld.mainEntity.numberOfItems).toBe(2);
  });

  it('keeps the order the page shows', () => {
    const items = collectionLd(shelf).mainEntity.itemListElement;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items.map((i) => i.item.name)).toEqual(['Design #10', 'Design #11']);
  });

  it('points at the same product id the product page uses', () => {
    const first = collectionLd(shelf).mainEntity.itemListElement[0];
    expect(first.item['@id']).toBe(`${BASE}/products/design-10#product`);
  });

  it('prices a product only where the page prices it', () => {
    const items = collectionLd({
      ...shelf,
      products: [
        { handle: 'quoted', title: 'By quote', image: null, basePrice: 40, showPrice: false },
      ],
    }).mainEntity.itemListElement;
    expect(emitted(items[0].item)).not.toHaveProperty('offers');
  });

  it('shows no price anywhere when the whole shop hides them', () => {
    const ld = collectionLd({ ...shelf, pricesShown: false });
    expect(JSON.stringify(ld)).not.toMatch(/"price"/);
  });

  it('is still valid for an empty shelf', () => {
    const ld = collectionLd({ ...shelf, products: [] });
    expect(ld.mainEntity.numberOfItems).toBe(0);
    expect(ld.mainEntity.itemListElement).toEqual([]);
  });

  it('says what site it belongs to', () => {
    expect(collectionLd(shelf).isPartOf).toEqual({ '@id': WEBSITE_ID });
  });
});

describe('the dates a page gives about itself', () => {
  const made = new Date('2026-08-25T09:12:00.289Z');
  const changed = new Date('2026-11-09T05:23:33.322Z');

  it('takes a Date straight from the database', () => {
    expect(isoDate(made)).toBe('2026-08-25T09:12:00.289Z');
  });

  it('takes the same field after it has been through JSON', () => {
    // A field typed as a Date arrives at a client component as a string.
    expect(isoDate('2026-08-25T09:12:00.289Z')).toBe('2026-08-25T09:12:00.289Z');
  });

  it('says nothing rather than guessing when there is no date', () => {
    expect(isoDate(null)).toBeUndefined();
    expect(isoDate(undefined)).toBeUndefined();
    expect(isoDate('')).toBeUndefined();
    expect(isoDate('not a date')).toBeUndefined();
  });

  it('reports when a page was made and when it last changed', () => {
    expect(freshness({ createdAt: made, updatedAt: changed })).toEqual({
      datePublished: '2026-08-25T09:12:00.289Z',
      dateModified: '2026-11-09T05:23:33.322Z',
    });
  });

  it('gives the making date as the change date when it was never edited', () => {
    const f = freshness({ createdAt: made, updatedAt: made });
    expect(f.datePublished).toBe(f.dateModified);
  });

  it('never invents a date it was not given', () => {
    expect(freshness({})).toEqual({ datePublished: undefined, dateModified: undefined });
    expect(freshnessMeta({})).toEqual({});
  });

  it('prints the same two values as meta tags', () => {
    const row = { createdAt: made, updatedAt: changed };
    const f = freshness(row);
    expect(freshnessMeta(row)).toEqual({
      'article:published_time': f.datePublished,
      'article:modified_time': f.dateModified,
    });
  });

  it('gives a shelf, a product and a page the same two dates', () => {
    const row = { createdAt: made, updatedAt: changed };
    const f = freshness(row);

    const shelf = emitted(
      collectionLd({ path: '/collections/bags', name: 'Bags', products: [], pricesShown: true, ...row })
    );
    const product = emitted(
      productLd({ handle: 'a-bag', title: 'A bag', images: [], siteName: 'S', price: null, ...row })
    );
    const page = emitted(webPageLd({ path: '/about', name: 'About', ...row }));

    for (const node of [shelf, product, page]) {
      expect(node.datePublished).toBe(f.datePublished);
      expect(node.dateModified).toBe(f.dateModified);
    }
    // And the meta tags a crawler reads beside them agree.
    expect(freshnessMeta(row)['article:modified_time']).toBe(shelf.dateModified);
  });

  it('leaves the dates out entirely when the row carries none', () => {
    const node = emitted(webPageLd({ path: '/about', name: 'About' }));
    expect(node).not.toHaveProperty('datePublished');
    expect(node).not.toHaveProperty('dateModified');
  });
});
