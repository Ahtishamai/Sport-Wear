/**
 * Seeds the database with the full design-handoff content:
 * catalog, collections, packages, reviews, FAQs, navigation, settings and
 * every page laid out as builder blocks.
 *
 * Safe to re-run — everything upserts on its natural key.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { aboutBlocks } from './about-page';

const prisma = new PrismaClient();

let blockSeq = 0;
const b = (type: string, props: Record<string, unknown>) => ({
  id: `b_seed_${(blockSeq++).toString(36).padStart(3, '0')}`,
  type,
  props,
});

const SIZES = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const SPORTS = ['Baseball', 'Softball', 'Other'];

const COLORWAYS = [
  { name: 'Navy / Gold', from: '#16264B', to: '#FFD100' },
  { name: 'Black / Red', from: '#1A1A1A', to: '#C42027' },
  { name: 'Royal / White', from: '#1B4FD8', to: '#F2F2EF' },
  { name: 'Forest / Cream', from: '#1E4632', to: '#E8DFC8' },
  { name: 'Maroon / Grey', from: '#6B1D2B', to: '#9DA1A8' },
];

const TIERS = [
  { label: '1–11', minQty: 1, maxQty: 11, discount: 0, savingsLabel: '' },
  { label: '12–23', minQty: 12, maxQty: 23, discount: 1.5, savingsLabel: 'Save 5%' },
  { label: '24–47', minQty: 24, maxQty: 47, discount: 3, savingsLabel: 'Save 10%' },
  { label: '48+', minQty: 48, maxQty: null, discount: 5, savingsLabel: 'Save 16%' },
];

const SPECS = [
  {
    q: 'Fabric & construction',
    a: '100% polyester interlock, 145gsm, four-way stretch with flatlock seams and a reinforced neck rib. Sublimated at 200°C so graphics live inside the fibers — no cracking, peeling or fading.',
  },
  {
    q: 'Customization included',
    a: 'Unlimited colors, team logos, sponsor marks, player names and numbers, plus sleeve patches. No art fees, no setup charges, free revisions until you approve.',
  },
  {
    q: 'Sizing & fit',
    a: "Youth Small through Adult 3XL in athletic cut. Free sizing kit on request, or send us your last order's size run and we'll match it.",
  },
  {
    q: 'Turnaround & shipping',
    a: '3–4 weeks from artwork approval; 2-week rush available for an added fee. Orders ship bagged and labeled by player, tracked, nationwide.',
  },
  {
    q: 'Minimums & reorders',
    a: 'Team pricing starts at 12 pieces; smaller runs are quoted individually. Your artwork stays on file so mid-season reorders take days, not weeks.',
  },
];

const TRUST = ['No deposit to get a quote', 'Names & numbers included', 'Reorders anytime'];

// ------------------------------------------------------------------ catalog

const COLLECTIONS = [
  {
    handle: 'shirts',
    title: 'Shirts & jerseys',
    subtitle: 'Custom sublimated jerseys',
    description:
      'Full-sublimation and stock jerseys in crew, two-button and button-up cuts. Names, numbers and sponsor marks are included in every price.',
    bannerUrl: '/media/collection-shirts.png',
    thumbUrl: '/media/tile-jerseys.png',
    position: 0,
    seoTitle: 'Custom baseball & softball jerseys',
    seoDescription:
      'Custom sublimated baseball and softball jerseys — crew neck, two-button and button-up. Free 24-hour mockup, no art or setup fees.',
  },
  {
    handle: 'pants',
    title: 'Pants & shorts',
    subtitle: 'Performance pants',
    description:
      'Game pants built for sliding — full-sublimation, stock and shorts, in youth through adult 3XL.',
    bannerUrl: '/media/collection-pants.png',
    thumbUrl: '/media/tile-pants.png',
    position: 1,
    seoTitle: 'Custom baseball & softball pants',
    seoDescription:
      'Custom baseball and softball pants and shorts — full sublimation or stock, quoted per unit with no setup fees.',
  },
  {
    handle: 'jackets',
    title: 'Jackets & hoodies',
    subtitle: 'Team hoodies',
    description:
      'Fleece hoodies and cage jackets that match the kit — the layer the whole roster actually wears off the field.',
    bannerUrl: '/media/collection-jackets.png',
    thumbUrl: '/media/tile-apparel.png',
    position: 2,
    seoTitle: 'Custom team hoodies & cage jackets',
    seoDescription:
      'Custom sublimated fleece hoodies and windbreaker cage jackets for baseball and softball programs.',
  },
  {
    handle: 'bags',
    title: 'Bags',
    subtitle: 'Bat & catcher bags',
    description:
      'Rolling bat bags and catcher bags in your team colors, with player names embroidered or printed.',
    bannerUrl: '/media/collection-bags.png',
    thumbUrl: '/media/tile-bags.png',
    position: 3,
    seoTitle: 'Custom bat bags & catcher bags',
    seoDescription: 'Custom rolling bat bags and catcher gear bags in your team colors and logos.',
  },
  {
    handle: 'baseball',
    title: 'Baseball',
    subtitle: 'Moisture-wicking, game-ready',
    description: 'Everything we make for baseball programs — uniforms, pants, layers and bags.',
    bannerUrl: '/media/cat-baseball.png',
    thumbUrl: '/media/cat-baseball.png',
    position: 4,
    seoTitle: 'Custom baseball uniforms',
    seoDescription:
      'Custom baseball uniforms, pants, hoodies and bags — sublimated in-house with a free mockup in 24 hours.',
  },
  {
    handle: 'softball',
    title: 'Softball',
    subtitle: 'Built for the circle and the box',
    description: 'Softball kits, tops and pants cut for fastpitch and slowpitch programs.',
    bannerUrl: '/media/cat-softball.png',
    thumbUrl: '/media/cat-softball.png',
    position: 5,
    seoTitle: 'Custom softball uniforms',
    seoDescription:
      'Custom softball uniforms, pants and tops — fully sublimated, no art or setup fees, free 24-hour mockup.',
  },
];

type SeedProduct = {
  handle: string;
  title: string;
  price: number;
  badge: string;
  cat: string;
  extra?: string[];
  featured?: boolean;
  images: string[];
  description: string;
};

const PRODUCTS: SeedProduct[] = [
  {
    handle: 'crew-neck-shirts',
    title: 'Crew Neck Shirts',
    price: 30,
    badge: 'Best seller',
    cat: 'shirts',
    extra: ['baseball', 'softball'],
    featured: true,
    images: ['product-shirt', 'product-jersey', 'product-jersey-2'],
    description:
      'The everyday game shirt: 145gsm polyester interlock with four-way stretch and a reinforced neck rib. Sublimated edge to edge, so your logo, numbers and sponsor marks live inside the fabric and never crack or peel.',
  },
  {
    handle: 'full-sub-jersey',
    title: 'Full Sub Jersey',
    price: 35,
    badge: 'Full sub',
    cat: 'shirts',
    extra: ['baseball'],
    featured: true,
    images: ['product-jersey', 'product-jersey-2', 'product-shirt'],
    description:
      'Our flagship full-sublimation jersey. Unlimited colours across the whole panel with flatlock seams that sit flat under a chest protector — cut athletic through the shoulder for a full range of motion.',
  },
  {
    handle: 'softball-uniforms',
    title: 'Softball Uniforms',
    price: 70,
    badge: 'Complete kit',
    cat: 'shirts',
    extra: ['softball'],
    featured: true,
    images: ['product-jersey-2', 'product-pants', 'product-jersey'],
    description:
      'A complete softball kit — top and pant designed together so the colours and stripes line up on the field. Cut for fastpitch with a shorter inseam option and reinforced sliding panels.',
  },
  {
    handle: 'full-sub-baseball-pants',
    title: 'Full Sub Baseball Pants',
    price: 40,
    badge: 'Full sub',
    cat: 'pants',
    extra: ['baseball'],
    featured: true,
    images: ['product-pants', 'product-jersey'],
    description:
      'Full-sublimation game pants with reinforced knees and a double-layer seat, so piping and side stripes match the jersey exactly instead of being approximated in tape.',
  },
  {
    handle: 'full-sub-fleece-hoodie',
    title: 'Full Sub Fleece Hoodie',
    price: 45,
    badge: 'Team favorite',
    cat: 'jackets',
    extra: ['baseball', 'softball'],
    featured: true,
    images: ['product-hoodie', 'product-jersey'],
    description:
      'Brushed-back fleece hoodie printed all over, with a lined hood and a kangaroo pocket. The layer that actually gets worn to school — which is why it sells more than anything else on this page.',
  },
  {
    handle: 'full-sub-2-button-jersey',
    title: 'Full Sub 2-Button Jersey',
    price: 35,
    badge: 'Full sub',
    cat: 'shirts',
    extra: ['baseball'],
    images: ['product-jersey', 'product-shirt'],
    description:
      'Traditional two-button placket on a modern sublimated body. Keeps the classic look while giving you unlimited colours and a printed collar trim.',
  },
  {
    handle: 'full-sub-button-up-jersey',
    title: 'Full Sub Button-Up Jersey',
    price: 35,
    badge: 'Full sub',
    cat: 'shirts',
    extra: ['baseball'],
    images: ['product-jersey-2', 'product-jersey'],
    description:
      'Full button-up front with a woven placket and printed tackle-twill-style numbers. The most traditional cut we make, built with modern sublimated fabric.',
  },
  {
    handle: 'button-up-jerseys',
    title: 'Button Up Jerseys',
    price: 32,
    badge: 'Classic',
    cat: 'shirts',
    extra: ['baseball', 'softball'],
    images: ['product-shirt', 'product-jersey-2'],
    description:
      'Stock-body button-up jersey with printed team marks — the budget-friendly route when you need the classic look across a big roster.',
  },
  {
    handle: 'full-sub-long-sleeve-shirt',
    title: 'Full Sub Long Sleeve Shirt',
    price: 35,
    badge: 'Full sub',
    cat: 'shirts',
    extra: ['baseball', 'softball'],
    images: ['product-shirt', 'product-jersey'],
    description:
      'Long-sleeve sublimated shirt for cold openers and sun protection — same 145gsm interlock, same four-way stretch, full-length printing down the arm.',
  },
  {
    handle: 'stock-baseball-pants',
    title: 'Stock Baseball Pants',
    price: 25,
    badge: 'Stock',
    cat: 'pants',
    extra: ['baseball'],
    images: ['product-pants'],
    description:
      'Blank stock pants in grey, white and navy with reinforced knees. The economical option when the jersey carries the design and the pant just has to last the season.',
  },
  {
    handle: 'full-sub-softball-pants',
    title: 'Full Sub Softball Pants',
    price: 40,
    badge: 'Full sub',
    cat: 'pants',
    extra: ['softball'],
    images: ['product-pants', 'product-jersey-2'],
    description:
      'Fastpitch-cut sublimated pants with a padded sliding panel and an elastic-bottom or open-leg finish, printed to match the top exactly.',
  },
  {
    handle: 'stock-softball-pants',
    title: 'Stock Softball Pants',
    price: 25,
    badge: 'Stock',
    cat: 'pants',
    extra: ['softball'],
    images: ['product-pants'],
    description:
      'Blank fastpitch pants with a reinforced seat and knee. Available in the standard team colours and sized youth small through adult 3XL.',
  },
  {
    handle: 'full-sub-shorts',
    title: 'Full Sub Shorts',
    price: 25,
    badge: 'Full sub',
    cat: 'pants',
    extra: ['baseball', 'softball'],
    images: ['product-pants', 'product-shirt'],
    description:
      'Sublimated training shorts with a 7" inseam and a zip pocket — for practice, warm-ups and summer camps.',
  },
  {
    handle: 'full-sub-sweatpants',
    title: 'Full Sub Sweatpants',
    price: 45,
    badge: 'Full sub',
    cat: 'pants',
    extra: ['baseball', 'softball'],
    images: ['product-pants', 'product-hoodie'],
    description:
      'Brushed-back sweatpants printed all over to match the hoodie, with a tapered leg and zip pockets. Pairs into a travel set the roster wears on the bus.',
  },
  {
    handle: 'windbreaker-hoodie',
    title: 'Windbreaker Hoodie',
    price: 45,
    badge: 'Cage jacket',
    cat: 'jackets',
    extra: ['baseball', 'softball'],
    images: ['product-hoodie', 'product-shirt'],
    description:
      'Lightweight water-resistant cage jacket with an elastic cuff and a printed hood lining. Cut long enough to pitch in without riding up.',
  },
  {
    handle: 'bat-bags',
    title: 'Bat Bags',
    price: 35,
    badge: 'Custom',
    cat: 'bags',
    extra: ['baseball', 'softball'],
    images: ['product-bag'],
    description:
      'Custom bat bag in your team colours with a fence hook, vented shoe pocket and space for two bats. Player names printed on the side panel at no extra cost.',
  },
  {
    handle: 'catcher-bags',
    title: 'Catcher Bags',
    price: 220,
    badge: 'Pro gear',
    cat: 'bags',
    extra: ['baseball', 'softball'],
    images: ['product-bag'],
    description:
      'Rolling catcher bag sized for a full set of gear — reinforced wheels, a separate helmet compartment and a printed team panel on both sides.',
  },
];

// ------------------------------------------------------------------ helpers

function categoryLabel(handle: string) {
  const map: Record<string, string> = {
    shirts: 'Shirts',
    pants: 'Pants',
    jackets: 'Jackets',
    bags: 'Bags',
  };
  return `${map[handle] ?? 'Custom'} · Fully customizable`;
}

// ------------------------------------------------------------------ pages

function homeBlocks() {
  return [
    b('hero', {
      badge: 'PREMIUM CUSTOM SPORTSWEAR WITH FREE MOCKUPS',
      heading: 'From concept to creation — we design top-tier uniforms.',
      body: 'Fast turnaround in 3–4 weeks, or choose our 2-week Rush Service when you need it faster.',
      image: '/media/hero-field.png',
      primary: [{ label: 'Get my free mockup', href: '#quote' }],
      secondary: [{ label: 'Explore collections', href: '/collections' }],
      proof: '1,000+ happy customers',
      height: 720,
      cornerYear: '2026',
      cornerLabel: 'Team / Lookbook',
      parallax: true,
    }),
    b('statStrip', {
      items: [
        { value: '1,000+', label: 'Teams outfitted', count: 1000, suffix: '+', highlight: false },
        { value: '3–4 wks', label: 'Design to delivery', count: 0, suffix: '', highlight: false },
        { value: '24 hrs', label: 'Mockup turnaround', count: 24, suffix: ' hrs', highlight: false },
        { value: '$0', label: 'Art & setup fees', count: 0, suffix: '', highlight: true },
      ],
    }),
    b('marquee', {
      items: [
        'Travel Teams',
        'High School Programs',
        'Rec Leagues',
        'Showcase Clubs',
        'Adult Leagues',
      ],
      speed: 28,
    }),
    b('featuredTiles', {
      heading: 'Featured Items',
      align: 'center',
      tiles: [
        {
          eyebrow: 'Rolling',
          title: 'Bat Bags',
          links: ['Shop now'],
          image: '/media/tile-bags.png',
          href: '/collections/bags',
          align: 'left',
        },
        {
          eyebrow: 'Custom',
          title: 'Softball',
          links: ['Design now'],
          image: '/media/tile-softball.png',
          href: '/collections/softball',
          align: 'right',
        },
        {
          eyebrow: 'New',
          title: 'Full Sub Jerseys',
          links: ['Baseball', 'Softball', 'More'],
          image: '/media/tile-jerseys.png',
          href: '/collections/shirts',
          align: 'left',
        },
        {
          eyebrow: 'Shop',
          title: 'Team Packages',
          links: ['Alpha', 'Deal 1', 'Deal 2', 'Deal 3'],
          image: '/media/tile-packages.png',
          href: '/team-packages',
          align: 'left',
        },
      ],
    }),
    b('tileGroups', {
      groups: [
        {
          heading: 'For Teams',
          tiles: [
            {
              eyebrow: '',
              title: 'Custom Uniforms',
              links: ['Mens', 'Womens', 'Boys', 'Girls'],
              image: '/media/tile-uniforms.png',
              href: '/collections/shirts',
              align: 'left',
            },
            {
              eyebrow: '',
              title: 'Custom Apparel',
              links: ['Hoodies', 'Pullovers', 'Polos'],
              image: '/media/tile-apparel.png',
              href: '/collections/jackets',
              align: 'left',
            },
            {
              eyebrow: '',
              title: 'Custom Bags',
              links: ['Bat Bags', 'Catcher Bags'],
              image: '/media/tile-bags.png',
              href: '/collections/bags',
              align: 'left',
            },
            {
              eyebrow: '',
              title: 'Custom Pants',
              links: ['Full Sub', 'Stock', 'Shorts'],
              image: '/media/tile-pants.png',
              href: '/collections/pants',
              align: 'left',
            },
          ],
        },
        {
          heading: 'For Players',
          tiles: [
            {
              eyebrow: '',
              title: 'Jerseys',
              links: ['Crew', '2-Button', 'Button-Up'],
              image: '/media/tile-jerseys.png',
              href: '/collections/shirts',
              align: 'left',
            },
            {
              eyebrow: '',
              title: 'Hoodies',
              links: ['Fleece', 'Windbreaker'],
              image: '/media/tile-apparel.png',
              href: '/collections/jackets',
              align: 'left',
            },
            {
              eyebrow: '',
              title: 'Sweatpants',
              links: ['Full Sub', 'Team Colors'],
              image: '/media/tile-pants.png',
              href: '/collections/pants',
              align: 'left',
            },
            {
              eyebrow: '',
              title: 'Softball Kits',
              links: ['Uniforms', 'Pants', 'Tops'],
              image: '/media/tile-softball.png',
              href: '/collections/softball',
              align: 'left',
            },
          ],
        },
      ],
    }),
    b('categoryCards', {
      eyebrow: 'By sport',
      heading: 'Explore categories',
      cards: [
        {
          title: 'Softball',
          body: 'Built for the circle and the box',
          image: '/media/cat-softball.png',
          href: '/collections/softball',
          linkLabel: 'Explore softball',
        },
        {
          title: 'Baseball',
          body: 'Moisture-wicking, game-ready',
          image: '/media/cat-baseball.png',
          href: '/collections/baseball',
          linkLabel: 'Explore baseball',
        },
      ],
    }),
    b('packagesGrid', {
      eyebrow: 'Team packages',
      heading: 'Kit the whole roster',
      body: '',
      background: 'surface',
      limit: 4,
    }),
    b('productGrid', {
      heading: 'Items you might like',
      align: 'center',
      source: 'featured',
      collectionHandle: '',
      handles: [],
      limit: 4,
      cardStyle: 'plate',
      ctaLabel: 'Shop all products',
      ctaHref: '/collections',
      background: 'white',
    }),
    b('steps', {
      eyebrow: 'How it works',
      heading: 'Four steps to kit-out your team',
      background: 'white',
      steps: [
        {
          title: 'Send your idea',
          icon: 'chat',
          body: 'Roster size, sport and any logo or colors you already have. Two minutes on the quote form.',
        },
        {
          title: 'Free mockup in 24h',
          icon: 'clock',
          body: 'Our art team designs your kit and sends a firm per-unit price. Revisions are free.',
        },
        {
          title: 'Approve & we build',
          icon: 'check',
          body: 'Sublimation, cut and sew in 3–4 weeks — or 2 weeks on a rush order.',
        },
        {
          title: 'Delivered as a team',
          icon: 'truck',
          body: 'Bagged and labeled by player name, shipped anywhere in the US.',
        },
      ],
    }),
    b('iconFeatures', {
      heading: '',
      background: 'white',
      items: [
        {
          title: 'No art or setup fees',
          icon: 'art',
          body: 'Design, revisions, names and numbers are all included.',
        },
        {
          title: '2-week rush build',
          icon: 'rush',
          body: 'Need it for a tournament? We can compress the build.',
        },
        {
          title: 'Built in-house',
          icon: 'factory',
          body: 'Sublimation, cut and sew under one roof — one point of contact.',
        },
        {
          title: 'Reorders on file',
          icon: 'reorder',
          body: 'Add a player mid-season and it matches the original kit.',
        },
      ],
    }),
    b('reviews', {
      eyebrow: 'Reviews',
      heading: 'Here is what our community says',
      ratingLine: '4.9 average from 1,000+ teams across softball & baseball',
      speed: 46,
      limit: 12,
    }),
    b('faq', {
      eyebrow: 'FAQ',
      heading: 'Questions, answered',
      group: 'home',
      footerText: 'Still have a question?',
      footerCta: 'Ask our team →',
      background: 'surface',
    }),
    b('ctaBand', {
      heading: 'Season starts sooner than you think',
      body: 'Send us your roster and we will have a free mockup and a firm per-unit price back to you within 24 hours.',
      image: '/media/cta-dugout.png',
      primary: [{ label: 'Request a quote', href: '#quote' }],
      secondary: [{ label: 'Call the team', href: 'tel:+19592419213' }],
    }),
  ];
}

function packagesBlocks() {
  return [
    b('pageHeader', {
      theme: 'dark',
      eyebrow: 'Team packages',
      heading: 'Kit the whole roster',
      body: 'Per-player bundles that cover the season. Every package is fully customizable and quoted with no deposit.',
      showBreadcrumb: true,
      image: '',
    }),
    b('packagesGrid', {
      eyebrow: '',
      heading: '',
      body: '',
      background: 'white',
      limit: 8,
    }),
    b('iconFeatures', {
      heading: 'Every package includes',
      background: 'surface',
      items: [
        {
          title: 'Free 24h mockup',
          icon: 'clock',
          body: 'See the whole kit before you commit a cent.',
        },
        {
          title: 'Names & numbers',
          icon: 'art',
          body: 'Player names, numbers and sponsor marks at no extra charge.',
        },
        {
          title: 'Bagged by player',
          icon: 'truck',
          body: 'Delivered labelled per player so handout takes minutes.',
        },
        {
          title: 'Reorders on file',
          icon: 'reorder',
          body: 'Add a player mid-season and it matches exactly.',
        },
      ],
    }),
    b('faq', {
      eyebrow: 'FAQ',
      heading: 'Package questions',
      group: 'home',
      footerText: 'Want a package built around your budget?',
      footerCta: 'Ask our team →',
      background: 'white',
    }),
    b('ctaBand', {
      heading: 'Tell us the roster, we will price the season',
      body: 'Send the number of players and your sport — we will come back with a per-player price and a mockup within 24 hours.',
      image: '/media/cta-dugout.png',
      primary: [{ label: 'Request a quote', href: '#quote' }],
      secondary: [{ label: 'Call the team', href: 'tel:+19592419213' }],
    }),
  ];
}

function contactBlocks() {
  return [
    b('pageHeader', {
      theme: 'light',
      eyebrow: 'Contact',
      heading: 'Talk to a real person',
      body: 'Questions about sizing, fabric, artwork or timelines? Send a message and we will get back to you within one business day.',
      showBreadcrumb: true,
      image: '',
    }),
    b('contactForm', {
      eyebrow: '',
      heading: 'Send us a message',
      body: 'For pricing, use the quote form instead — it gets you a mockup and a firm per-unit price in 24 hours.',
      successTitle: 'Message sent',
      successBody: 'Thanks — we will reply to your email within one business day.',
      showQuoteCta: true,
      background: 'white',
      hours: [
        { days: 'Monday – Friday', time: '9:00 – 17:00 EST' },
        { days: 'Saturday', time: '10:00 – 14:00 EST' },
        { days: 'Sunday', time: 'Closed' },
      ],
    }),
    b('mapEmbed', {
      heading: 'Find the shop',
      height: 420,
      src: 'https://www.google.com/maps?q=1601+Main+St,+Springfield,+Massachusetts+01103&output=embed',
      background: 'surface',
    }),
    b('faq', {
      eyebrow: 'FAQ',
      heading: 'Before you write',
      group: 'contact',
      footerText: 'Still not sure?',
      footerCta: 'Ask our team →',
      background: 'white',
    }),
  ];
}

function collectionsPageBlocks() {
  return [
    b('collectionList', {
      eyebrow: 'Shop by category',
      heading: 'Browse the collections',
      limit: 12,
      background: 'surface',
    }),
    b('quoteCallout', {
      big: '24h',
      heading: 'See your kit before you commit',
      body: 'Free unlimited revisions until the design is exactly what your team wants.',
      ctaLabel: 'Get my free mockup',
      subject: 'Custom team kit',
    }),
    b('faq', {
      eyebrow: 'FAQ',
      heading: 'Questions, answered',
      group: 'home',
      footerText: 'Still have a question?',
      footerCta: 'Ask our team →',
      background: 'white',
    }),
  ];
}

function productExtrasBlocks() {
  return [
    b('gallery', {
      eyebrow: 'On the field',
      heading: 'Teams wearing it now',
      height: 260,
      background: 'white',
      images: [
        { image: '/media/lookbook-1.png', alt: 'Team in custom jerseys' },
        { image: '/media/lookbook-2.png', alt: 'Player at bat' },
        { image: '/media/lookbook-3.png', alt: 'Dugout huddle' },
        { image: '/media/lookbook-4.png', alt: 'Team photo' },
      ],
    }),
    b('faq', {
      eyebrow: 'FAQ',
      heading: 'Ordering questions',
      group: 'product',
      footerText: 'Something specific to your team?',
      footerCta: 'Ask our team →',
      background: 'white',
    }),
  ];
}

function simplePage(heading: string, eyebrow: string, body: string) {
  return [
    b('pageHeader', {
      theme: 'light',
      eyebrow,
      heading,
      body: '',
      showBreadcrumb: true,
      image: '',
    }),
    b('richText', {
      eyebrow: '',
      heading: '',
      body,
      align: 'left',
      width: 'narrow',
      background: 'white',
    }),
    b('ctaBand', {
      heading: 'Ready when you are',
      body: 'Free mockup in 24 hours, no deposit and no obligation.',
      image: '/media/cta-dugout.png',
      primary: [{ label: 'Request a quote', href: '#quote' }],
      secondary: [{ label: 'Call the team', href: 'tel:+19592419213' }],
    }),
  ];
}

// ------------------------------------------------------------------ run

async function main() {
  console.log('Seeding Design Sportswear…');

  // ---------------------------------------------------------- admin user
  const email = (process.env.ADMIN_EMAIL || 'admin@design-sportswear.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Site Admin', passwordHash, role: 'ADMIN' },
    update: { role: 'ADMIN' },
  });
  console.log(`  admin: ${email}`);

  // ---------------------------------------------------------- settings
  await prisma.setting.upsert({
    where: { key: 'site' },
    create: {
      key: 'site',
      value: {
        logoDark: '/brand/logo-black.png',
        logoLight: '/brand/logo-white.png',
      },
    },
    update: {},
  });

  // ---------------------------------------------------------- collections
  const collectionIds: Record<string, string> = {};
  for (const c of COLLECTIONS) {
    const row = await prisma.collection.upsert({
      where: { handle: c.handle },
      create: { ...c, status: 'PUBLISHED', showInNav: true, blocks: [] },
      update: {
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        bannerUrl: c.bannerUrl,
        thumbUrl: c.thumbUrl,
        position: c.position,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
      },
    });
    collectionIds[c.handle] = row.id;
  }
  console.log(`  collections: ${COLLECTIONS.length}`);

  // ---------------------------------------------------------- products
  for (const [i, p] of PRODUCTS.entries()) {
    const row = await prisma.product.upsert({
      where: { handle: p.handle },
      create: {
        handle: p.handle,
        title: p.title,
        description: p.description,
        basePrice: p.price,
        badge: p.badge,
        categoryLabel: categoryLabel(p.cat),
        status: 'PUBLISHED',
        featured: Boolean(p.featured),
        position: i,
        sports: SPORTS,
        colorways: COLORWAYS,
        sizes: SIZES,
        defaultQty: { S: 2, M: 4, L: 4, XL: 2 },
        volumeTiers: TIERS,
        specs: SPECS,
        trustPoints: TRUST,
        seoTitle: `${p.title} — custom team kit`,
        seoDescription: p.description.slice(0, 155),
      },
      update: {
        title: p.title,
        description: p.description,
        basePrice: p.price,
        badge: p.badge,
        categoryLabel: categoryLabel(p.cat),
        featured: Boolean(p.featured),
        position: i,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: row.id } });
    await prisma.productImage.createMany({
      data: p.images.map((img, j) => ({
        productId: row.id,
        url: `/media/${img}.png`,
        alt: `${p.title} — view ${j + 1}`,
        position: j,
      })),
    });

    const handles = [p.cat, ...(p.extra ?? [])];
    await prisma.productCollection.deleteMany({ where: { productId: row.id } });
    await prisma.productCollection.createMany({
      data: handles
        .filter((h) => collectionIds[h])
        .map((h, j) => ({ productId: row.id, collectionId: collectionIds[h], position: j })),
      skipDuplicates: true,
    });
  }
  console.log(`  products: ${PRODUCTS.length}`);

  // ---------------------------------------------------------- packages
  const PACKAGES = [
    {
      handle: 'package-alpha',
      tag: 'Package Alpha',
      name: 'The full program',
      price: 470,
      note: 'With rolling bag $500',
      items: [
        '3 full sub jerseys',
        '3 full sub pants',
        'Fleece hoodie + cage jacket',
        'Bat bag, socks, belts, visors',
      ],
      imageUrl: '/media/pkg-alpha.png',
      highlight: true,
      position: 0,
    },
    {
      handle: 'deal-1',
      tag: 'Deal 1',
      name: 'Tournament ready',
      price: 350,
      note: 'With rolling bag $390',
      items: [
        '2 full sub jerseys',
        '2 full sub pants',
        '1 full sub hoodie',
        'Bat bag, towel, visors, socks, belts',
      ],
      imageUrl: '/media/pkg-1.png',
      highlight: false,
      position: 1,
    },
    {
      handle: 'deal-2',
      tag: 'Deal 2',
      name: 'Season starter',
      price: 285,
      note: '',
      items: [
        '3 full sub jerseys',
        '2 full sub pants',
        '1 full sub hoodie',
        'Socks, belts, visors, towel',
      ],
      imageUrl: '/media/pkg-2.png',
      highlight: false,
      position: 2,
    },
    {
      handle: 'deal-3',
      tag: 'Deal 3',
      name: 'Core three',
      price: 210,
      note: '',
      items: ['3 full sub jerseys', '2 full sub pants', '1 full sub hoodie'],
      imageUrl: '/media/pkg-3.png',
      highlight: false,
      position: 3,
    },
  ];

  for (const pk of PACKAGES) {
    await prisma.teamPackage.upsert({
      where: { handle: pk.handle },
      create: { ...pk, status: 'PUBLISHED' },
      update: pk,
    });
  }
  console.log(`  packages: ${PACKAGES.length}`);

  // ---------------------------------------------------------- reviews
  const REVIEWS = [
    {
      text: 'Customer service is top notch. The uniforms were great quality and our order was perfect when we got it in.',
      name: 'Pam Benedict',
      role: 'Travel team coach',
      initials: 'PB',
    },
    {
      text: 'Great quality, quick shipping and awesome designs. This place does it all for a fraction of the price.',
      name: 'Wayne Congrove II',
      role: 'League director',
      initials: 'WC',
    },
    {
      text: 'Flexible and they can bring every vision you could imagine to life. Get your uniforms and apparel here.',
      name: 'Zateashma Blue',
      role: 'Team parent',
      initials: 'ZB',
    },
    {
      text: 'Turnaround was faster than promised and the sublimation colors are exactly what we sent. Reordering for next season.',
      name: 'Marcus Reyes',
      role: 'High school HC',
      initials: 'MR',
    },
    {
      text: 'The mockup came back in a day and nailed our logo first try. Whole roster looked pro on opening day.',
      name: 'Danielle Ford',
      role: 'Softball coach',
      initials: 'DF',
    },
    {
      text: 'No art fees, names and numbers included, and the fabric holds up all season. Best value we have found.',
      name: 'Tyler Okafor',
      role: 'Club manager',
      initials: 'TO',
    },
  ];

  if ((await prisma.review.count()) === 0) {
    await prisma.review.createMany({
      data: REVIEWS.map((r, i) => ({ ...r, rating: 5, published: true, position: i })),
    });
  }
  console.log(`  reviews: ${REVIEWS.length}`);

  // ---------------------------------------------------------- FAQs
  const FAQS = [
    {
      group: 'home',
      question: 'How much does a custom uniform cost?',
      answer:
        'Jerseys start at $30 and full per-player packages start at $210. Your exact price depends on quantity, fabric and add-ons — we confirm it on a no-obligation quote within 24 hours.',
    },
    {
      group: 'home',
      question: 'Is there a minimum order?',
      answer:
        'Team pricing kicks in at 12 pieces. We still take smaller orders — they are just quoted individually so you always get a fair per-unit price.',
    },
    {
      group: 'home',
      question: 'How long does it take?',
      answer:
        'Standard turnaround is 3–4 weeks from artwork approval. Need it sooner? A 2-week rush is available for an added fee.',
    },
    {
      group: 'home',
      question: 'Do you charge art or setup fees?',
      answer:
        'Never. Design, unlimited colors, logos, player names and numbers, and revisions until you approve are all included in the price.',
    },
    {
      group: 'home',
      question: 'Can we reorder mid-season?',
      answer:
        'Yes — your artwork stays on file, so adding players or replacing a jersey later takes days and matches your kit exactly.',
    },
    {
      group: 'product',
      question: 'What if I do not have artwork yet?',
      answer:
        'Send a rough sketch, a photo of last season, or just your team colours. Our art team builds the design from scratch and you approve it before anything is printed.',
    },
    {
      group: 'product',
      question: 'Can I mix sizes across the roster?',
      answer:
        'Yes. Enter the size run above exactly as your roster needs it — youth small through adult 3XL can all appear on the same order at the same per-unit price.',
    },
    {
      group: 'product',
      question: 'How do I know it will fit?',
      answer:
        'Ask for a free sizing kit and we will ship samples before you commit, or send us your last order and we will match the size run.',
    },
    {
      group: 'contact',
      question: 'What is the fastest way to get a price?',
      answer:
        'Use the quote form rather than this contact form — it captures the roster and sport we need, and prices come back within 24 hours on business days.',
    },
    {
      group: 'contact',
      question: 'Can we visit the shop?',
      answer:
        'Yes, we are at 1601 Main St in Springfield, Massachusetts. Call ahead so someone from the art team is free to sit with you.',
    },
    {
      group: 'contact',
      question: 'Do you ship outside the US?',
      answer:
        'We ship nationwide as standard. For international orders, contact us first and we will quote shipping separately.',
    },
  ];

  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: FAQS.map((f, i) => ({ ...f, published: true, position: i })),
    });
  }
  console.log(`  faqs: ${FAQS.length}`);

  // ---------------------------------------------------------- pages
  const PAGES = [
    {
      slug: 'home',
      title: 'Home',
      isSystem: true,
      position: 0,
      blocks: homeBlocks(),
      seoTitle: 'Design Sportswear — Custom Baseball & Softball Uniforms',
      seoDescription:
        'Custom sublimated baseball and softball uniforms with a free digital mockup in 24 hours, 3–4 week turnaround and no art or setup fees.',
    },
    {
      slug: 'collections',
      title: 'Sportswear collection',
      isSystem: true,
      position: 1,
      blocks: collectionsPageBlocks(),
      seoTitle: 'Sportswear collection — custom uniforms, pants, jackets & bags',
      seoDescription:
        'Every piece is fully customizable — sublimated in-house, with names, numbers and logos included. Free mockup in 24 hours.',
    },
    {
      slug: 'team-packages',
      title: 'Team packages',
      isSystem: true,
      position: 2,
      blocks: packagesBlocks(),
      seoTitle: 'Team packages — per-player uniform bundles',
      seoDescription:
        'Per-player uniform packages from $210 that cover the whole season. Fully customizable and quoted with no deposit.',
    },
    {
      slug: 'product-extras',
      title: 'Product page sections',
      isSystem: true,
      position: 99,
      blocks: productExtrasBlocks(),
      seoTitle: '',
      seoDescription: '',
    },
    {
      slug: 'about',
      title: 'About us',
      isSystem: false,
      position: 3,
      showInNav: true,
      navLabel: 'About',
      blocks: aboutBlocks(),
      seoTitle: 'About Design Sportswear — custom uniforms built in-house',
      seoDescription:
        'A Springfield, Massachusetts shop designing, sublimating and sewing custom baseball and softball uniforms for over 1,000 programs a season.',
    },
    {
      slug: 'contact',
      title: 'Contact us',
      isSystem: false,
      position: 4,
      showInNav: true,
      navLabel: 'Contact',
      blocks: contactBlocks(),
      seoTitle: 'Contact Design Sportswear',
      seoDescription:
        'Call, email or message our Springfield, MA shop about custom baseball and softball uniforms. We reply within one business day.',
    },
    {
      slug: 'faqs',
      title: 'FAQs',
      isSystem: false,
      position: 5,
      blocks: [
        b('pageHeader', {
          theme: 'light',
          eyebrow: 'Help',
          heading: 'Frequently asked questions',
          body: 'Pricing, minimums, turnaround, sizing and reorders — the answers coaches ask for most.',
          showBreadcrumb: true,
          image: '',
        }),
        b('faq', {
          eyebrow: '',
          heading: 'Ordering & pricing',
          group: 'home',
          footerText: 'Still have a question?',
          footerCta: 'Ask our team →',
          background: 'white',
        }),
        b('faq', {
          eyebrow: '',
          heading: 'Artwork & sizing',
          group: 'product',
          footerText: '',
          footerCta: '',
          background: 'surface',
        }),
        b('ctaBand', {
          heading: 'Still deciding?',
          body: 'A free mockup costs nothing and answers most questions faster than we can.',
          image: '/media/cta-dugout.png',
          primary: [{ label: 'Request a quote', href: '#quote' }],
          secondary: [{ label: 'Call the team', href: 'tel:+19592419213' }],
        }),
      ],
      seoTitle: 'FAQs — custom uniform pricing, turnaround and sizing',
      seoDescription:
        'Answers on custom uniform pricing, 12-piece minimums, 3–4 week turnaround, art fees, sizing and mid-season reorders.',
    },
    {
      slug: 'track-order',
      title: 'Track your order',
      isSystem: false,
      position: 6,
      blocks: simplePage(
        'Track your order',
        'Order status',
        'Once your artwork is approved, we email a production start date and a tracking number as soon as the order ships.\n\nIf you need a status update before then, call **+1 (959) 241-9213** or email **info@design-sportswear.com** with your team name — we will tell you exactly where the order is on the floor.\n\nOrders ship bagged and labelled by player name, so handout at practice takes minutes.'
      ),
      seoTitle: 'Track your order',
      seoDescription:
        'Check the status of your custom uniform order, or contact the Design Sportswear shop for a production update.',
    },
    {
      slug: 'size-chart',
      title: 'Size chart',
      isSystem: false,
      position: 7,
      blocks: simplePage(
        'Size chart',
        'Sizing',
        'All garments are cut athletic and run true to size. Youth Small through Adult 3XL is available on every style.\n\n**Youth** — YS (6–8), YM (10–12), YL (14–16).\n**Adult** — S (34–36" chest), M (38–40"), L (42–44"), XL (46–48"), 2XL (50–52"), 3XL (54–56").\n\nNot sure? Ask for a **free sizing kit** and we will ship samples before you commit, or send us the size run from your last order and we will match it exactly.'
      ),
      seoTitle: 'Size chart — youth small to adult 3XL',
      seoDescription:
        'Sizing for custom baseball and softball uniforms, youth small through adult 3XL. Free sizing kits available on request.',
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy policy',
      isSystem: false,
      position: 8,
      blocks: simplePage(
        'Privacy policy',
        'Legal',
        'We collect only what we need to quote and fulfil your order: the contact details and roster information you send through our quote and contact forms, plus any artwork files you upload.\n\n**How we use it.** To prepare your mockup and quote, to produce and ship your order, and to contact you about it. We do not sell your information.\n\n**Artwork.** Files you send stay on file so mid-season reorders match your original kit. Ask us at any time to delete them.\n\n**Analytics.** We use standard web analytics to understand which pages help teams find what they need. You can opt out through your browser settings.\n\n**Your rights.** Email **info@design-sportswear.com** to ask what we hold about you, correct it, or have it deleted.\n\nThis page is a starting point — have it reviewed by your own counsel before launch.'
      ),
      seoTitle: 'Privacy policy',
      seoDescription: 'How Design Sportswear collects, uses and stores your information.',
    },
  ];

  for (const p of PAGES) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        blocks: p.blocks as unknown as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        isSystem: p.isSystem,
        showInNav: 'showInNav' in p ? Boolean(p.showInNav) : false,
        navLabel: 'navLabel' in p ? (p.navLabel as string) : null,
        position: p.position,
        seoTitle: p.seoTitle || null,
        seoDescription: p.seoDescription || null,
      },
      update: {
        title: p.title,
        blocks: p.blocks as unknown as Prisma.InputJsonValue,
        seoTitle: p.seoTitle || null,
        seoDescription: p.seoDescription || null,
      },
    });
  }
  console.log(`  pages: ${PAGES.length}`);

  // ---------------------------------------------------------- navigation
  const NAV = [
    { menu: 'header', label: 'Home', href: '/' },
    { menu: 'header', label: 'Collections', href: '/collections' },
    { menu: 'header', label: 'Team Packages', href: '/team-packages' },
    { menu: 'header', label: 'About', href: '/about' },
    { menu: 'header', label: 'Contact', href: '/contact' },
    { menu: 'footer_shop', label: 'Shirts & jerseys', href: '/collections/shirts' },
    { menu: 'footer_shop', label: 'Pants & shorts', href: '/collections/pants' },
    { menu: 'footer_shop', label: 'Jackets & hoodies', href: '/collections/jackets' },
    { menu: 'footer_shop', label: 'Bags', href: '/collections/bags' },
    { menu: 'footer_shop', label: 'Team packages', href: '/team-packages' },
    { menu: 'footer_company', label: 'About us', href: '/about' },
    { menu: 'footer_company', label: 'FAQs', href: '/faqs' },
    { menu: 'footer_company', label: 'Contact', href: '/contact' },
    { menu: 'footer_company', label: 'Track order', href: '/track-order' },
    { menu: 'footer_company', label: 'Privacy policy', href: '/privacy-policy' },
  ];

  if ((await prisma.navItem.count()) === 0) {
    await prisma.navItem.createMany({
      data: NAV.map((n, i) => ({ ...n, position: i, newTab: false })),
    });
  }
  console.log(`  nav items: ${NAV.length}`);

  console.log('\nDone. Sign in at /admin/login');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
