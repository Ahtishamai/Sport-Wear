/**
 * The shop's one ad landing page: DTF Pinstripe Uniforms.
 *
 *   /custom-pinstripe-uniforms   (CMS page "lp-custom-pinstripe-uniforms")
 *
 * One collection — Custom Pinstripe Uniforms (/collections/pinstripe-uniform)
 * — and a page that sells it. There is no form. Every product in the
 * collection is shown, and each card goes to its product page, where it is
 * put in the cart. Top to bottom:
 *
 *   hero with the lowest price · trust strip · every product with its bulk
 *   prices · the bulk price ladder · why DTF pinstripes · product details ·
 *   how to order · Google reviews · FAQ · closing call to action
 *
 * No price is typed here. The hero's "Starting at", every card's ladder and
 * the bulk pricing section are read from the products' own volume tiers when
 * the page is drawn, with the same arithmetic the cart uses, so they are
 * always what checkout charges and they follow any change made in the admin.
 *
 * It is an ordinary page of page-builder sections, edited in Admin → Pages.
 * This layout is written once, marked as done in settings, and never written
 * again, so a deploy can run this every time (scripts/data-tasks.mjs) without
 * undoing an edit. The page as it was before is kept in the page builder's
 * history.
 *
 * Every claim is one the shop already makes on its pinstripe collection and
 * product pages: the stripe printed into the fabric; team name and numbers
 * applied as DTF transfers; any two colours at no extra cost; YS–3XL at one
 * price; matching pants, belts and socks; 3–4 weeks with a 2-week rush; free
 * shipping. The reviews are a copy of the home page's Google reviews section.
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
const MARKER = 'task:lp-pinstripe-full-landing';

const SEO = {
  seoTitle: 'DTF Pinstripe Uniforms | Bulk Pricing, Free Shipping',
  seoDescription:
    'DTF pinstripe baseball and softball uniforms in your team colors, with team name and numbers applied as DTF transfers. Bulk pricing, youth to adult 3XL, free shipping.',
};

const id = () => 'b_' + randomBytes(5).toString('hex');

function blocks({ detail, reviews, phoneHref }) {
  return [
    {
      type: 'offerHero',
      props: {
        badge: 'Baseball & softball',
        image: '',
        heading: 'DTF Pinstripe Uniforms',
        body: 'Classic pinstripe jerseys made in your team colors, with your team name and player numbers applied as DTF transfers. Order one or a full roster — the more you order, the less each one costs.',
        collectionHandle: COLLECTION,
        priceLabel: 'Starting at',
        priceNote: 'per jersey',
        ctaLabel: 'Shop the uniforms',
        bullets: [
          'Bulk pricing on every order',
          'Team name & numbers included',
          'Youth to adult 3XL',
          'Free shipping on every order',
        ],
      },
    },
    {
      type: 'statStrip',
      props: {
        background: 'white',
        items: [
          { value: 'Free', label: 'Shipping on every order', count: 0, suffix: '', highlight: false },
          { value: '3–4 weeks', label: 'Delivery', count: 0, suffix: '', highlight: false },
          { value: 'YS–3XL', label: 'Youth to adult sizes', count: 0, suffix: '', highlight: false },
          { value: '$0', label: 'Setup fees', count: 0, suffix: '', highlight: true },
        ],
      },
    },
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
        background: 'white',
      },
    },
    {
      type: 'bulkPricing',
      props: {
        eyebrow: 'Bulk pricing',
        heading: 'Buy more, save more',
        body: 'Order for the whole team and every jersey costs less. The lower price is applied in your cart automatically.',
        collectionHandle: COLLECTION,
        unit: 'per jersey',
        note: 'Team name and numbers included. Free shipping on every order.',
        ctaLabel: 'Shop the uniforms',
        ctaHref: '#shop',
        background: 'surface',
      },
    },
    {
      type: 'iconFeatures',
      props: {
        eyebrow: 'Why teams choose us',
        heading: 'Pinstripes built to last',
        body: '',
        size: 'standard',
        align: 'center',
        background: 'white',
        items: [
          { title: 'Stripes that never peel', icon: 'shield', body: 'The pinstripes are printed into the fabric, so they cannot lift, fray or pull crooked.' },
          { title: 'Sharp DTF names & numbers', icon: 'check', body: 'Team name and player numbers are applied as DTF transfers, clean and crisp in any color.' },
          { title: 'Any two colors', icon: 'palette', body: 'Pick the base and stripe colors that match your team, at no extra cost.' },
          { title: 'Every size, one price', icon: 'ruler', body: 'Youth small to adult 3XL, all at the same price, on one order.' },
        ],
      },
    },
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
        cta: [{ label: 'Shop the uniforms', href: '#shop' }],
      },
    },
    {
      type: 'steps',
      props: {
        eyebrow: 'How to order',
        heading: 'Your uniforms in 4 easy steps',
        background: 'white',
        steps: [
          { title: 'Pick your uniform', icon: 'check', body: 'Choose a pinstripe color from the uniforms above.' },
          { title: 'Add sizes, names & numbers', icon: 'palette', body: 'On the product page, order for one player or the whole team.' },
          { title: 'Check out securely', icon: 'shield', body: 'Pay online. Bulk pricing is applied in your cart automatically.' },
          { title: 'Delivered to your door', icon: 'truck', body: 'Your uniforms arrive in 3–4 weeks, with free shipping.' },
        ],
      },
    },
    ...(reviews ? [reviews] : []),
    {
      type: 'faqList',
      props: {
        eyebrow: 'FAQ',
        heading: 'Questions, answered',
        background: 'surface',
        items: [
          { q: 'What does DTF mean?', a: 'DTF stands for direct-to-film. Your team name and numbers are printed onto a special film, then heat-pressed onto the jersey. It gives sharp, clean lettering in any color.' },
          { q: 'How does bulk pricing work?', a: 'The more of a uniform you order, the less each one costs. The lower price is applied in your cart automatically — no code needed.' },
          { q: 'Will the pinstripes peel or fray?', a: 'No. The stripes are printed into the fabric, not sewn on, so they cannot lift, fray or pull crooked across a seam.' },
          { q: 'Can I get different colors?', a: 'Yes. Any two shades work for the base and the stripe, at no extra cost. Mention your colors in your order notes, or call us.' },
          { q: 'Can I mix youth and adult sizes?', a: 'Yes. Sizes run from youth small to adult 3XL, and every size costs the same.' },
          { q: 'Are these for baseball or softball?', a: 'Both. The jersey is the same; usually only the size run changes between the two.' },
          { q: 'Do you sell matching pants?', a: 'Yes. Matching pants, belts and socks are available — call us and we will price them with your jerseys.' },
          { q: 'How long does delivery take?', a: 'Most orders arrive 3 to 4 weeks after you order. A 2-week rush is available for an added fee. Shipping is free on every order.' },
        ],
      },
    },
    {
      type: 'ctaBand',
      props: {
        heading: 'Ready to outfit your team?',
        body: 'DTF pinstripe uniforms with bulk pricing and free shipping on every order.',
        image: detail,
        primary: [{ label: 'Shop the uniforms', href: '#shop' }],
        secondary: phoneHref ? [{ label: 'Call us', href: phoneHref }] : [],
      },
    },
  ].map((b) => ({ id: id(), ...b }));
}

// ------------------------------------------------------------------ run

console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');

if (await db.setting.findUnique({ where: { key: MARKER } })) {
  console.log(`  ${PATH} already has its full landing layout — left as it is`);
  await db.$disconnect();
  process.exit(0);
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

const home = await db.page.findUnique({ where: { slug: 'home' }, select: { blocks: true } });
const homeReviews = (Array.isArray(home?.blocks) ? home.blocks : []).find(
  (b) => b?.type === 'googleReviews' && !b.hidden
);
const reviews = homeReviews
  ? { type: 'googleReviews', props: structuredClone(homeReviews.props ?? {}) }
  : null;

const site = await db.setting.findUnique({ where: { key: 'site' }, select: { value: true } });
const phoneHref = typeof site?.value?.phoneHref === 'string' ? site.value.phoneHref : 'tel:+19592419213';

const list = blocks({ detail, reviews, phoneHref });
const existing = await db.page.findUnique({ where: { slug: SLUG }, select: { id: true, blocks: true } });
console.log(`  ${apply ? '' : 'would '}${existing ? 'rewrite' : 'create'} ${PATH} (CMS page ${SLUG})`);
console.log(`    sections: ${list.map((b) => b.type).join(', ')}`);
console.log(`    reviews:  ${reviews ? 'copied from the home page' : 'none on the home page, so none here'}`);

if (apply) {
  if (existing) {
    await db.pageRevision.create({
      data: { pageId: existing.id, blocks: existing.blocks, label: 'Before the full landing layout' },
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
