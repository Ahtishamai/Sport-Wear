/**
 * Creates the two ad landing pages:
 *
 *   /lp/custom-baseball-jerseys   (CMS page "lp-custom-baseball-jerseys")
 *   /lp/custom-softball-jerseys   (CMS page "lp-custom-softball-jerseys")
 *
 * They are ordinary pages made of page-builder sections, so after this runs
 * every word, photo and price on them is edited in Admin → Pages like any
 * other page. This only writes the first version.
 *
 * A page that already exists is never touched, so a deploy can run this
 * every time (scripts/data-tasks.mjs) without undoing an edit.
 *
 * Every claim on them is one the site already makes and stands behind: the
 * price ladder on the jersey designs, YS–3XL, 24-hour mockups, 3–4 weeks with
 * a 2-week rush, no art or setup fees, free shipping, 1,000+ customers (the
 * About page), in-house sublimation. The reviews section is a copy of the
 * home page's Google reviews section, so no review appears here that the
 * shop does not already show.
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

const id = () => 'b_' + randomBytes(5).toString('hex');

// ------------------------------------------------------------------ shared

const PRICE_TIERS = [
  { qty: '1 jersey', price: '$50', highlight: false, tag: '' },
  { qty: '2 jerseys', price: '$40', highlight: false, tag: '' },
  { qty: '3–4 jerseys', price: '$35', highlight: false, tag: '' },
  { qty: '5 jerseys', price: '$30', highlight: false, tag: '' },
  { qty: '6–10 jerseys', price: '$25', highlight: false, tag: '' },
  { qty: '11–20 jerseys', price: '$22', highlight: false, tag: '' },
  { qty: '21+ jerseys', price: '$20', highlight: true, tag: 'Best value' },
];

const STATS = {
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
};

const STEPS = {
  type: 'steps',
  props: {
    eyebrow: 'How it works',
    heading: 'Your jerseys in 4 simple steps',
    background: 'surface',
    steps: [
      { title: 'Send your idea', icon: 'chat', body: 'Fill in the short form. Your colors, a logo or a rough sketch is plenty.' },
      { title: 'Free mockup in 24 hours', icon: 'clock', body: 'Our artists design your jerseys and send an exact price.' },
      { title: 'Approve and send sizes', icon: 'check', body: 'Change it as often as you like. Then send your roster.' },
      { title: 'Delivered to your door', icon: 'truck', body: 'Your jerseys arrive in 3–4 weeks, with free shipping.' },
    ],
  },
};

function hero(sport, o) {
  return {
    type: 'leadHero',
    props: {
      badge: 'Free mockup in 24 hours',
      image: o.image,
      heading: o.heading,
      body: o.body,
      bullets: [
        'Free design mockup in 24 hours',
        'Names, numbers & logo included',
        'As low as $20 a jersey',
        'No art fees, no setup fees',
        'Free shipping on every order',
        'Delivered in 3–4 weeks',
      ],
      proof: 'Trusted by 1,000+ happy customers across North America',
      chips: ['Sublimated in-house', 'Youth to adult 3XL', 'Unlimited revisions'],
      formHeading: o.formHeading,
      formBody: 'Tell us about your team. We send your design and an exact price within 24 hours.',
      ctaLabel: 'Get My Free Mockup',
      reassurance: 'No deposit · No obligation · Reply within 24 hours',
      sport,
      subject: o.subject,
    },
  };
}

function grid(collectionHandle, heading) {
  return {
    type: 'designShowcase',
    props: {
      eyebrow: 'Designs',
      heading,
      body: 'Tap any design to start. We change the colors, names and logo to match your team.',
      collectionHandle,
      limit: 8,
      buttonLabel: 'Use this design',
      footnote: 'Don’t see your style? Send us your idea and we will design it from scratch, free.',
      background: 'white',
    },
  };
}

function prices() {
  return {
    type: 'priceLadder',
    props: {
      eyebrow: 'Simple pricing',
      heading: 'The more you order, the less you pay',
      body: 'Names, numbers and your logo are always included. No hidden fees.',
      tiers: PRICE_TIERS,
      note: 'Prices for our listed designs, per jersey. Some designs are priced by quote. Free shipping on every order.',
      ctaLabel: 'Get my exact price',
      background: 'surface',
    },
  };
}

function features(o) {
  return {
    type: 'iconFeatures',
    props: {
      eyebrow: 'Why teams choose us',
      heading: o.heading,
      body: '',
      size: 'standard',
      align: 'center',
      background: 'white',
      items: o.items,
    },
  };
}

function closing(sport, subject, heading) {
  return {
    type: 'leadForm',
    props: {
      eyebrow: 'Free mockup in 24 hours',
      heading,
      body: 'Send your team details now. Your free design and exact price arrive within 24 hours.',
      points: ['Free design mockup', 'Names & numbers included', 'No deposit, no obligation'],
      ctaLabel: 'Get My Free Mockup',
      reassurance: 'No deposit · No obligation',
      sport,
      subject,
    },
  };
}

// ------------------------------------------------------------------ the two pages

const PAGES = [
  {
    slug: 'lp-custom-baseball-jerseys',
    title: 'Landing page — Custom Baseball Jerseys',
    seoTitle: 'Custom Baseball Jerseys | Free Mockup in 24 Hours',
    seoDescription:
      'Custom baseball jerseys with free names, numbers and logos. Free mockup in 24 hours, no setup fees, free shipping. As low as $20 a jersey.',
    collection: 'custom-baseball-jerseys',
    build: (image, reviews) => {
      const subject = 'Custom baseball jerseys (ad landing page)';
      return [
        hero('Baseball', {
          image,
          heading: 'Custom Baseball Jerseys, Made for Your Team',
          body: 'Names, numbers and your logo included at no extra cost. Tell us your colors and see your free design within 24 hours.',
          formHeading: 'Get your free jersey mockup',
          subject,
        }),
        STATS,
        grid('custom-baseball-jerseys', 'Pick a design. We make it yours.'),
        prices(),
        features({
          heading: 'Jerseys built to last a full season',
          items: [
            { title: 'Won’t crack or fade', icon: 'shield', body: 'Sublimation dyes the design into the fabric, so numbers never peel after a few washes.' },
            { title: 'Unlimited changes', icon: 'palette', body: 'We tweak your design until you love it. Nothing is made until you say yes.' },
            { title: 'Need them fast?', icon: 'rush', body: 'Most orders arrive in 3–4 weeks. A 2-week rush is available for a fee.' },
            { title: 'Easy reorders', icon: 'reorder', body: 'We keep your design on file, so a new player’s jersey matches the rest.' },
          ],
        }),
        STEPS,
        ...(reviews ? [reviews] : []),
        {
          type: 'faqList',
          props: {
            eyebrow: 'FAQ',
            heading: 'Questions coaches ask us',
            background: 'white',
            items: [
              { q: 'Can I order just one jersey?', a: 'Yes. One jersey is $50, and the price per jersey drops as you add more, down to $20 each for 21 or more.' },
              { q: 'Are names and numbers really free?', a: 'Yes. Player names, numbers, your logo and sponsor names are all included. There are no art fees and no setup fees.' },
              { q: 'I don’t have a logo or a design. Can you help?', a: 'Yes. Send your team colors or a rough idea. Our art team designs it for free and sends a mockup within 24 hours.' },
              { q: 'How long will it take?', a: 'Most orders arrive 3 to 4 weeks after you approve the design. A 2-week rush is available for an added fee.' },
              { q: 'Can I mix youth and adult sizes?', a: 'Yes. Sizes run from youth small to adult 3XL in one order, and every size costs the same.' },
              { q: 'Do I pay anything to get a mockup?', a: 'No. The mockup and the quote are free, with no deposit and no obligation to order.' },
            ],
          },
        },
        closing('Baseball', subject, 'See your team’s jerseys before you pay a cent'),
      ];
    },
  },
  {
    slug: 'lp-custom-softball-jerseys',
    title: 'Landing page — Custom Softball Jerseys',
    seoTitle: 'Custom Softball Jerseys | Free Mockup in 24 Hours',
    seoDescription:
      'Custom softball jerseys for youth, fastpitch, slowpitch and men’s teams. Free names, numbers and logos, free mockup in 24 hours, free shipping.',
    collection: 'custom-softball-jerseys',
    build: (image, reviews) => {
      const subject = 'Custom softball jerseys (ad landing page)';
      return [
        hero('Softball', {
          image,
          heading: 'Custom Softball Jerseys, Made for Your Team',
          body: 'For youth, fastpitch, slowpitch and men’s teams. Names, numbers and your logo included. See your free design within 24 hours.',
          formHeading: 'Get your free jersey mockup',
          subject,
        }),
        STATS,
        grid('custom-softball-jerseys', 'Pick a design. We make it yours.'),
        prices(),
        features({
          heading: 'Softball jerseys your players will love',
          items: [
            { title: 'Light and breathable', icon: 'shield', body: 'Performance fabric that stays comfortable on hot summer days in the field.' },
            { title: 'Won’t crack or fade', icon: 'palette', body: 'The design is dyed into the fabric, so names and numbers never peel.' },
            { title: 'Every kind of team', icon: 'check', body: 'Youth, fastpitch, slowpitch, men’s and coed — sizes from YS to adult 3XL.' },
            { title: 'Easy reorders', icon: 'reorder', body: 'We keep your design on file, so a new player’s jersey matches the rest.' },
          ],
        }),
        STEPS,
        ...(reviews ? [reviews] : []),
        {
          type: 'faqList',
          props: {
            eyebrow: 'FAQ',
            heading: 'Questions coaches ask us',
            background: 'white',
            items: [
              { q: 'Can I order just one jersey?', a: 'Yes. One jersey is $50, and the price per jersey drops as you add more, down to $20 each for 21 or more.' },
              { q: 'Do you make men’s softball jerseys?', a: 'Yes. Adult sizes run up to 3XL, so our jerseys work well for men’s slowpitch and league teams.' },
              { q: 'Do you make youth softball jerseys?', a: 'Yes. Youth sizes start at YS. Youth and adult sizes cost the same and can go on one order.' },
              { q: 'Are names and numbers really free?', a: 'Yes. Player names, numbers, your logo and sponsor names are all included. There are no art or setup fees.' },
              { q: 'How long will it take?', a: 'Most orders arrive 3 to 4 weeks after you approve the design. A 2-week rush is available for an added fee.' },
              { q: 'Do I pay anything to get a mockup?', a: 'No. The mockup and the quote are free, with no deposit and no obligation to order.' },
            ],
          },
        },
        closing('Softball', subject, 'See your team’s jerseys before you pay a cent'),
      ];
    },
  },
];

// ------------------------------------------------------------------ run

say(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');

// The home page's Google reviews section, copied as it is.
const home = await db.page.findUnique({ where: { slug: 'home' }, select: { blocks: true } });
const homeReviews = (Array.isArray(home?.blocks) ? home.blocks : []).find(
  (b) => b?.type === 'googleReviews' && !b.hidden
);
say(homeReviews ? '  reviews: copying the home page’s Google reviews section' : '  reviews: none on the home page, so none here');

let made = 0;
for (const pg of PAGES) {
  if (await db.page.findUnique({ where: { slug: pg.slug }, select: { id: true } })) {
    say(`  /${pg.slug} already exists — left as it is`);
    continue;
  }

  // The first jersey's own photo, so the hero shows the product being sold.
  const first = await db.productImage.findFirst({
    where: {
      product: {
        status: 'PUBLISHED',
        collections: { some: { collection: { handle: pg.collection } } },
      },
    },
    orderBy: [{ product: { position: 'asc' } }, { position: 'asc' }],
    select: { url: true },
  });
  const collection = await db.collection.findUnique({
    where: { handle: pg.collection },
    select: { bannerUrl: true, thumbUrl: true },
  });
  const image = first?.url || collection?.bannerUrl || collection?.thumbUrl || '/media/hero-field.png';

  const reviews = homeReviews
    ? { type: 'googleReviews', props: structuredClone(homeReviews.props ?? {}) }
    : null;
  const blocks = pg.build(image, reviews).map((b) => ({ id: id(), ...b }));

  say(`  ${apply ? 'creating' : 'would create'} /${pg.slug} → /lp/${pg.slug.slice(3)}`);
  say(`    hero photo: ${image}`);
  say(`    sections:   ${blocks.map((b) => b.type).join(', ')}`);

  if (apply) {
    const page = await db.page.create({
      data: {
        slug: pg.slug,
        title: pg.title,
        blocks,
        status: 'PUBLISHED',
        isSystem: false,
        showInNav: false,
        seoTitle: pg.seoTitle,
        seoDescription: pg.seoDescription,
      },
    });
    await db.pageRevision.create({ data: { pageId: page.id, blocks, label: 'Created' } });
    made++;
  }
}

if (made) say('DATA_CHANGED');
await db.$disconnect();

function say(s) {
  console.log(s);
}
