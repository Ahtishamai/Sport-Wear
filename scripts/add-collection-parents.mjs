/**
 * Adds the `collection_parents` table, which lets one sub-collection sit
 * under several parents instead of only one.
 *
 * Prisma has no migration history in this project, so the table has to be
 * created by hand before the new code can read it. Nothing is dropped: the
 * existing `collections.parentId` stays, and keeps holding the first parent,
 * so the site goes on working between this script and the deploy. Safe to run
 * twice — the table is created only when missing, and the backfill copies
 * each existing parent across without touching a row that is already there.
 *
 *   node -r dotenv/config scripts/add-collection-parents.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** The database name out of the connection string, for information_schema. */
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

  const tables = await prisma.$queryRawUnsafe(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    db
  );
  const names = tables.map((t) => t.TABLE_NAME);
  if (!names.includes('collections')) throw new Error(`No "collections" table in ${db}.`);

  if (names.includes('collection_parents')) {
    console.log('collection_parents is already there.');
  } else {
    // Matching product_collections: the same pair of ids as the primary key,
    // and both sides cascading, so a deleted collection takes its links with it.
    await prisma.$executeRawUnsafe(
      `CREATE TABLE collection_parents (
         childId  VARCHAR(191) NOT NULL,
         parentId VARCHAR(191) NOT NULL,
         position INT NOT NULL DEFAULT 0,
         PRIMARY KEY (childId, parentId),
         INDEX collection_parents_parentId_position_idx (parentId, position),
         CONSTRAINT collection_parents_childId_fkey FOREIGN KEY (childId)
           REFERENCES collections(id) ON DELETE CASCADE ON UPDATE CASCADE,
         CONSTRAINT collection_parents_parentId_fkey FOREIGN KEY (parentId)
           REFERENCES collections(id) ON DELETE CASCADE ON UPDATE CASCADE
       ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('Created collection_parents.');
  }

  // Every collection already filed under one gets that parent as its first.
  const copied = await prisma.$executeRawUnsafe(
    `INSERT IGNORE INTO collection_parents (childId, parentId, position)
     SELECT id, parentId, position FROM collections WHERE parentId IS NOT NULL`
  );
  console.log(`Carried ${copied} existing parent${copied === 1 ? '' : 's'} across.`);

  const rows = await prisma.collection.findMany({
    orderBy: { position: 'asc' },
    select: {
      title: true,
      parentLinks: { select: { parent: { select: { title: true } } } },
    },
  });
  const filed = rows.filter((r) => r.parentLinks.length > 0);
  console.log(`\n${rows.length} collections, ${filed.length} of them filed under another:`);
  for (const r of filed) {
    console.log('  ' + r.title + '  ->  ' + r.parentLinks.map((l) => l.parent.title).join(', '));
  }
} finally {
  await prisma.$disconnect();
}
