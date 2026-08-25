/**
 * About Us page content, laid out as builder blocks.
 * Kept separate from seed.ts so it can be re-applied on its own:
 *   npx tsx prisma/about-page.ts
 */
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

let seq = 0;
const b = (type: string, props: Record<string, unknown>) => ({
  id: `b_about_${(seq++).toString(36).padStart(3, '0')}`,
  type,
  props,
});

export function aboutBlocks() {
  seq = 0;
  return [
    // ---------------------------------------------------------- intro
    b('pageHeader', {
      theme: 'dark',
      eyebrow: 'About us',
      heading: 'Built for Performance. Crafted for Champions.',
      body: 'At Design Sportswear, we believe every uniform tells a story. It represents a team’s identity, commitment, and passion for the game — which is why we build premium custom sportswear that looks exceptional and performs at the highest level.',
      showBreadcrumb: true,
      image: '',
    }),

    b('imageText', {
      image: '/media/about-workshop.png',
      side: 'left',
      background: 'white',
      eyebrow: 'Who we are',
      heading: 'Eight years of outfitting teams',
      body: 'For over 8 years we have partnered with youth organizations, schools, travel teams, colleges and competitive clubs to deliver custom baseball, softball and team apparel that combines **innovative design, premium craftsmanship, and unmatched comfort**.\n\nEvery project begins with your vision. Our experienced design team turns ideas into professional custom uniforms through free design mockups, unlimited revisions and personalized support — from first concept to final delivery.\n\nToday, Design Sportswear proudly serves teams across North America, helping thousands of athletes compete with confidence in uniforms designed specifically for them.',
      bullets: [
        'FREE professional design mockups on every order',
        'Unlimited revisions until you approve',
        'Serving teams across North America',
      ],
      cta: [{ label: 'Start your design', href: '#quote' }],
    }),

    // ---------------------------------------------------------- numbers
    b('numbersGrid', {
      eyebrow: 'By the numbers',
      heading: 'The short version',
      body: '',
      align: 'center',
      background: 'ink',
      minWidth: 210,
      items: [
        { value: '8+', label: 'Years of industry experience', count: 0, suffix: '' },
        { value: '1,000+', label: 'Happy customers', count: 1000, suffix: '+' },
        { value: '50+', label: 'Premium sportswear products', count: 50, suffix: '+' },
        { value: '100%', label: 'Custom designs', count: 0, suffix: '' },
        { value: 'FREE', label: 'Professional design mockups', count: 0, suffix: '' },
        { value: '∞', label: 'Unlimited design revisions', count: 0, suffix: '' },
        { value: '3–4 wks', label: 'Standard production', count: 0, suffix: '' },
        { value: '2 wks', label: 'Rush service available', count: 0, suffix: '' },
      ],
    }),

    // ---------------------------------------------------------- story
    b('richText', {
      eyebrow: 'Our story',
      heading: 'From a passion for the game to a trusted partner',
      body: 'What started as a passion for sports and design has grown into a trusted custom sportswear company serving organizations of every size.\n\nWe recognized that teams deserved more than generic uniforms — they deserved apparel that represented **who they are**. By combining creativity, premium materials and exceptional customer service, we built a company focused on delivering uniforms athletes are proud to wear.\n\nAs we continue to grow, our commitment remains the same: outstanding products, honest service, and an experience that exceeds expectations from start to finish.',
      align: 'left',
      width: 'narrow',
      background: 'white',
    }),

    // ---------------------------------------------------------- mission & vision
    b('iconFeatures', {
      eyebrow: 'What drives us',
      heading: 'Our mission and vision',
      body: '',
      size: 'large',
      align: 'center',
      background: 'surface',
      items: [
        {
          title: 'Our mission',
          icon: 'target',
          body: 'To empower athletes and organizations through premium custom sportswear that inspires confidence, strengthens team identity and enhances performance. We deliver innovative designs, superior craftsmanship and reliable production while keeping premium quality accessible to teams of every level — so every customer looks professional, plays confidently and represents their organization with pride.',
        },
        {
          title: 'Our vision',
          icon: 'eye',
          body: 'To become one of the world’s leading custom sportswear brands, recognized for innovation, quality and customer satisfaction. We aim to set new industry standards by continually improving our products, expanding our services, embracing sustainable manufacturing and creating custom apparel athletes trust for years to come.',
        },
      ],
    }),

    // ---------------------------------------------------------- core values
    b('iconFeatures', {
      eyebrow: 'Our core values',
      heading: 'The five things we will not compromise on',
      body: '',
      size: 'standard',
      align: 'center',
      background: 'white',
      items: [
        {
          title: 'Quality',
          icon: 'gem',
          body: 'Excellence begins with quality. Every product uses premium fabrics, advanced sublimation technology and strict quality control for outstanding durability and comfort.',
        },
        {
          title: 'Integrity',
          icon: 'handshake',
          body: 'We build lasting relationships through honesty, transparency and dependable service. Every customer deserves clear communication and a partner they can trust.',
        },
        {
          title: 'Innovation',
          icon: 'lightbulb',
          body: 'We constantly explore new materials, modern designs and advanced production techniques to deliver sportswear that performs as well as it looks.',
        },
        {
          title: 'Customer commitment',
          icon: 'heart',
          body: 'Our customers are at the centre of everything we do. From first enquiry to final delivery, we provide a seamless, professional and enjoyable experience.',
        },
        {
          title: 'Teamwork',
          icon: 'users',
          body: 'Sports unite people, and we bring that same spirit to our business — working with coaches, organizations and athletes to bring every vision to life.',
        },
      ],
    }),

    // ---------------------------------------------------------- why choose us
    b('iconFeatures', {
      eyebrow: 'Why choose us',
      heading: 'Why teams choose Design Sportswear',
      body: 'With over 8 years of experience, we have become a trusted name in custom sportswear by consistently delivering premium products and exceptional service.',
      size: 'standard',
      align: 'center',
      background: 'surface',
      items: [
        {
          title: '100% positive customer reviews',
          icon: 'star',
          body: 'Our reputation is built on customers who recommend us season after season — a reflection of our quality, reliability and customer care.',
        },
        {
          title: 'FREE professional mockups',
          icon: 'palette',
          body: 'Every order includes professionally designed digital mockups at no cost. Review your uniforms before production and request unlimited revisions.',
        },
        {
          title: 'Premium performance apparel',
          icon: 'shirt',
          body: 'Lightweight, breathable, moisture-wicking performance fabrics that give superior comfort, flexibility and durability through every game.',
        },
        {
          title: '100% custom designs',
          icon: 'pencil',
          body: 'Customize colours, logos, player names, numbers, fonts and graphics to create a completely unique identity for your team.',
        },
        {
          title: 'Superior craftsmanship',
          icon: 'award',
          body: 'Advanced dye-sublimation printing and premium materials keep colours vibrant without cracking, peeling or fading.',
        },
        {
          title: 'Fast, reliable turnaround',
          icon: 'rush',
          body: 'A streamlined production process gives a 3–4 week standard turnaround, with 2-week rush production available for urgent orders.',
        },
        {
          title: 'Exceptional customer service',
          icon: 'chat',
          body: 'A dedicated support team providing timely communication, expert advice and personalized assistance throughout the ordering process.',
        },
        {
          title: 'Experience you can trust',
          icon: 'shield',
          body: 'Eight years of delivering premium products and dependable service to organizations of every size.',
        },
      ],
    }),

    // ---------------------------------------------------------- differentiator
    b('imageText', {
      image: '/media/lookbook-3.png',
      side: 'right',
      background: 'white',
      eyebrow: 'What makes us different',
      heading: 'We do not just make uniforms — we build identity',
      body: 'At Design Sportswear, we don’t simply manufacture uniforms — we help organizations build a professional identity.\n\nOur combination of premium materials, experienced designers, reliable production, competitive pricing and customer-first service has made us the preferred choice for teams looking for **quality without compromise**.\n\nWhen you choose Design Sportswear, you’re choosing a company that values your success as much as you do.',
      bullets: [
        'Premium materials and experienced designers',
        'Reliable production and competitive pricing',
        'Customer-first service from enquiry to delivery',
      ],
      cta: [{ label: 'Request a quote', href: '#quote' }],
    }),

    // ---------------------------------------------------------- promise
    b('iconFeatures', {
      eyebrow: 'Our promise',
      heading: 'What every order comes with',
      body: 'Every uniform we produce reflects our commitment to excellence. Whether you order for a single team or an entire organization, we promise a finished product your athletes will be proud to wear.',
      size: 'compact',
      align: 'center',
      background: 'ink',
      items: [
        { title: 'Premium quality', icon: 'gem', body: 'Premium fabrics and strict quality control on every garment.' },
        { title: 'Personalized service', icon: 'heart', body: 'A real person who knows your order from start to finish.' },
        { title: 'Dependable production', icon: 'factory', body: 'Realistic timelines that we hold ourselves to.' },
        { title: 'Pride on the field', icon: 'award', body: 'A finished kit your athletes are proud to wear.' },
      ],
    }),

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

    b('reviews', {
      eyebrow: 'Reviews',
      heading: 'What coaches say',
      ratingLine: '4.9 average from 1,000+ teams across softball & baseball',
      speed: 46,
      limit: 12,
    }),

    b('ctaBand', {
      heading: 'Built for Performance. Designed for Champions. Trusted by Teams.',
      body: 'Tell us your sport and roster size — a free mockup and a firm per-unit price come back within 24 hours, with no deposit and no obligation.',
      image: '/media/cta-dugout.png',
      primary: [{ label: 'Request a quote', href: '#quote' }],
      secondary: [{ label: 'Call the team', href: 'tel:+19592419213' }],
    }),
  ];
}

async function main() {
  const blocks = aboutBlocks();
  await prisma.page.upsert({
    where: { slug: 'about' },
    create: {
      slug: 'about',
      title: 'About us',
      blocks: blocks as unknown as Prisma.InputJsonValue,
      status: 'PUBLISHED',
      isSystem: false,
      showInNav: true,
      navLabel: 'About',
      position: 3,
      seoTitle: 'About Design Sportswear — custom uniforms built for performance',
      seoDescription:
        'For over 8 years Design Sportswear has built premium custom baseball and softball uniforms — free mockups, unlimited revisions and 1,000+ happy customers.',
    },
    update: {
      title: 'About us',
      blocks: blocks as unknown as Prisma.InputJsonValue,
      seoTitle: 'About Design Sportswear — custom uniforms built for performance',
      seoDescription:
        'For over 8 years Design Sportswear has built premium custom baseball and softball uniforms — free mockups, unlimited revisions and 1,000+ happy customers.',
    },
  });
  console.log(`About page updated — ${blocks.length} sections.`);
}

if (process.argv[1]?.includes('about-page')) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
