/**
 * Adds `collections.bodyCopy`, the paragraph printed under a collection's
 * product grid and edited in the admin.
 *
 * Prisma has no migration history in this project, so the column is added by
 * hand before the new code reads it. Nothing is dropped and no row is
 * rewritten; safe to run twice.
 *
 *   node -r dotenv/config scripts/add-collection-body.mjs
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
    'collections'
  );
  if (columns.length === 0) throw new Error(`No "collections" table in ${db}.`);

  if (columns.some((c) => c.COLUMN_NAME === 'bodyCopy')) {
    console.log('bodyCopy is already there.');
  } else {
    await prisma.$executeRawUnsafe('ALTER TABLE collections ADD COLUMN bodyCopy TEXT NULL');
    console.log('Added collections.bodyCopy.');
  }

  const n = await prisma.collection.count({ where: { bodyCopy: { not: null } } });
  console.log(`${n} collections have copy under the grid.`);
} finally {
  await prisma.$disconnect();
}
