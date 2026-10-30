/**
 * Puts products into a collection from the command line.
 *
 * The menu and the sidebar leave out a collection that holds nothing, since a
 * link to an empty page is worse than no link, so this is the quick way to
 * make a new collection appear without clicking through the admin.
 *
 * Nothing is ever taken out, and a product already in the collection is left
 * alone, so it is safe to run twice.
 *
 *   node -r dotenv/config scripts/add-to-collection.mjs <collection> <product…>
 *   node -r dotenv/config scripts/add-to-collection.mjs pinstripes pinstripes-shirt-design-1 --apply
 *
 * Handles are the bits after /collections/ and /products/. Without --apply it
 * only says what it would do.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2).filter((a) => a !== '--apply');
const APPLY = process.argv.includes('--apply');
const [collectionHandle, ...productHandles] = args;

try {
  if (!collectionHandle || productHandles.length === 0) {
    throw new Error('Usage: add-to-collection.mjs <collection-handle> <product-handle…> [--apply]');
  }

  const col = await prisma.collection.findUnique({
    where: { handle: collectionHandle },
    select: { id: true, title: true, status: true, showInNav: true },
  });
  if (!col) throw new Error(`No collection at /collections/${collectionHandle}`);

  const products = await prisma.product.findMany({
    where: { handle: { in: productHandles } },
    select: { id: true, handle: true, title: true, status: true },
  });
  for (const h of productHandles) {
    if (!products.some((p) => p.handle === h)) console.log(`  no product at /products/${h} — skipping`);
  }

  const have = new Set(
    (
      await prisma.productCollection.findMany({
        where: { collectionId: col.id },
        select: { productId: true },
      })
    ).map((r) => r.productId)
  );

  console.log(`${col.title} (${col.status}, ${have.size} products in it)\n`);
  const missing = products.filter((p) => !have.has(p.id));
  for (const p of products) {
    const already = have.has(p.id);
    console.log(
      (already ? '  already in: ' : APPLY ? '  adding:     ' : '  would add:  ') +
        p.title.replace(/\s+/g, ' ') +
        (p.status === 'PUBLISHED' ? '' : `  (${p.status} — it will not show on the site)`)
    );
  }
  if (APPLY && missing.length) {
    await prisma.productCollection.createMany({
      data: missing.map((p, i) => ({ collectionId: col.id, productId: p.id, position: have.size + i })),
      skipDuplicates: true,
    });
  }

  const now = await prisma.productCollection.count({
    where: { collectionId: col.id, product: { status: 'PUBLISHED' } },
  });
  console.log(`\n${col.title} ${APPLY ? 'now holds' : 'would hold'} ${now} published products.`);
  if (!col.showInNav) console.log('Note: "Show in the catalog sidebar" is off, so it stays out of the menu.');
  if (col.status !== 'PUBLISHED') console.log(`Note: the collection is ${col.status}, so it is not on the site.`);
} finally {
  await prisma.$disconnect();
}
