/**
 * Lets every pinstripe uniform be bought online from the landing page.
 *
 * The landing page (/custom-pinstripe-uniforms) sells the Custom Pinstripe
 * Uniforms collection, and each card's "Order now" goes to the product page to
 * put it in the cart. Two of the four had "Sell online" off, so their cards
 * said "View details" and their product pages offered only a quote — half the
 * collection could not be bought by the visitors the ads were paid to bring.
 *
 * This switches it on for the collection's published products that have a
 * price above zero (the cart refuses to charge nothing), and nothing else.
 * Once, by a marker in settings: a product switched off again afterwards in
 * the admin stays off.
 *
 *   node -r dotenv/config scripts/sell-pinstripes-online.mjs            (look)
 *   node -r dotenv/config scripts/sell-pinstripes-online.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const COLLECTION = 'pinstripe-uniform';
const MARKER = 'task:sell-pinstripes-online';

try {
  if (await db.setting.findUnique({ where: { key: MARKER } })) {
    console.log('Already done once — left as it is.');
    process.exit(0);
  }

  const off = await db.product.findMany({
    where: {
      status: 'PUBLISHED',
      sellOnline: false,
      basePrice: { gt: 0 },
      collections: { some: { collection: { handle: COLLECTION } } },
    },
    select: { id: true, title: true, handle: true },
  });

  console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');
  if (!off.length) console.log('  every pinstripe uniform is already sold online');
  for (const p of off) console.log(`  ${apply ? 'turning on' : 'would turn on'} Sell online: ${p.title} (/products/${p.handle})`);

  if (apply) {
    await db.$transaction([
      ...(off.length
        ? [db.product.updateMany({ where: { id: { in: off.map((p) => p.id) } }, data: { sellOnline: true } })]
        : []),
      db.setting.create({ data: { key: MARKER, value: { doneAt: new Date().toISOString(), products: off.map((p) => p.handle) } } }),
    ]);
    if (off.length) console.log('DATA_CHANGED');
  }
} finally {
  await db.$disconnect();
}
