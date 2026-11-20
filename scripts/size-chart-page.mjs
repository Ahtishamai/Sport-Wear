/**
 * Puts the client's size chart on the site and in the menu.
 *
 *   1. /size-chart becomes the chart the client sent: adult S–5XL and youth
 *      YXS–YXL measurements as tables (the "Size chart" page-builder
 *      section, figures in src/lib/size-chart.ts), with the chart picture.
 *      Its old text, which gave chest ranges and no YXL, is kept in the page
 *      builder's history.
 *   2. The header menu gains "Size Chart", linking to it.
 *
 * Product pages show the same chart at their foot by themselves (code, not
 * data). Each step runs once, by its own marker in settings, so later edits
 * in the admin are never undone.
 *
 *   node -r dotenv/config scripts/size-chart-page.mjs            (look)
 *   node -r dotenv/config scripts/size-chart-page.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const id = () => 'b_' + randomBytes(5).toString('hex');
let changed = false;

const BLOCKS = () => [
  {
    id: id(),
    type: 'pageHeader',
    props: {
      theme: 'light',
      eyebrow: 'Sizing',
      heading: 'Size chart',
      body: 'Find the right size before you order. Measure a T-shirt or jersey that fits well, lay it flat, and compare it with the chart below. Youth and adult sizes can be mixed on one order.',
      showBreadcrumb: true,
      image: '',
    },
  },
  {
    id: id(),
    type: 'sizeChart',
    props: {
      heading: 'T-shirt & jersey sizes',
      anchor: 'size-chart',
      intro: 'Adult S to 5XL and youth XS to XL. A is the length from the centre back, C is the chest from armpit to armpit, and D is the sleeve length.',
      showImage: true,
      background: 'white',
    },
  },
];

async function once(key, label, run) {
  if (await db.setting.findUnique({ where: { key } })) {
    console.log(`  ${label}: already done — left as it is`);
    return;
  }
  const did = await run();
  if (apply) {
    await db.setting.create({ data: { key, value: { doneAt: new Date().toISOString() } } });
    if (did) changed = true;
  }
}

try {
  console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');

  await once('task:size-chart-page', '/size-chart', async () => {
    const page = await db.page.findUnique({ where: { slug: 'size-chart' }, select: { id: true, blocks: true } });
    console.log(`  ${apply ? '' : 'would '}${page ? 'replace' : 'create'} /size-chart with the client's chart`);
    if (!apply) return false;
    const blocks = BLOCKS();
    const seo = {
      seoTitle: 'Size Chart — Adult & Youth T-Shirt and Jersey Sizes',
      seoDescription:
        'Design Sportswear size chart: adult S to 5XL and youth XS to XL, with length, chest and sleeve measurements in inches for T-shirts and jerseys.',
    };
    if (page) {
      await db.pageRevision.create({
        data: { pageId: page.id, blocks: page.blocks, label: 'Before the client’s size chart' },
      });
      await db.page.update({ where: { id: page.id }, data: { blocks, status: 'PUBLISHED', ...seo } });
    } else {
      await db.page.create({
        data: { slug: 'size-chart', title: 'Size chart', blocks, status: 'PUBLISHED', ...seo },
      });
    }
    return true;
  });

  await once('task:size-chart-in-menu', 'header menu', async () => {
    const items = await db.navItem.findMany({ where: { menu: 'header' }, orderBy: { position: 'asc' } });
    if (items.some((n) => n.href.replace(/\/+$/, '') === '/size-chart')) {
      console.log('  the header menu already links to /size-chart');
      return false;
    }
    console.log(`  ${apply ? '' : 'would '}add "Size Chart" to the end of the header menu`);
    if (!apply) return false;
    const last = items.at(-1)?.position ?? -1;
    await db.navItem.create({
      data: { menu: 'header', label: 'Size Chart', href: '/size-chart', position: last + 1 },
    });
    return true;
  });

  if (changed) console.log('DATA_CHANGED');
} finally {
  await db.$disconnect();
}
