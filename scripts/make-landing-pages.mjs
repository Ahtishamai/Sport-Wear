/**
 * Creates the ad landing page for jerseys, one page for both sports:
 *
 *   /lp/custom-jerseys   (CMS page "lp-custom-jerseys")
 *
 * Baseball and softball share the page. Its form asks which (two buttons),
 * and an ad can say which in its final URL — /lp/custom-jerseys?sport=softball
 * — which picks the sport on the form and swaps in that sport's headline, so
 * the page still matches the search that bought the click.
 *
 * It is an ordinary page of page-builder sections, so after this runs every
 * word, photo and price on it is edited in Admin → Pages. This only writes the
 * first version, and never touches the page once it exists, so a deploy can
 * run it every time (scripts/data-tasks.mjs) without undoing an edit.
 *
 * Two separate pages, one per sport, were the first version of this and were
 * never put live. If either exists it is set to Draft, which takes it off the
 * site without deleting anything.
 *
 * Every claim on the page is one the site already makes and stands behind:
 * the price ladder on the jersey designs, YS–3XL, 24-hour mockups, 3–4 weeks
 * with a 2-week rush, no art or setup fees, free shipping, 1,000+ customers
 * (the About page), in-house sublimation, fastpitch and slowpitch advice. The
 * reviews section is a copy of the home page's Google reviews section, so no
 * review appears that the shop does not already show.
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

const SLUG = 'lp-custom-jerseys';
const RETIRED = ['lp-custom-baseball-jerseys', 'lp-custom-softball-jerseys'];
// The designs are the same for both sports; this collection holds them all.
const DESIGNS = 'custom-baseball-jerseys';
const SUBJECT = 'Custom jerseys (ad landing page)';

const id = () => 'b_' + randomBytes(5).toString('hex');

function blocks(image, reviews) {
  return [
    {
      type: 'leadHero',
      props: {
        badge: 'Free mockup in 24 hours',
        image,
        heading: 'Custom Baseball & Softball Jerseys, Made for Your Team',
        headingBaseball: 'Custom Baseball Jerseys, Made for Your Team',
        headingSoftball: 'Custom Softball Jerseys, Made for Your Team',
        body: 'Names, numbers and your logo included at no extra cost. Tell us your colors and see your free design within 24 hours.',
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
        formHeading: 'Get your free jersey mockup',
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
      type: 'marquee',
      props: {
        items: [
          'Youth baseball',
          'Travel teams',
          'High school',
          'Fastpitch softball',
          'Slowpitch leagues',
          'Men’s softball',
          'Coed & company teams',
        ],
        speed: 30,
      },
    },
    {
      type: 'designShowcase',
      props: {
        eyebrow: 'Designs',
        heading: 'Pick a design. We make it yours.',
        body: 'Every design works for baseball or softball. We change the colors, names and logo to match your team.',
        collectionHandle: DESIGNS,
        limit: 8,
        buttonLabel: 'Use this design',
        footnote: 'Don’t see your style? Send us your idea and we will design it from scratch, free.',
        background: 'white',
      },
    },
    {
      type: 'priceLadder',
      props: {
        eyebrow: 'Simple pricing',
        heading: 'The more you order, the less you pay',
        body: 'Same price for baseball and softball. Names, numbers and your logo are always included.',
        tiers: [
          { qty: '1 jersey', price: '$50', highlight: false, tag: '' },
          { qty: '2 jerseys', price: '$40', highlight: false, tag: '' },
          { qty: '3–4 jerseys', price: '$35', highlight: false, tag: '' },
          { qty: '5 jerseys', price: '$30', highlight: false, tag: '' },
          { qty: '6–10 jerseys', price: '$25', highlight: false, tag: '' },
          { qty: '11–20 jerseys', price: '$22', highlight: false, tag: '' },
          { qty: '21+ jerseys', price: '$20', highlight: true, tag: 'Best value' },
        ],
        note: 'Prices for our listed designs, per jersey. Some designs are priced by quote. Free shipping on every order.',
        ctaLabel: 'Get my exact price',
        background: 'surface',
      },
    },
    {
      type: 'iconFeatures',
      props: {
        eyebrow: 'Why teams choose us',
        heading: 'Jerseys built to last a full season',
        body: '',
        size: 'standard',
        align: 'center',
        background: 'white',
        items: [
          { title: 'Won’t crack or fade', icon: 'shield', body: 'Sublimation dyes the design into the fabric, so names and numbers never peel.' },
          { title: 'Light and breathable', icon: 'check', body: 'Performance fabric that stays comfortable on hot summer game days.' },
          { title: 'Unlimited changes', icon: 'palette', body: 'We tweak your design until you love it. Nothing is made until you say yes.' },
          { title: 'Easy reorders', icon: 'reorder', body: 'We keep your design on file, so a new player’s jersey matches the rest.' },
        ],
      },
    },
    {
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
    },
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
          { q: 'Do you make jerseys for softball too?', a: 'Yes. Every design works for baseball or softball, at the same price. Tell us if you play fastpitch or slowpitch and we will suggest the cut that suits it.' },
          { q: 'Do you make youth and men’s jerseys?', a: 'Yes. Sizes run from youth small (YS) to adult 3XL. Youth and adult sizes cost the same and can go on one order.' },
          { q: 'I don’t have a logo or a design. Can you help?', a: 'Yes. Send your team colors or a rough idea. Our art team designs it for free and sends a mockup within 24 hours.' },
          { q: 'How long will it take?', a: 'Most orders arrive 3 to 4 weeks after you approve the design. A 2-week rush is available for an added fee.' },
          { q: 'Do I pay anything to get a mockup?', a: 'No. The mockup and the quote are free, with no deposit and no obligation to order.' },
        ],
      },
    },
    {
      type: 'leadForm',
      props: {
        eyebrow: 'Free mockup in 24 hours',
        heading: 'See your team’s jerseys before you pay a cent',
        body: 'Send your team details now. Your free design and exact price arrive within 24 hours.',
        points: ['Free design mockup', 'Names & numbers included', 'No deposit, no obligation'],
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

// The earlier one-page-per-sport version, if it was ever made: off the site,
// kept in the admin.
for (const slug of RETIRED) {
  const old = await db.page.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (old && old.status !== 'DRAFT') {
    console.log(`  ${apply ? 'setting' : 'would set'} /${slug} to Draft — replaced by /${SLUG}`);
    if (apply) {
      await db.page.update({ where: { id: old.id }, data: { status: 'DRAFT' } });
      changed = true;
    }
  }
}

if (await db.page.findUnique({ where: { slug: SLUG }, select: { id: true } })) {
  console.log(`  /${SLUG} already exists — left as it is`);
} else {
  // The first jersey's own photo, so the hero shows the product being sold.
  const first = await db.productImage.findFirst({
    where: {
      product: { status: 'PUBLISHED', collections: { some: { collection: { handle: DESIGNS } } } },
    },
    orderBy: [{ product: { position: 'asc' } }, { position: 'asc' }],
    select: { url: true },
  });
  const collection = await db.collection.findUnique({
    where: { handle: DESIGNS },
    select: { bannerUrl: true, thumbUrl: true },
  });
  const image = first?.url || collection?.bannerUrl || collection?.thumbUrl || '/media/hero-field.png';

  // The home page's Google reviews section, copied as it is.
  const home = await db.page.findUnique({ where: { slug: 'home' }, select: { blocks: true } });
  const homeReviews = (Array.isArray(home?.blocks) ? home.blocks : []).find(
    (b) => b?.type === 'googleReviews' && !b.hidden
  );
  const reviews = homeReviews
    ? { type: 'googleReviews', props: structuredClone(homeReviews.props ?? {}) }
    : null;

  const list = blocks(image, reviews);
  console.log(`  ${apply ? 'creating' : 'would create'} /${SLUG} → /lp/${SLUG.slice(3)}`);
  console.log(`    hero photo: ${image}`);
  console.log(`    reviews:    ${reviews ? 'copied from the home page' : 'none on the home page, so none here'}`);
  console.log(`    sections:   ${list.map((b) => b.type).join(', ')}`);

  if (apply) {
    const page = await db.page.create({
      data: {
        slug: SLUG,
        title: 'Landing page — Custom Jerseys (ads)',
        blocks: list,
        status: 'PUBLISHED',
        isSystem: false,
        showInNav: false,
        seoTitle: 'Custom Baseball & Softball Jerseys | Free Mockup in 24 Hours',
        seoDescription:
          'Custom baseball and softball jerseys with free names, numbers and logos. Free mockup in 24 hours, no setup fees, free shipping. As low as $20 a jersey.',
      },
    });
    await db.pageRevision.create({ data: { pageId: page.id, blocks: list, label: 'Created' } });
    changed = true;
  }
}

if (changed) console.log('DATA_CHANGED');
await db.$disconnect();
