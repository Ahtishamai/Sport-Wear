/**
 * Adds the `parentId` column that lets a collection sit under another one.
 *
 * Prisma has no migration history in this project, so the column has to be
 * added to the database by hand before the new code can read it. Safe to run
 * twice: it checks for the column, the index and the foreign key separately
 * and only adds what is missing. Nothing is dropped and no row is rewritten.
 *
 *   node -r dotenv/config scripts/add-collection-parent.mjs
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

  const columns = await prisma.$queryRawUnsafe(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    db,
    'collections'
  );
  if (columns.length === 0) throw new Error(`No "collections" table in ${db}.`);

  if (columns.some((c) => c.COLUMN_NAME === 'parentId')) {
    console.log('parentId is already there.');
  } else {
    await prisma.$executeRawUnsafe('ALTER TABLE collections ADD COLUMN parentId VARCHAR(191) NULL');
    console.log('Added collections.parentId.');
  }

  const indexes = await prisma.$queryRawUnsafe(
    'SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    db,
    'collections'
  );
  if (indexes.some((i) => i.INDEX_NAME === 'collections_parentId_position_idx')) {
    console.log('The index is already there.');
  } else {
    await prisma.$executeRawUnsafe(
      'CREATE INDEX collections_parentId_position_idx ON collections (parentId, position)'
    );
    console.log('Added the index.');
  }

  const keys = await prisma.$queryRawUnsafe(
    'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS ' +
      'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = ?',
    db,
    'collections',
    'FOREIGN KEY'
  );
  if (keys.some((k) => k.CONSTRAINT_NAME === 'collections_parentId_fkey')) {
    console.log('The foreign key is already there.');
  } else {
    // ON DELETE SET NULL: deleting a parent leaves its sub-collections
    // standing on their own rather than taking them with it.
    await prisma.$executeRawUnsafe(
      'ALTER TABLE collections ADD CONSTRAINT collections_parentId_fkey ' +
        'FOREIGN KEY (parentId) REFERENCES collections(id) ON DELETE SET NULL ON UPDATE CASCADE'
    );
    console.log('Added the foreign key.');
  }

  const rows = await prisma.collection.findMany({
    orderBy: { position: 'asc' },
    select: { handle: true, parentId: true },
  });
  console.log(`\n${rows.length} collections, ${rows.filter((r) => r.parentId).length} of them filed under another.`);
} finally {
  await prisma.$disconnect();
}
