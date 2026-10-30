/**
 * Puts the shirts back into the Baseball shirts and Softball shirts
 * collections.
 *
 * Both collections were emptied by accident on 2026-10-30, and they are what
 * the home page's two shirt cards point at. The shirts are the products
 * carrying the shirt price list ($50 for one down to $20 past twenty), which
 * is exactly the set that was in them.
 *
 * Only missing links are added; a product already in a collection is left
 * alone, and nothing is ever removed, so this is safe to run twice.
 *
 *   node -r dotenv/config scripts/refill-shirt-collections.mjs           # look
 *   node -r dotenv/config scripts/refill-shirt-collections.mjs --apply   # do it
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const TARGETS = ['baseball-shirts', 'softball-shirts'];

/** A product priced the way shirts are priced. */
function isShirt(tiers) {
  if (!Array.isArray(tiers) || tiers.length !== 7) return false;
  return Number(tiers[0]?.price) === 50 && Number(tiers[6]?.price) === 20;
}

try {
  const products = await prisma.product.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, volumeTiers: true },
  });
  const shirts = products.filter((p) => isShirt(p.volumeTiers));
  console.log(`${shirts.length} shirts to file.\n`);

  for (const handle of TARGETS) {
    const col = await prisma.collection.findUnique({
      where: { handle },
      select: { id: true, title: true },
    });
    if (!col) {
      console.log(`/${handle} is not there — skipping.`);
      continue;
    }
    const have = new Set(
      (await prisma.productCollection.findMany({
        where: { collectionId: col.id },
        select: { productId: true },
      })).map((r) => r.productId)
    );
    const missing = shirts.filter((p) => !have.has(p.id));
    console.log(`${col.title}: holds ${have.size}, ${APPLY ? 'adding' : 'would add'} ${missing.length}`);
    if (!APPLY || missing.length === 0) continue;
    await prisma.productCollection.createMany({
      data: missing.map((p, i) => ({ productId: p.id, collectionId: col.id, position: have.size + i })),
      skipDuplicates: true,
    });
  }

  console.log('');
  for (const handle of TARGETS) {
    const n = await prisma.productCollection.count({ where: { collection: { handle } } });
    console.log(`/${handle} now holds ${n} products.`);
  }
} finally {
  await prisma.$disconnect();
}
