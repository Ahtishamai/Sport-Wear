/**
 * Swaps the pinstripe uniforms' product photos for the ones the client sent.
 *
 * The client's new photos show the team name on the front and only a number
 * on the back — no player name, which the old ones had ("PLAYER 23"). They
 * live in public/products/pinstripes/.
 *
 * Only product photos are changed, and only where a product shows one of the
 * four old photos exactly (matched by its address), so nothing else on the
 * site is touched: no other product, page or collection. Each old photo maps
 * to the new one of the same colors:
 *
 *   black with white pinstripes   mvt53g3n-b94d3ec9.jpg → black-with-white-pinstripes.png
 *   navy with red pinstripes      mvt53g58-5e8508e0.jpg → navy-with-red-pinstripes.png
 *   red with navy pinstripes      mvt53g6d-9dd0a59d.jpg → red-with-navy-pinstripes.png
 *   white with black pinstripes   mvvcj53d-d8b2b235.jpg → white-with-black-pinstripes.png
 *
 * Every product changed is printed by name. The old addresses are kept in the
 * settings row this sets, so any photo can be put back. Once, by that marker.
 *
 *   node -r dotenv/config scripts/replace-pinstripe-photos.mjs            (look)
 *   node -r dotenv/config scripts/replace-pinstripe-photos.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const MARKER = 'task:replace-pinstripe-photos';

const SWAP = {
  '/uploads/products/mvt53g3n-b94d3ec9.jpg': '/products/pinstripes/black-with-white-pinstripes.png',
  '/uploads/products/mvt53g58-5e8508e0.jpg': '/products/pinstripes/navy-with-red-pinstripes.png',
  '/uploads/products/mvt53g6d-9dd0a59d.jpg': '/products/pinstripes/red-with-navy-pinstripes.png',
  '/uploads/products/mvvcj53d-d8b2b235.jpg': '/products/pinstripes/white-with-black-pinstripes.png',
};

try {
  if (await db.setting.findUnique({ where: { key: MARKER } })) {
    console.log('Already done once — left as it is.');
    process.exit(0);
  }

  const rows = await db.productImage.findMany({
    where: { url: { in: Object.keys(SWAP) } },
    select: { id: true, url: true, mediaId: true, product: { select: { title: true, handle: true } } },
  });

  console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');
  if (!rows.length) console.log('  no product shows any of the four old photos');
  for (const r of rows) {
    console.log(`  ${apply ? 'swapping' : 'would swap'} the photo on "${r.product.title}" (/products/${r.product.handle})`);
    console.log(`      ${r.url} → ${SWAP[r.url]}`);
  }

  if (apply) {
    await db.$transaction([
      // The new photo is a file of the site, not an upload in the media
      // library, so the row no longer points at the old upload's record.
      ...rows.map((r) =>
        db.productImage.update({ where: { id: r.id }, data: { url: SWAP[r.url], mediaId: null } })
      ),
      db.setting.create({
        data: {
          key: MARKER,
          value: {
            doneAt: new Date().toISOString(),
            changed: rows.map((r) => ({
              imageId: r.id,
              product: r.product.handle,
              before: r.url,
              beforeMediaId: r.mediaId,
              after: SWAP[r.url],
            })),
          },
        },
      }),
    ]);
    if (rows.length) console.log('DATA_CHANGED');
  }
} finally {
  await db.$disconnect();
}
