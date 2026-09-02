/**
 * Removes duplicated team-store designs.
 *
 * The store editor used to create a fresh row for every design each time Save
 * was pressed, because the ids it got back were never written into the form.
 * That is fixed, but stores saved before the fix carry several identical
 * copies of every design. This keeps the oldest of each and deletes the rest.
 *
 * Designs referenced by an order are never touched.
 *
 *   node -r dotenv/config scripts/dedupe-store-designs.mjs         # report only
 *   node -r dotenv/config scripts/dedupe-store-designs.mjs --apply
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

// Two rows are the same design if everything a shopper sees matches.
const signature = (i) =>
  JSON.stringify([
    i.storeId,
    i.categoryId,
    i.name.trim(),
    String(i.price),
    i.description ?? '',
    i.images ?? null,
    i.sizes ?? null,
    i.options ?? null,
  ]);

try {
  const items = await prisma.teamStoreItem.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { orderItems: true } } },
  });

  const groups = new Map();
  for (const i of items) {
    const key = signature(i);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }

  const doomed = [];
  for (const copies of groups.values()) {
    if (copies.length < 2) continue;
    // Keep the oldest; never delete one an order points at.
    const [keep, ...rest] = copies;
    for (const r of rest) {
      if (r._count.orderItems > 0) {
        console.log(`  kept ${r.name} (${r.id.slice(-6)}) — referenced by an order`);
        continue;
      }
      doomed.push(r);
    }
    console.log(`  ${keep.name}: ${copies.length} copies -> keeping ${keep.id.slice(-6)}`);
  }

  console.log(`\n${items.length} designs, ${doomed.length} duplicates to remove`);

  if (!apply) {
    console.log('\nNothing changed. Re-run with --apply to delete them.\n');
  } else {
    for (const d of doomed) await prisma.teamStoreItem.delete({ where: { id: d.id } });
    // Renumber so positions stay 0..n-1 within each store.
    const stores = await prisma.teamStore.findMany({ select: { id: true } });
    for (const s of stores) {
      const left = await prisma.teamStoreItem.findMany({
        where: { storeId: s.id },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      for (const [i, row] of left.entries()) {
        await prisma.teamStoreItem.update({ where: { id: row.id }, data: { position: i } });
      }
    }
    console.log(`\nDeleted ${doomed.length}. ${await prisma.teamStoreItem.count()} designs remain.\n`);
  }
} catch (err) {
  console.error('\nFailed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
