/**
 * Adds the `sellOnline` column, the per-product switch for Individual / Team
 * and Add to cart.
 *
 * Products that are already sold outright today — priced, and with a figure
 * above zero — are switched on, so nothing changes on the site the moment the
 * column appears. Everything else starts off and stays quote-only until it is
 * ticked in the admin. Safe to run twice: the backfill only runs when the
 * column is new, so a product switched off by hand stays off.
 *
 *   node -r dotenv/config scripts/add-sell-online.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function databaseName() {
  const url = process.env.DATABASE_URL ?? '';
  try {
    return decodeURIComponent(new URL(url.replace(/^mysql:/, 'http:')).pathname.slice(1));
  } catch {
    return '';
  }
}

try {
  const db = databaseName();
  if (!db) throw new Error('DATABASE_URL is not set, or is not a MySQL URL.');

  const columns = await prisma.$queryRawUnsafe(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    db,
    'products'
  );
  if (columns.length === 0) throw new Error(`No "products" table in ${db}.`);

  if (columns.some((c) => c.COLUMN_NAME === 'sellOnline')) {
    console.log('sellOnline is already there — leaving every product as it is.');
  } else {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE products ADD COLUMN sellOnline BOOLEAN NOT NULL DEFAULT false'
    );
    console.log('Added products.sellOnline.');

    const on = await prisma.$executeRawUnsafe(
      'UPDATE products SET sellOnline = true WHERE showPrice = true AND basePrice > 0'
    );
    console.log(`Switched on for ${on} products that are already sold with a price.`);
  }

  const rows = await prisma.product.findMany({
    where: { sellOnline: true },
    orderBy: { title: 'asc' },
    select: { title: true, basePrice: true },
  });
  console.log(`\n${rows.length} products can be bought online:`);
  for (const r of rows) console.log('  ' + r.title + '  $' + r.basePrice);
} finally {
  await prisma.$disconnect();
}
