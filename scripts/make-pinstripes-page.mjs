/**
 * Turns the Pinstripes uniform collection into a page of its own at
 * /pinstripes.
 *
 * A collection page is a catalogue: a sidebar, filters and a grid of
 * products. What this one is really for is sending people to the softball
 * and the baseball uniforms, so it belongs on a page, where the two cards
 * are the whole point rather than something under a product grid.
 *
 * The page is built from the collection's own card section, so it looks
 * exactly as it does today, and it is added to the header menu. The
 * collection is left alone — nothing 404s — and can be archived in the admin
 * once the page is the one being linked to.
 *
 *   node -r dotenv/config scripts/make-pinstripes-page.mjs           # look
 *   node -r dotenv/config scripts/make-pinstripes-page.mjs --apply   # do it
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const say = (s) => console.log((APPLY ? '' : 'would ') + s);

const SLUG = 'pinstripes';
const blockId = () => 'b_' + Math.random().toString(36).slice(2, 10);

try {
  const col = await prisma.collection.findUnique({
    where: { handle: 'pinstripes' },
    select: { title: true, subtitle: true, description: true, bannerUrl: true, blocks: true,
              seoTitle: true, seoDescription: true },
  });
  if (!col) throw new Error('There is no /collections/pinstripes to build from.');

  const cards = (col.blocks ?? []).find((b) => b.type === 'categoryCards');
  if (!cards) throw new Error('That collection has no card section to move.');
  console.log(`${col.title}: ${cards.props.cards.length} cards`);
  for (const c of cards.props.cards) console.log('  ' + String(c.title).padEnd(22) + c.href);

  const blocks = [
    {
      id: blockId(),
      type: 'pageHeader',
      props: {
        theme: 'light',
        eyebrow: col.subtitle || 'Pinstripes',
        heading: col.title,
        body: col.description || 'Pinstripe tops for softball and baseball, cut and printed to your colors.',
        showBreadcrumb: true,
        image: col.bannerUrl || '',
      },
    },
    // The same section, with its own eyebrow dropped: the heading above says
    // where you are, and saying it twice reads like a mistake.
    { id: blockId(), type: 'categoryCards', props: { ...cards.props, eyebrow: '' } },
  ];

  const existing = await prisma.page.findUnique({ where: { slug: SLUG }, select: { id: true } });
  say(`${existing ? 'update' : 'create'} the page at /${SLUG} with ${blocks.length} sections`);
  if (APPLY) {
    if (existing) {
      await prisma.page.update({ where: { id: existing.id }, data: { blocks, title: col.title } });
    } else {
      await prisma.page.create({
        data: {
          slug: SLUG,
          title: col.title,
          blocks,
          status: 'PUBLISHED',
          showInNav: true,
          navLabel: 'Pinstripes',
          position: 40,
          seoTitle: col.seoTitle || col.title,
          seoDescription:
            col.seoDescription || 'Pinstripe softball and baseball uniforms, fully customizable.',
        },
      });
    }
  }

  // The header menu is its own list, so the page has to be added to it.
  const href = `/${SLUG}`;
  const inMenu = await prisma.navItem.findFirst({ where: { menu: 'header', href } });
  if (inMenu) {
    console.log(`"${inMenu.label}" already points at ${href} in the header menu`);
  } else {
    const last = await prisma.navItem.findFirst({
      where: { menu: 'header' },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    say(`add "Pinstripes" to the header menu, pointing at ${href}`);
    if (APPLY) {
      await prisma.navItem.create({
        data: { menu: 'header', label: 'Pinstripes', href, position: (last?.position ?? 0) + 1 },
      });
    }
  }

  const menu = await prisma.navItem.findMany({
    where: { menu: 'header' },
    orderBy: { position: 'asc' },
    select: { label: true, href: true },
  });
  console.log('\nheader menu' + (APPLY ? '' : ' (before)') + ':');
  for (const m of menu) console.log('  ' + m.label.padEnd(16) + m.href);
} finally {
  await prisma.$disconnect();
}
