/**
 * The shop's one ad landing page: DTF Pinstripe Uniforms.
 *
 *   /custom-pinstripe-uniforms   (CMS page "lp-custom-pinstripe-uniforms")
 *
 * One collection only — Custom Pinstripe Uniforms (/collections/pinstripe-uniform)
 * — and a page that sells it, not one that collects leads. There is no form:
 *
 *   1. Hero: "DTF Pinstripe Uniforms", the lowest price the collection's bulk
 *      pricing reaches ("Starting at $45"), and a button down to the products.
 *   2. The products, each with its whole bulk price list and an Order now
 *      button to its product page, where it goes in the cart.
 *   3. The full description: what the uniform is, and how the team name and
 *      numbers are applied (DTF transfers).
 *
 * Prices are never typed here. Both the hero and the cards read them from the
 * products' own volume tiers when the page is drawn, so they are always what
 * the cart will charge, and they move when the prices are changed in the admin.
 *
 * It is an ordinary page of page-builder sections, edited in Admin → Pages.
 * The layout above is written once, marked as done in settings, and never
 * written again — so a deploy can run this every time (scripts/data-tasks.mjs)
 * without undoing an edit. The page as it was before is kept in the page
 * builder's history.
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
/** Set once the shop-style layout has been written; see the header. */
const MARKER = 'task:lp-pinstripe-shop-layout';

const SEO = {
  seoTitle: 'DTF Pinstripe Uniforms | Bulk Pricing',
  seoDescription:
    'DTF pinstripe baseball and softball uniforms in your team colors, with team name and numbers applied as DTF transfers. Bulk pricing, youth to adult 3XL.',
};

const id = () => 'b_' + randomBytes(5).toString('hex');

function blocks(detailImage) {
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
      type: 'productOffer',
      props: {
        eyebrow: 'Shop',
        heading: 'Choose your pinstripe uniform',
        body: 'Every uniform has bulk pricing. Pick a color, then choose sizes, names and numbers on the next page.',
        collectionHandle: COLLECTION,
        limit: 12,
        buttonLabel: 'Order now',
        footnote: 'Want different colors? Any two shades work, at no extra cost.',
        background: 'white',
      },
    },
    {
      type: 'imageText',
      props: {
        image: detailImage,
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
  ].map((b) => ({ id: id(), ...b }));
}

// ------------------------------------------------------------------ run

console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');

if (await db.setting.findUnique({ where: { key: MARKER } })) {
  console.log(`  ${PATH} already has its shop layout — left as it is`);
  await db.$disconnect();
  process.exit(0);
}

// The collection's second photograph for the details section (the first is
// the hero's), so the page shows the product being described.
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
const list = blocks(detail);

const existing = await db.page.findUnique({ where: { slug: SLUG }, select: { id: true, blocks: true } });
console.log(`  ${apply ? '' : 'would '}${existing ? 'rewrite' : 'create'} ${PATH} (CMS page ${SLUG})`);
console.log(`    sections: ${list.map((b) => b.type).join(', ')}`);
console.log(`    details photo: ${detail}`);

if (apply) {
  if (existing) {
    // The page as it was, in the page builder's history.
    await db.pageRevision.create({
      data: { pageId: existing.id, blocks: existing.blocks, label: 'Before the DTF shop layout' },
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
