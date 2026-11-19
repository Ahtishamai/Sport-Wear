/**
 * Creates the ad landing page for Custom Pinstripe Uniforms:
 *
 *   /custom-pinstripe-uniforms   (CMS page "lp-custom-pinstripe-uniforms")
 *
 * One collection only — Custom Pinstripe Uniforms (/collections/pinstripe-uniform)
 * — for baseball and softball alike. The form asks which sport, and an ad's
 * final URL can say so (?sport=softball), which picks it on the form and
 * swaps in that sport's headline.
 *
 * It is an ordinary page of page-builder sections, so after this runs every
 * word, photo and price on it is edited in Admin → Pages. This writes only
 * the first version and never touches the page once it exists, so a deploy
 * can run it every time (scripts/data-tasks.mjs) without undoing an edit.
 *
 * Earlier jersey landing pages (lp-custom-jerseys and the per-sport pair)
 * were never put live. If any exists it is set to Draft, which takes it off
 * the site without deleting it.
 *
 * Every claim is one the shop already makes on its pinstripe collection and
 * product pages: the stripe is printed into the fabric rather than sewn; any
 * two colours at no extra cost; even spacing on every size; $50 a jersey,
 * $48.50 at 12, $47 at 24, $45 at 48 (the products' own price ladder); team
 * name and number included; matching pants, belts and socks quoted alongside;
 * YS–3XL; 24-hour mockups; 3–4 weeks with a 2-week rush; free shipping;
 * 1,000+ customers (About page). The reviews section is a copy of the home
 * page's Google reviews section, so no review appears that the shop does not
 * already show.
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
const RETIRED = ['lp-custom-jerseys', 'lp-custom-baseball-jerseys', 'lp-custom-softball-jerseys'];
const COLLECTION = 'pinstripe-uniform';
const SUBJECT = 'Custom pinstripe uniforms (ad landing page)';

const id = () => 'b_' + randomBytes(5).toString('hex');

function blocks({ hero, detail, reviews }) {
  return [
    {
      type: 'leadHero',
      props: {
        badge: 'Printed, not sewn',
        image: hero,
        heading: 'Custom Pinstripe Uniforms That Never Peel or Fray',
        headingBaseball: 'Custom Pinstripe Baseball Uniforms That Never Peel or Fray',
        headingSoftball: 'Custom Pinstripe Softball Uniforms That Never Peel or Fray',
        body: 'The classic pinstripe look, printed into the fabric in your team colors. Team name and numbers included. See your free design within 24 hours.',
        bullets: [
          'Free design mockup in 24 hours',
          'Team name & numbers included',
          'As low as $45 a jersey',
          'Any two colors, no extra cost',
          'Matching pants, belts & socks',
          'Free shipping on every order',
        ],
        proof: 'Trusted by 1,000+ happy customers across North America',
        chips: ['Printed into the fabric', 'Youth to adult 3XL', 'Baseball & softball'],
        formHeading: 'Get your free pinstripe mockup',
        formBody: 'Tell us about your team. We send your design and an exact price within 24 hours.',
        ctaLabel: 'Get My Free Mockup',
        reassurance: 'No deposit · No obligation · Reply within 24 hours',
        askSport: true,
        sport: 'Baseball',
        subject: SUBJECT,
      },
    },
    {
      type: 'statStrip',
      props: {
        background: 'white',
        items: [
          { value: '1,000+', label: 'Happy customers', count: 1000, suffix: '+', highlight: false },
          { value: '24 hrs', label: 'Free mockup', count: 24, suffix: ' hrs', highlight: false },
          { value: '3–4 weeks', label: 'To your door', count: 0, suffix: '', highlight: false },
          { value: '$0', label: 'Art & setup fees', count: 0, suffix: '', highlight: true },
        ],
      },
    },
    {
      type: 'designShowcase',
      props: {
        eyebrow: 'Pick your look',
        heading: 'Classic pinstripes, in your colors',
        body: 'Start from one of these. We match it to your team, with your name, numbers and logo.',
        collectionHandle: COLLECTION,
        limit: 8,
        buttonLabel: 'Use this design',
        footnote: 'Want different colors? Any two shades work, at no extra cost.',
        background: 'white',
      },
    },
    {
      type: 'imageText',
      props: {
        image: detail,
        side: 'right',
        background: 'surface',
        eyebrow: 'Printed, not sewn',
        heading: 'Pinstripes that still look new next season',
        body: 'On many uniforms the stripe is sewn on. A sewn stripe can lift at the shoulder, fray at the hem or pull crooked across a seam. We print the stripe into the fabric itself, so it cannot do any of those things.',
        bullets: [
          'Never lifts, frays or peels',
          'Stays straight across every seam',
          'Even spacing on every size, YS to 3XL',
          'Any two colors, at no extra cost',
        ],
        cta: [{ label: 'Get my free mockup', href: '#get-quote' }],
      },
    },
    {
      type: 'priceLadder',
      props: {
        eyebrow: 'Simple pricing',
        heading: 'Pinstripes cost no more than a plain jersey',
        body: 'Team name and numbers are always included. The price drops at 12, 24 and 48 pieces.',
        tiers: [
          { qty: '1–11 jerseys', price: '$50', highlight: false, tag: '' },
          { qty: '12–23 jerseys', price: '$48.50', highlight: false, tag: '' },
          { qty: '24–47 jerseys', price: '$47', highlight: false, tag: '' },
          { qty: '48+ jerseys', price: '$45', highlight: true, tag: 'Best value' },
        ],
        unit: 'per jersey',
        note: 'Matching pants, belts and socks are quoted alongside. Free shipping on every order.',
        ctaLabel: 'Get my exact price',
        background: 'white',
      },
    },
    {
      type: 'marquee',
      props: {
        items: [
          'Baseball',
          'Softball',
          'Youth leagues',
          'Travel teams',
          'High school',
          'Fastpitch',
          'Slowpitch',
          'Men’s leagues',
        ],
        speed: 30,
      },
    },
    {
      type: 'iconFeatures',
      props: {
        eyebrow: 'Why teams choose us',
        heading: 'Everything your team needs, in one order',
        body: '',
        size: 'standard',
        align: 'center',
        background: 'white',
        items: [
          { title: 'Names & numbers included', icon: 'check', body: 'Team name and player numbers on every jersey, in a color you pick. No art or setup fees.' },
          { title: 'The full uniform', icon: 'palette', body: 'Matching pants, belts and socks are quoted with your jerseys, so the whole team matches.' },
          { title: 'Need it fast?', icon: 'rush', body: 'Most orders arrive in 3–4 weeks. A 2-week rush is available for a fee.' },
          { title: 'Easy reorders', icon: 'reorder', body: 'We keep your design on file, so a new player’s uniform matches the rest.' },
        ],
      },
    },
    {
      type: 'steps',
      props: {
        eyebrow: 'How it works',
        heading: 'Your uniforms in 4 simple steps',
        background: 'surface',
        steps: [
          { title: 'Send your idea', icon: 'chat', body: 'Fill in the short form. Your colors, a logo or a rough sketch is plenty.' },
          { title: 'Free mockup in 24 hours', icon: 'clock', body: 'Our artists design your uniform and send an exact price.' },
          { title: 'Approve and send sizes', icon: 'check', body: 'Change it as often as you like. Then send your roster.' },
          { title: 'Delivered to your door', icon: 'truck', body: 'Your uniforms arrive in 3–4 weeks, with free shipping.' },
        ],
      },
    },
    ...(reviews ? [reviews] : []),
    {
      type: 'faqList',
      props: {
        eyebrow: 'FAQ',
        heading: 'Questions coaches ask us',
        background: 'white',
        items: [
          { q: 'Do pinstripes cost more than a plain jersey?', a: 'No. A pinstripe jersey is $50, the same as a plain one. It drops to $48.50 at 12 pieces, $47 at 24 and $45 at 48 or more.' },
          { q: 'Will the stripes peel or fray?', a: 'No. The stripe is printed into the fabric, not sewn on, so it cannot lift, fray or pull crooked across a seam.' },
          { q: 'Can I pick my own colors?', a: 'Yes. Any two shades work for the base and the stripe, at no extra cost.' },
          { q: 'Are the team name and numbers included?', a: 'Yes. Team name and number are included on every jersey, in a color you pick. There are no art or setup fees.' },
          { q: 'Can I get matching pants?', a: 'Yes. Matching pants, belts and socks are quoted alongside the jerseys, so the whole uniform comes from one order.' },
          { q: 'Do these work for baseball and softball?', a: 'Yes, both. The jersey is the same; usually only the size run and the pants change between the two.' },
          { q: 'Will the stripes look right on youth and adult sizes?', a: 'Yes. The stripe spacing stays even on every size from YS to 3XL, so the whole roster looks like one team.' },
          { q: 'How long will it take?', a: 'Most orders arrive 3 to 4 weeks after you approve the design. A 2-week rush is available for an added fee.' },
        ],
      },
    },
    {
      type: 'leadForm',
      props: {
        eyebrow: 'Free mockup in 24 hours',
        heading: 'See your pinstripe uniforms before you pay a cent',
        body: 'Send your team details now. Your free design and exact price arrive within 24 hours.',
        points: ['Free design mockup', 'Team name & numbers included', 'No deposit, no obligation'],
        ctaLabel: 'Get My Free Mockup',
        reassurance: 'No deposit · No obligation',
        askSport: true,
        sport: 'Baseball',
        subject: SUBJECT,
      },
    },
  ].map((b) => ({ id: id(), ...b }));
}

// ------------------------------------------------------------------ run

console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');
let changed = false;

for (const slug of RETIRED) {
  const old = await db.page.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (old && old.status !== 'DRAFT') {
    console.log(`  ${apply ? 'setting' : 'would set'} /${slug} to Draft — replaced by ${PATH}`);
    if (apply) {
      await db.page.update({ where: { id: old.id }, data: { status: 'DRAFT' } });
      changed = true;
    }
  }
}

if (await db.page.findUnique({ where: { slug: SLUG }, select: { id: true } })) {
  console.log(`  /${SLUG} already exists — left as it is`);
} else {
  // The collection's own photographs: the first for the hero, the next for
  // the "printed, not sewn" section, so the page shows what is being sold.
  const photos = await db.productImage.findMany({
    where: {
      position: 0,
      product: { status: 'PUBLISHED', collections: { some: { collection: { handle: COLLECTION } } } },
    },
    orderBy: { product: { position: 'asc' } },
    select: { url: true },
    take: 2,
  });
  const collection = await db.collection.findUnique({
    where: { handle: COLLECTION },
    select: { bannerUrl: true, thumbUrl: true },
  });
  const fallback = collection?.bannerUrl || collection?.thumbUrl || '/media/hero-field.png';
  const hero = photos[0]?.url || fallback;
  const detail = photos[1]?.url || hero;

  // The home page's Google reviews section, copied as it is.
  const home = await db.page.findUnique({ where: { slug: 'home' }, select: { blocks: true } });
  const homeReviews = (Array.isArray(home?.blocks) ? home.blocks : []).find(
    (b) => b?.type === 'googleReviews' && !b.hidden
  );
  const reviews = homeReviews
    ? { type: 'googleReviews', props: structuredClone(homeReviews.props ?? {}) }
    : null;

  const list = blocks({ hero, detail, reviews });
  console.log(`  ${apply ? 'creating' : 'would create'} ${PATH}  (CMS page ${SLUG})`);
  console.log(`    photos:   ${hero}, ${detail}`);
  console.log(`    reviews:  ${reviews ? 'copied from the home page' : 'none on the home page, so none here'}`);
  console.log(`    sections: ${list.map((b) => b.type).join(', ')}`);

  if (apply) {
    const page = await db.page.create({
      data: {
        slug: SLUG,
        title: 'Landing page — Custom Pinstripe Uniforms (ads)',
        blocks: list,
        status: 'PUBLISHED',
        isSystem: false,
        showInNav: false,
        seoTitle: 'Custom Pinstripe Uniforms | Free Mockup in 24 Hours',
        seoDescription:
          'Custom pinstripe baseball and softball uniforms, printed not sewn. Team name and numbers included, free mockup in 24 hours, free shipping. From $45 a jersey.',
      },
    });
    await db.pageRevision.create({ data: { pageId: page.id, blocks: list, label: 'Created' } });
    changed = true;
  }
}

if (changed) console.log('DATA_CHANGED');
await db.$disconnect();
