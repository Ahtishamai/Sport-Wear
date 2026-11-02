/**
 * Adds the discount tables, and the two columns an order needs to record
 * which code was used and what it took off.
 *
 * Prisma has no migration history in this project, so the tables are created
 * by hand before the new code reads them. Nothing is dropped and no existing
 * row is rewritten — an order placed before today simply has no code and a
 * discount of zero. Safe to run twice.
 *
 *   node -r dotenv/config scripts/add-discounts.mjs
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

  const tables = (
    await prisma.$queryRawUnsafe(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      db
    )
  ).map((t) => t.TABLE_NAME);

  if (tables.includes('discounts')) {
    console.log('discounts is already there.');
  } else {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE discounts (
         id            VARCHAR(191) NOT NULL,
         code          VARCHAR(40)  NOT NULL,
         label         VARCHAR(120) NULL,
         kind          ENUM('PERCENT','FIXED') NOT NULL DEFAULT 'PERCENT',
         value         DECIMAL(10,2) NOT NULL,
         scope         ENUM('ALL','COLLECTIONS','PRODUCTS') NOT NULL DEFAULT 'ALL',
         targets       JSON NULL,
         minSubtotal   DECIMAL(10,2) NULL,
         usageLimit    INT NULL,
         perEmailLimit INT NULL,
         usedCount     INT NOT NULL DEFAULT 0,
         startsAt      DATETIME(3) NULL,
         endsAt        DATETIME(3) NULL,
         active        BOOLEAN NOT NULL DEFAULT true,
         note          TEXT NULL,
         createdAt     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
         updatedAt     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
         PRIMARY KEY (id),
         UNIQUE INDEX discounts_code_key (code),
         INDEX discounts_active_idx (active)
       ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('Created discounts.');
  }

  if (tables.includes('discount_uses')) {
    console.log('discount_uses is already there.');
  } else {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE discount_uses (
         id         VARCHAR(191) NOT NULL,
         discountId VARCHAR(191) NOT NULL,
         code       VARCHAR(40)  NOT NULL,
         email      VARCHAR(160) NOT NULL,
         reference  VARCHAR(32)  NOT NULL,
         amount     DECIMAL(10,2) NOT NULL,
         createdAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
         PRIMARY KEY (id),
         INDEX discount_uses_discountId_createdAt_idx (discountId, createdAt),
         INDEX discount_uses_email_idx (email),
         CONSTRAINT discount_uses_discountId_fkey FOREIGN KEY (discountId)
           REFERENCES discounts(id) ON DELETE CASCADE ON UPDATE CASCADE
       ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('Created discount_uses.');
  }

  const discountCols = (
    await prisma.$queryRawUnsafe(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      db,
      'discounts'
    )
  ).map((c) => c.COLUMN_NAME);
  if (discountCols.includes('targetIds') && !discountCols.includes('targets')) {
    await prisma.$executeRawUnsafe('ALTER TABLE discounts CHANGE targetIds targets JSON NULL');
    console.log('Renamed discounts.targetIds to targets.');
  }

  const columns = (
    await prisma.$queryRawUnsafe(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      db,
      'shop_orders'
    )
  ).map((c) => c.COLUMN_NAME);

  if (!columns.includes('discountCode')) {
    await prisma.$executeRawUnsafe('ALTER TABLE shop_orders ADD COLUMN discountCode VARCHAR(40) NULL');
    console.log('Added shop_orders.discountCode.');
  } else {
    console.log('shop_orders.discountCode is already there.');
  }
  if (!columns.includes('discount')) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE shop_orders ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0'
    );
    console.log('Added shop_orders.discount.');
  } else {
    console.log('shop_orders.discount is already there.');
  }

  console.log(`\n${await prisma.discount.count()} discount codes exist.`);
} finally {
  await prisma.$disconnect();
}
