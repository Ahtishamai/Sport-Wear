/**
 * Fills the Softball uniform and Baseball uniform collections with the
 * shirts, and points the category cards at them.
 *
 * The cards on the home page and on the Pinstripes uniform page still point
 * at collections that were deleted on 2026-10-30, so every one of them is a
 * dead link. They become two cards — softball and baseball — each keeping its
 * own picture, which is the shape asked for.
 *
 * Shirts are the products carrying the shirt price list ($50 for one down to
 * $20 past twenty). Nothing is removed from a collection and a product
 * already in one is left alone, so this is safe to run twice.
 *
 *   node -r dotenv/config scripts/point-cards-at-uniforms.mjs           # look
 *   node -r dotenv/config scripts/point-cards-at-uniforms.mjs --apply   # do it
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const say = (s) => console.log((APPLY ? '' : 'would ') + s);

const isShirt = (t) =>
  Array.isArray(t) && t.length === 7 && Number(t[0]?.price) === 50 && Number(t[6]?.price) === 20;

const CARDS = [
  {
    title: 'Softball uniform',
    body: 'Fully customizable tops — from $20 each',
    href: '/collections/softball-uniform',
    linkLabel: 'See softball uniforms',
  },
  {
    title: 'Baseball uniform',
    body: 'Fully customizable tops — from $20 each',
    href: '/collections/baseball-uniform',
    linkLabel: 'See baseball uniforms',
  },
];

/** The two cards, each keeping the picture the old card of that sport had. */
function rebuild(old) {
  const pick = (sport) =>
    old.find((c) => String(c.href || '').includes(sport))?.image ??
    old.find((c) => new RegExp(sport, 'i').test(String(c.title)))?.image ??
    old[0]?.image ??
    '';
  return [
    { ...CARDS[0], image: pick('softball') },
    { ...CARDS[1], image: pick('baseball') },
  ];
}

try {
  const shirts = (
    await prisma.product.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { title: 'asc' },
      select: { id: true, volumeTiers: true },
    })
  ).filter((p) => isShirt(p.volumeTiers));
  console.log(`${shirts.length} shirts to file\n`);

  for (const handle of ['softball-uniform', 'baseball-uniform']) {
    const col = await prisma.collection.findUnique({
      where: { handle },
      select: { id: true, title: true },
    });
    if (!col) {
      console.log(`/${handle} does not exist — skipping`);
      continue;
    }
    const have = new Set(
      (
        await prisma.productCollection.findMany({
          where: { collectionId: col.id },
          select: { productId: true },
        })
      ).map((r) => r.productId)
    );
    const missing = shirts.filter((p) => !have.has(p.id));
    say(`put ${missing.length} shirts into ${col.title} (it holds ${have.size})`);
    if (APPLY && missing.length) {
      await prisma.productCollection.createMany({
        data: missing.map((p, i) => ({ collectionId: col.id, productId: p.id, position: have.size + i })),
        skipDuplicates: true,
      });
    }
  }

  const col = await prisma.collection.findUnique({
    where: { handle: 'pinstripes' },
    select: { id: true, blocks: true },
  });
  const colBlocks = structuredClone(col?.blocks ?? []);
  const colCards = colBlocks.find((b) => b.type === 'categoryCards');
  if (colCards) {
    console.log('\nPinstripes uniform page:');
    for (const c of colCards.props.cards) console.log('  was  ' + String(c.title).padEnd(28) + c.href);
    colCards.props.cards = rebuild(colCards.props.cards);
    for (const c of colCards.props.cards) console.log('  now  ' + c.title.padEnd(28) + c.href);
    if (APPLY) await prisma.collection.update({ where: { id: col.id }, data: { blocks: colBlocks } });
  }

  const home = await prisma.page.findUnique({ where: { slug: 'home' }, select: { id: true, blocks: true } });
  const homeBlocks = structuredClone(home?.blocks ?? []);
  const homeCards = homeBlocks.find((b) => b.type === 'categoryCards');
  if (homeCards) {
    console.log('\nHome page:');
    for (const c of homeCards.props.cards) console.log('  was  ' + String(c.title).padEnd(28) + c.href);
    homeCards.props.cards = rebuild(homeCards.props.cards);
    for (const c of homeCards.props.cards) console.log('  now  ' + c.title.padEnd(28) + c.href);
    if (APPLY) await prisma.page.update({ where: { id: home.id }, data: { blocks: homeBlocks } });
  }

  console.log('\nwhere the cards lead:');
  for (const [where, blocks] of [['pinstripes', colBlocks], ['home', homeBlocks]]) {
    const cards = blocks.find((b) => b.type === 'categoryCards')?.props?.cards ?? [];
    for (const c of cards) {
      const h = String(c.href).replace('/collections/', '');
      const exists = await prisma.collection.findUnique({
        where: { handle: h },
        select: { status: true, _count: { select: { products: true } } },
      });
      console.log(
        `  ${where.padEnd(11)} ${String(c.title).padEnd(20)} ${c.href}  ` +
          (exists ? `${exists.status}, ${exists._count.products} products` : 'MISSING')
      );
    }
  }
} finally {
  await prisma.$disconnect();
}
