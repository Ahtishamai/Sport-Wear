/**
 * Adds the two tables behind shop accounts, and the column that ties an order
 * to one.
 *
 * Run with:  node -r dotenv/config scripts/add-customers.mjs
 *
 * Idempotent: every statement is guarded, so running it twice changes
 * nothing. The tables are new and the column is nullable, so no existing
 * order is touched — guest orders simply have no account, which is the truth.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TABLES = [
  [
    'customers',
    `CREATE TABLE IF NOT EXISTS customers (
       id           VARCHAR(191) NOT NULL,
       email        VARCHAR(160) NOT NULL,
       name         VARCHAR(120) NOT NULL,
       phone        VARCHAR(40) NULL,
       passwordHash VARCHAR(100) NOT NULL,
       shipTo       JSON NULL,
       verifiedAt   DATETIME(3) NULL,
       lastLoginAt  DATETIME(3) NULL,
       createdAt    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       updatedAt    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
       PRIMARY KEY (id),
       UNIQUE KEY customers_email_key (email)
     ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'customer_tokens',
    `CREATE TABLE IF NOT EXISTS customer_tokens (
       id         VARCHAR(191) NOT NULL,
       customerId VARCHAR(191) NOT NULL,
       kind       ENUM('VERIFY','RESET') NOT NULL,
       tokenHash  VARCHAR(64) NOT NULL,
       expiresAt  DATETIME(3) NOT NULL,
       usedAt     DATETIME(3) NULL,
       createdAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       PRIMARY KEY (id),
       UNIQUE KEY customer_tokens_tokenHash_key (tokenHash),
       KEY customer_tokens_customerId_kind_idx (customerId, kind),
       CONSTRAINT customer_tokens_customerId_fkey
         FOREIGN KEY (customerId) REFERENCES customers (id) ON DELETE CASCADE ON UPDATE CASCADE
     ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
];

/** [table, column, definition, extra statements once it exists] */
const COLUMNS = [
  [
    'shop_orders',
    'customerId',
    'ALTER TABLE shop_orders ADD COLUMN customerId VARCHAR(191) NULL AFTER reference',
    [
      'ALTER TABLE shop_orders ADD INDEX shop_orders_customerId_idx (customerId)',
      'ALTER TABLE shop_orders ADD INDEX shop_orders_email_idx (email)',
      `ALTER TABLE shop_orders ADD CONSTRAINT shop_orders_customerId_fkey
         FOREIGN KEY (customerId) REFERENCES customers (id) ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
  ],
];

const countRows = async (sql, ...args) => {
  const [{ n }] = await prisma.$queryRawUnsafe(sql, ...args);
  return Number(n);
};

const tableExists = (name) =>
  countRows(
    `SELECT COUNT(*) AS n FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?`,
    name
  );

const columnExists = (table, column) =>
  countRows(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    table,
    column
  );

async function main() {
  for (const [name, sql] of TABLES) {
    await prisma.$executeRawUnsafe(sql);
    console.log(`${name}: ${(await tableExists(name)) === 1 ? 'present' : 'MISSING'}`);
  }

  for (const [table, column, add, extras] of COLUMNS) {
    if ((await columnExists(table, column)) === 1) {
      console.log(`${table}.${column}: already there`);
      continue;
    }
    await prisma.$executeRawUnsafe(add);
    for (const sql of extras) {
      // An index or key that is already in place is not a failure worth
      // stopping for; the column is what matters.
      await prisma.$executeRawUnsafe(sql).catch((err) => {
        console.log(`  (skipped: ${String(err.message).split('\n')[0].slice(0, 90)})`);
      });
    }
    console.log(`${table}.${column}: added`);
  }

  console.log(
    `\n${await prisma.customer.count()} account(s), ` +
      `${await prisma.shopOrder.count({ where: { customerId: { not: null } } })} order(s) tied to one.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
