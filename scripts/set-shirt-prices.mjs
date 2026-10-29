/**
 * Puts the shirt price list on every product in the shirt collections.
 *
 * The list itself lives in src/lib/utils.ts as SHIRT_TIERS — $50 for one,
 * down to $20 each past twenty — and this copies it onto the shirts so the
 * whole range is priced the same way without typing seven rows per product.
 *
 * Only the shirt collections are touched; bags, jackets, uniforms and kits
 * are left exactly as they are. A product that already carries the list is
 * skipped, so running it twice changes nothing.
 *
 *   node -r dotenv/config scripts/set-shirt-prices.mjs           # say what it would do
 *   node -r dotenv/config scripts/set-shirt-prices.mjs --apply   # do it
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

/** Kept in step with SHIRT_TIERS by hand: scripts cannot import the app's TS. */
const SHIRT_TIERS = [
  { label: '', minQty: 1, maxQty: 1, price: 50, discount: 0, savingsLabel: '' },
  { label: '', minQty: 2, maxQty: 2, price: 40, discount: 0, savingsLabel: '' },
  { label: '', minQty: 3, maxQty: 4, price: 35, discount: 0, savingsLabel: '' },
  { label: '', minQty: 5, maxQty: 5, price: 30, discount: 0, savingsLabel: '' },
  { label: '', minQty: 6, maxQty: 10, price: 25, discount: 0, savingsLabel: '' },
  { label: '', minQty: 11, maxQty: 20, price: 22, discount: 0, savingsLabel: '' },
  { label: '', minQty: 21, maxQty: null, price: 20, discount: 0, savingsLabel: '' },
];

/** The collections whose products count as shirts. */
const SHIRT_COLLECTIONS = [
  'shirts',
  'crew-neck-jerseys',
  'jerseys-v-neck',
  'baseball-shirts',
  'softball-shirts',
  'pinstripes',
];

/** Do these tiers already charge what the list charges, at every quantity? */
function matchesList(tiers) {
  if (!Array.isArray(tiers) || tiers.length !== SHIRT_TIERS.length) return false;
  return SHIRT_TIERS.every((want, i) => {
    const has = tiers[i] ?? {};
    return (
      Number(has.minQty) === want.minQty &&
      (has.maxQty ?? null) === want.maxQty &&
      Number(has.price) === want.price
    );
  });
}

try {
  const products = await prisma.product.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      collections: { some: { collection: { handle: { in: SHIRT_COLLECTIONS } } } },
    },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, basePrice: true, volumeTiers: true },
  });

  const already = products.filter((p) => matchesList(p.volumeTiers));
  const todo = products.filter((p) => !matchesList(p.volumeTiers));

  console.log(`${products.length} shirts; ${already.length} already on the list.\n`);
  for (const p of todo) {
    const was = Array.isArray(p.volumeTiers) && p.volumeTiers.some((t) => Number(t?.price) > 0)
      ? 'a different list'
      : `a flat $${p.basePrice}`;
    console.log(`${APPLY ? 'pricing' : 'would price'} ${p.title.replace(/\s+/g, ' ')} — was ${was}`);
    if (!APPLY) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: {
        volumeTiers: SHIRT_TIERS,
        // Nothing shows a price until the starting price is set, and the
        // list's own first row is what one shirt costs.
        ...(Number(p.basePrice) > 0 ? {} : { basePrice: SHIRT_TIERS[0].price }),
      },
    });
  }
  if (todo.length === 0) console.log('Every shirt already carries the list.');
} finally {
  await prisma.$disconnect();
}
