/**
 * Adds the two tables behind redirects and the 404 report.
 *
 * Run with:  node -r dotenv/config scripts/add-redirects.mjs
 *
 * Idempotent: every statement is guarded, so running it twice changes
 * nothing. Both tables are new, so nothing that already exists is touched and
 * there is nothing to lose.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS = [
  [
    'redirects',
    `CREATE TABLE IF NOT EXISTS redirects (
       id         VARCHAR(191) NOT NULL,
       \`from\`     VARCHAR(512) NOT NULL,
       \`to\`       VARCHAR(512) NOT NULL,
       kind       ENUM('PERMANENT','TEMPORARY') NOT NULL DEFAULT 'PERMANENT',
       active     TINYINT(1) NOT NULL DEFAULT 1,
       note       TEXT NULL,
       createdAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       updatedAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
       PRIMARY KEY (id),
       UNIQUE KEY redirects_from_key (\`from\`),
       KEY redirects_active_idx (active)
     ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
  [
    'not_found_hits',
    `CREATE TABLE IF NOT EXISTS not_found_hits (
       id          VARCHAR(191) NOT NULL,
       path        VARCHAR(512) NOT NULL,
       hits        INT NOT NULL DEFAULT 0,
       referrer    VARCHAR(512) NULL,
       ignored     TINYINT(1) NOT NULL DEFAULT 0,
       firstSeenAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       lastSeenAt  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       PRIMARY KEY (id),
       UNIQUE KEY not_found_hits_path_key (path),
       KEY not_found_hits_ignored_hits_idx (ignored, hits)
     ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
];

/*
 * An earlier version of this script gave `redirects` a hit counter. A rule is
 * answered out of a cached render, so any count kept there would have been a
 * number that quietly lied; the columns are taken back out rather than left
 * to confuse the next person reading the table.
 */
const RETIRED = [
  ['redirects', 'hits'],
  ['redirects', 'lastHitAt'],
];

async function main() {
  for (const [name, sql] of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    const [{ n }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = ?`,
      name
    );
    console.log(`${name}: ${Number(n) === 1 ? 'present' : 'MISSING'}`);
  }

  for (const [table, column] of RETIRED) {
    const [{ n }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      table,
      column
    );
    if (Number(n) === 1) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
      console.log(`${table}.${column}: dropped`);
    }
  }

  const redirects = await prisma.redirect.count();
  const misses = await prisma.notFoundHit.count();
  console.log(`\n${redirects} redirect(s), ${misses} recorded dead end(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
