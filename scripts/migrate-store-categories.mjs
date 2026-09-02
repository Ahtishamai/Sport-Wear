/**
 * Turns the free-text `category` on each design into a real StoreCategory row.
 *
 * Categories used to be typed per design, so "Shirt" and "Shirts" made two
 * sections. They are records now: this creates one per distinct name per store,
 * keeping the order the designs were already in, and links each design to it.
 *
 *   node -r dotenv/config scripts/migrate-store-categories.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const stores = await prisma.teamStore.findMany({
    include: { items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
  });

  let madeCategories = 0;
  let linkedItems = 0;

  for (const store of stores) {
    // Order of first appearance is the order the sections already render in,
    // so the page looks the same after the migration as before it.
    const order = [];
    for (const item of store.items) {
      const name = (item.category || 'Apparel').trim() || 'Apparel';
      if (!order.includes(name)) order.push(name);
    }

    const byName = new Map();
    for (const [i, name] of order.entries()) {
      const row = await prisma.storeCategory.upsert({
        where: { storeId_name: { storeId: store.id, name } },
        create: { storeId: store.id, name, position: i },
        update: { position: i },
      });
      byName.set(name, row.id);
      madeCategories++;
    }

    for (const item of store.items) {
      if (item.categoryId) continue;
      const name = (item.category || 'Apparel').trim() || 'Apparel';
      await prisma.teamStoreItem.update({
        where: { id: item.id },
        data: { categoryId: byName.get(name) },
      });
      linkedItems++;
    }

    if (order.length) {
      console.log(`  ${store.slug}: ${order.join(' -> ')}`);
    }
  }

  console.log(`\n${madeCategories} categories, ${linkedItems} designs linked\n`);
} catch (err) {
  console.error('\nMigration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
