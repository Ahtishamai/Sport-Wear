/**
 * Puts the pinstripe uniforms on the shirt price list.
 *
 * The shop's jerseys are priced from one list — 1 for $50, 2 for $40, 3–4 for
 * $35, 5 for $30, 6–10 for $25, 11–20 for $22, 21 or more for $20 each
 * (SHIRT_TIERS in src/lib/utils.ts, the list the product editor's "shirt
 * prices" button fills in). The four pinstripe uniforms were on an older
 * ladder that only went from $50 to $45. The shop asked for them to be priced
 * like the other jerseys.
 *
 * The landing page reads its prices from the products, so its cards and its
 * bulk pricing follow by themselves; so do the product pages and the cart.
 *
 * Only the published products in the Custom Pinstripe Uniforms collection,
 * and only once, by a marker in settings: a price changed in the admin
 * afterwards is never put back.
 *
 *   node -r dotenv/config scripts/price-pinstripes-like-shirts.mjs            (look)
 *   node -r dotenv/config scripts/price-pinstripes-like-shirts.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const COLLECTION = 'pinstripe-uniform';
const MARKER = 'task:price-pinstripes-like-shirts';

/** The same list as SHIRT_TIERS in src/lib/utils.ts. */
const SHIRT_TIERS = [
  { label: '', minQty: 1, maxQty: 1, price: 50, discount: 0, savingsLabel: '' },
  { label: '', minQty: 2, maxQty: 2, price: 40, discount: 0, savingsLabel: '' },
  { label: '', minQty: 3, maxQty: 4, price: 35, discount: 0, savingsLabel: '' },
  { label: '', minQty: 5, maxQty: 5, price: 30, discount: 0, savingsLabel: '' },
  { label: '', minQty: 6, maxQty: 10, price: 25, discount: 0, savingsLabel: '' },
  { label: '', minQty: 11, maxQty: 20, price: 22, discount: 0, savingsLabel: '' },
  { label: '', minQty: 21, maxQty: null, price: 20, discount: 0, savingsLabel: '' },
];

try {
  if (await db.setting.findUnique({ where: { key: MARKER } })) {
    console.log('Already done once — left as it is.');
    process.exit(0);
  }

  const products = await db.product.findMany({
    where: { status: 'PUBLISHED', collections: { some: { collection: { handle: COLLECTION } } } },
    select: { id: true, title: true, basePrice: true, volumeTiers: true },
  });

  console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');
  for (const p of products) {
    console.log(`  ${apply ? 'pricing' : 'would price'} "${p.title}" on the shirt list ($50 → $20 at 21+)`);
  }
  if (!products.length) console.log('  no published pinstripe uniforms found');

  if (apply) {
    await db.$transaction([
      ...products.map((p) =>
        db.product.update({
          where: { id: p.id },
          // The starting price is the price of one, as on every shirt.
          data: { volumeTiers: SHIRT_TIERS, basePrice: SHIRT_TIERS[0].price },
        })
      ),
      db.setting.create({
        data: {
          key: MARKER,
          // What each one was, so it can be put back by hand if wanted.
          value: {
            doneAt: new Date().toISOString(),
            before: products.map((p) => ({ id: p.id, basePrice: String(p.basePrice), volumeTiers: p.volumeTiers })),
          },
        },
      }),
    ]);
    if (products.length) console.log('DATA_CHANGED');
  }
} finally {
  await db.$disconnect();
}
