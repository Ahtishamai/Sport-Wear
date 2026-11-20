/**
 * The shop's one ad landing page: DTF Pinstripe Uniforms.
 *
 *   /custom-pinstripe-uniforms   (CMS page "lp-custom-pinstripe-uniforms")
 *
 * One collection — Custom Pinstripe Uniforms (/collections/pinstripe-uniform)
 * — and a page that sells it. There is no form: every product in the
 * collection is shown, and each card goes to its product page, where it is
 * put in the cart.
 *
 * The sections follow the questions a buyer from an ad asks, in order:
 *
 *    1  What is it, what does it cost?    hero: offer, lowest price, Google rating
 *    2  Can I trust them?                 badges: secure checkout, free shipping…
 *    3  Show me.                          every product, with its bulk prices  #shop
 *    4  What if I buy for the team?       the bulk price ladder               #pricing
 *    5  Do other people like them?        Google reviews                      #reviews
 *    6  Why these and not others?         printed vs sewn comparison
 *    7  What exactly do I get?            product details, DTF explained
 *    8  How do I order?                   four steps                          #how-to-order
 *    9  Who are these people?             8+ years, 1,000+ customers
 *   10  But what about…?                  FAQ                                 #faq
 *   11  OK.                               closing call to action
 *
 * The anchors are what the landing header's menu links to. Backgrounds
 * alternate so each section reads as its own.
 *
 * No price or rating is typed here. The hero's "Starting at", every card's
 * ladder and the pricing section are read from the products' own volume
 * tiers when the page is drawn, with the arithmetic the cart uses; the rating
 * comes from the Google listing, or from the figures on the home page's
 * reviews section, and is left out when there is neither.
 *
 * It is an ordinary page of page-builder sections, edited in Admin → Pages.
 * This layout is written once, marked as done in settings, and never written
 * again, so a deploy can run this every time (scripts/data-tasks.mjs) without
 * undoing an edit. The page as it was before is kept in the page builder's
 * history.
 *
 * Every claim is one the site already makes: the collection page (printed vs
 * sewn, any two colors, even spacing on every size), the product pages (DTF
 * team name and number, the price ladder), and the About page (8+ years,
 * 1,000+ customers, Springfield, MA).
 *
 *   node -r dotenv/config scripts/make-landing-pages.mjs            (look)
 *   node -r dotenv/config scripts/make-landing-pages.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const SLUG = 'lp-custom-pinstripe-uniforms';
const PATH = '/custom-pinstripe-uniforms';
const COLLECTION = 'pinstripe-uniform';
/** Set once this layout has been written; see the header. */
const MARKER = 'task:lp-pinstripe-landing-v5';

const SEO = {
  seoTitle: 'DTF Pinstripe Uniforms | Bulk Pricing, Free Shipping',
  seoDescription:
    'DTF pinstripe baseball and softball uniforms in your team colors, with team name and numbers applied as DTF transfers. Bulk pricing, youth to adult 3XL, free shipping.',
};

const id = () => 'b_' + randomBytes(5).toString('hex');
const SHOP = { label: 'Shop the uniforms', href: '#shop' };

/** The badges as first written — what the trust bar upgrade looks for. */
const FIRST_TRUST_TITLES = ['Secure checkout', 'Free shipping', 'Made in-house', '1,000+ happy customers'];

const TRUST_ITEMS = [
  { title: 'Secure checkout', icon: 'shield', body: 'Pay online with PayPal or a card.' },
  { title: 'Free shipping', icon: 'truck', body: 'On every order.' },
  { title: '1,000+ happy customers', icon: 'star', body: 'Over 8 years outfitting teams.' },
];

function blocks({ detail, reviews, phoneHref, rating }) {
  return [
    // 1 — What is it, what does it cost?
    {
      type: 'offerHero',
      props: {
        badge: 'Baseball & softball',
        image: '',
        heading: 'DTF Pinstripe Uniforms',
        body: 'Classic pinstripe jerseys made in your team colors, with your team name and player numbers applied as DTF transfers. Order one or a full roster — the more you order, the less each one costs.',
        collectionHandle: COLLECTION,
        // No price in the hero: the products and the bulk pricing show it.
        showPrice: false,
        priceLabel: 'Starting at',
        priceNote: '',
        ctaLabel: 'Shop the uniforms',
        // Used only when the live Google listing is not set up.
        rating: rating?.value ?? '',
        reviewCount: rating?.count ?? '',
        bullets: [
          'Bulk pricing on every order',
          'Team name & numbers included',
          'Youth to adult 3XL',
          'Free shipping on every order',
        ],
      },
    },
    // 2 — Can I trust them? (Small, so the products stay one scroll away.)
    { type: 'trustBar', props: { background: 'white', items: TRUST_ITEMS } },
    // 3 — Show me. (This section is #shop: every "Shop" button lands here.)
    {
      type: 'productOffer',
      props: {
        eyebrow: 'Shop the collection',
        heading: 'Choose your DTF pinstripe uniform',
        body: 'Click any uniform to choose your sizes, team name and numbers. Every uniform has bulk pricing.',
        collectionHandle: COLLECTION,
        limit: 24,
        buttonLabel: 'Order now',
        footnote: 'Want different colors? Any two shades work, at no extra cost.',
        background: 'surface',
      },
    },
    // 4 — What if I buy for the whole team?
    {
      type: 'bulkPricing',
      props: {
        anchor: 'pricing',
        eyebrow: 'Bulk pricing',
        heading: 'Buy more, save more',
        body: 'Order for the whole team and every jersey costs less. The lower price is applied in your cart automatically.',
        collectionHandle: COLLECTION,
        unit: 'per jersey',
        note: 'Team name and numbers included. Free shipping on every order.',
        ctaLabel: 'Shop the uniforms',
        ctaHref: '#shop',
        background: 'white',
      },
    },
    // 5 — Do other people like them?
    ...(reviews ? [{ ...reviews, props: { ...reviews.props, anchor: 'reviews', background: 'surface' } }] : []),
    // 6 — Why these and not others?
    {
      type: 'compareTable',
      props: {
        eyebrow: 'Printed, not sewn',
        heading: 'Why our pinstripes last longer',
        body: 'Many pinstripe uniforms have the stripe sewn on. Ours is printed into the fabric itself.',
        oursLabel: 'Our pinstripes',
        theirsLabel: 'Sewn-on stripes',
        rows: [
          { feature: 'After a season of washing', ours: 'Part of the fabric — cannot peel or fray', theirs: 'Can lift at the shoulder and fray at the hem' },
          { feature: 'Across the seams', ours: 'Stays straight', theirs: 'Can pull crooked' },
          { feature: 'On youth and adult sizes', ours: 'Even spacing on every size', theirs: 'Stretched with the garment' },
          { feature: 'Stripe colors', ours: 'Any two shades, no extra cost', theirs: 'Limited to what the mill weaves' },
        ],
        ctaLabel: 'Shop the uniforms',
        ctaHref: '#shop',
        background: 'white',
      },
    },
    // 7 — What exactly do I get?
    {
      type: 'imageText',
      props: {
        image: detail,
        side: 'right',
        background: 'surface',
        eyebrow: 'Product details',
        heading: 'About our DTF pinstripe uniforms',
        body: 'Each uniform is a pinstripe jersey made in your team colors. The pinstripes are printed into the fabric, so they stay straight and evenly spaced on every size. Your team name and player numbers are applied with DTF (direct-to-film) transfers: the lettering is printed onto a film and heat-pressed onto the jersey, giving sharp, clean names and numbers in any color you choose.',
        bullets: [
          'Pinstripes printed into the fabric, in any two colors',
          'Team name & player numbers applied as DTF transfers',
          'Sizes from youth small (YS) to adult 3XL',
          'Made for baseball and softball',
          'Matching pants, belts and socks available',
          '3–4 week turnaround, 2-week rush available',
        ],
        cta: [SHOP],
      },
    },
    // 8 — How do I order?
    {
      type: 'steps',
      props: {
        anchor: 'how-to-order',
        eyebrow: 'How to order',
        heading: 'Your uniforms in 4 easy steps',
        background: 'white',
        steps: [
          { title: 'Pick your uniform', icon: 'check', body: 'Choose a pinstripe color from the uniforms above.' },
          { title: 'Add sizes, names & numbers', icon: 'palette', body: 'On the product page, order for one player or the whole team.' },
          { title: 'Check out securely', icon: 'shield', body: 'Pay online with PayPal or a card. Bulk pricing is applied automatically.' },
          { title: 'Delivered to your door', icon: 'truck', body: 'Your uniforms arrive in 3–4 weeks, with free shipping.' },
        ],
      },
    },
    // 9 — Who are these people?
    {
      type: 'numbersGrid',
      props: {
        eyebrow: 'Who we are',
        heading: 'Trusted by teams across North America',
        body: 'For over 8 years we have made uniforms for youth organizations, schools, travel teams, colleges and clubs — designed and printed in our own shop in Springfield, Massachusetts.',
        columns: 4,
        background: 'ink',
        items: [
          { value: '8+', label: 'Years making team uniforms', count: 8, suffix: '+' },
          { value: '1,000+', label: 'Happy customers', count: 1000, suffix: '+' },
          { value: '3–4 wks', label: 'Standard delivery', count: 0, suffix: '' },
          { value: '$0', label: 'Setup fees', count: 0, suffix: '' },
        ],
      },
    },
    // 10 — But what about…?
    {
      type: 'faqList',
      props: {
        anchor: 'faq',
        eyebrow: 'FAQ',
        heading: 'Questions, answered',
        background: 'white',
        items: [
          { q: 'What does DTF mean?', a: 'DTF stands for direct-to-film. Your team name and numbers are printed onto a special film, then heat-pressed onto the jersey. It gives sharp, clean lettering in any color.' },
          { q: 'How does bulk pricing work?', a: 'The more of a uniform you order, the less each one costs. The lower price is applied in your cart automatically — no code needed.' },
          { q: 'Can I order just one jersey?', a: 'Yes. You can order a single jersey for one player, or the whole roster at once.' },
          { q: 'How do I know which size to order?', a: 'Sizes run from youth small to adult 3XL, all at the same price, and you can mix sizes in one order. Check our size chart, or ask us for a free sizing kit.' },
          { q: 'How do I pay?', a: 'You check out securely online with PayPal or a card.' },
          { q: 'Will the pinstripes peel or fray?', a: 'No. The stripes are printed into the fabric, not sewn on, so they cannot lift, fray or pull crooked across a seam.' },
          { q: 'Can I get different colors?', a: 'Yes. Any two shades work for the base and the stripe, at no extra cost. Mention your colors in your order notes, or call us.' },
          { q: 'Are these for baseball or softball?', a: 'Both. The jersey is the same; usually only the size run changes between the two.' },
          { q: 'Do you sell matching pants?', a: 'Yes. Matching pants, belts and socks are available — call us and we will price them with your jerseys.' },
          { q: 'How long does delivery take?', a: 'Most orders arrive 3 to 4 weeks after you order. A 2-week rush is available for an added fee. Shipping is free on every order.' },
        ],
      },
    },
    // 11 — OK.
    {
      type: 'ctaBand',
      props: {
        heading: 'Ready to outfit your team?',
        body: 'DTF pinstripe uniforms with bulk pricing and free shipping on every order.',
        image: detail,
        primary: [SHOP],
        secondary: phoneHref ? [{ label: 'Call us', href: phoneHref }] : [],
      },
    },
  ].map((b) => ({ id: id(), ...b }));
}

// ------------------------------------------------------------------ run

console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');

if (await db.setting.findUnique({ where: { key: MARKER } })) {
  await upgradeTrustBadges();
  await dropPriceNote();
  await dropMadeInHouse();
  await db.$disconnect();
  process.exit(0);
}

/**
 * Once the page has this layout: the four trust badges were first written as
 * an "Icon feature row", whose cards stack four tall on a phone and push the
 * products a whole screen down. They become a Trust bar — two by two on a
 * phone. Only while the section is still exactly as first written, so an
 * edited one is left alone; once, by its own marker.
 */
/**
 * The hero read "Starting at $45 per jersey"; the shop wants the price alone.
 * Clears the note only while it still says what was first written, so a note
 * typed in the admin stays. Once, by its own marker.
 */
/**
 * The shop asked for the "Made in-house" badge to go. Removes that one item
 * from the trust badges, wherever it still is; once, by its own marker.
 */
async function dropMadeInHouse() {
  const key = 'task:lp-pinstripe-no-made-in-house';
  if (await db.setting.findUnique({ where: { key } })) return;
  const page = await db.page.findUnique({ where: { slug: SLUG }, select: { id: true, blocks: true } });
  const list = Array.isArray(page?.blocks) ? page.blocks : [];
  const isBadge = (x) => String(x?.title ?? '').trim().toLowerCase() === 'made in-house';
  let changes = 0;
  const next = list.map((b) => {
    if (!['trustBar', 'iconFeatures'].includes(b?.type) || !Array.isArray(b.props?.items)) return b;
    const items = b.props.items.filter((x) => !isBadge(x));
    if (items.length === b.props.items.length) return b;
    changes++;
    return { ...b, props: { ...b.props, items } };
  });
  console.log(
    changes
      ? `  ${apply ? '' : 'would '}remove the "Made in-house" badge from ${PATH}`
      : `  ${PATH}: no "Made in-house" badge to remove`
  );
  if (!apply) return;
  if (changes) {
    await db.pageRevision.create({ data: { pageId: page.id, blocks: list, label: 'Before removing "Made in-house"' } });
    await db.page.update({ where: { id: page.id }, data: { blocks: next } });
    console.log('DATA_CHANGED');
  }
  await db.setting.create({ data: { key, value: { doneAt: new Date().toISOString() } } });
}

async function dropPriceNote() {
  const key = 'task:lp-pinstripe-no-price-note';
  if (await db.setting.findUnique({ where: { key } })) return;
  const page = await db.page.findUnique({ where: { slug: SLUG }, select: { id: true, blocks: true } });
  const list = Array.isArray(page?.blocks) ? page.blocks : [];
  const at = list.findIndex((b) => b?.type === 'offerHero' && b.props?.priceNote === 'per jersey');
  console.log(
    at < 0
      ? `  ${PATH}: no "per jersey" to remove`
      : `  ${apply ? '' : 'would '}remove "per jersey" after the hero price`
  );
  if (!apply) return;
  if (at >= 0) {
    const next = list.map((b, i) => (i === at ? { ...b, props: { ...b.props, priceNote: '' } } : b));
    await db.pageRevision.create({ data: { pageId: page.id, blocks: list, label: 'Before removing "per jersey"' } });
    await db.page.update({ where: { id: page.id }, data: { blocks: next } });
    console.log('DATA_CHANGED');
  }
  await db.setting.create({ data: { key, value: { doneAt: new Date().toISOString() } } });
}

async function upgradeTrustBadges() {
  const key = 'task:lp-pinstripe-trust-bar';
  if (await db.setting.findUnique({ where: { key } })) {
    console.log(`  ${PATH} is up to date — left as it is`);
    return;
  }
  const page = await db.page.findUnique({ where: { slug: SLUG }, select: { id: true, blocks: true } });
  const list = Array.isArray(page?.blocks) ? page.blocks : [];
  const same = (b) =>
    b?.type === 'iconFeatures' &&
    b.props?.size === 'compact' &&
    JSON.stringify((b.props.items ?? []).map((x) => x.title)) ===
      JSON.stringify(FIRST_TRUST_TITLES);
  const at = list.findIndex(same);
  console.log(
    at < 0
      ? `  ${PATH}: trust badges already changed by hand — left as they are`
      : `  ${apply ? '' : 'would '}turn ${PATH}'s trust badges into a compact trust bar`
  );
  if (!apply) return;
  if (at >= 0) {
    const next = list.map((b, i) =>
      i === at ? { id: b.id, type: 'trustBar', props: { background: 'white', items: b.props.items } } : b
    );
    await db.pageRevision.create({
      data: { pageId: page.id, blocks: list, label: 'Before the compact trust bar' },
    });
    await db.page.update({ where: { id: page.id }, data: { blocks: next } });
    console.log('DATA_CHANGED');
  }
  await db.setting.create({ data: { key, value: { doneAt: new Date().toISOString() } } });
}

const photos = await db.productImage.findMany({
  where: {
    position: 0,
    product: { status: 'PUBLISHED', collections: { some: { collection: { handle: COLLECTION } } } },
  },
  orderBy: { product: { position: 'asc' } },
  select: { url: true },
  take: 2,
});
const detail = photos[1]?.url || photos[0]?.url || '/media/hero-field.png';

// The home page's Google reviews section, copied as it is; its typed rating
// is the hero's fallback when the live listing is not set up.
const home = await db.page.findUnique({ where: { slug: 'home' }, select: { blocks: true } });
const homeReviews = (Array.isArray(home?.blocks) ? home.blocks : []).find(
  (b) => b?.type === 'googleReviews' && !b.hidden
);
const reviews = homeReviews
  ? { type: 'googleReviews', props: structuredClone(homeReviews.props ?? {}) }
  : null;
const typedRating = Number(homeReviews?.props?.rating) || 0;
const rating = typedRating > 0
  ? { value: typedRating, count: String(homeReviews?.props?.reviewCount ?? '').trim() }
  : null;

const site = await db.setting.findUnique({ where: { key: 'site' }, select: { value: true } });
const phoneHref = typeof site?.value?.phoneHref === 'string' ? site.value.phoneHref : 'tel:+19592419213';

const list = blocks({ detail, reviews, phoneHref, rating });
const existing = await db.page.findUnique({ where: { slug: SLUG }, select: { id: true, blocks: true } });
console.log(`  ${apply ? '' : 'would '}${existing ? 'rewrite' : 'create'} ${PATH} (CMS page ${SLUG})`);
console.log(`    sections: ${list.map((b) => b.type).join(', ')}`);
console.log(`    reviews:  ${reviews ? 'copied from the home page' : 'none on the home page, so none here'}`);

if (apply) {
  if (existing) {
    await db.pageRevision.create({
      data: { pageId: existing.id, blocks: existing.blocks, label: 'Before the structured landing layout' },
    });
    await db.page.update({ where: { id: existing.id }, data: { blocks: list, status: 'PUBLISHED', ...SEO } });
  } else {
    const page = await db.page.create({
      data: {
        slug: SLUG,
        title: 'Landing page — DTF Pinstripe Uniforms (ads)',
        blocks: list,
        status: 'PUBLISHED',
        isSystem: false,
        showInNav: false,
        ...SEO,
      },
    });
    await db.pageRevision.create({ data: { pageId: page.id, blocks: list, label: 'Created' } });
  }
  await db.setting.create({ data: { key: MARKER, value: { doneAt: new Date().toISOString() } } });
  console.log('DATA_CHANGED');
}

await db.$disconnect();
