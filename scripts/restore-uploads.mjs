/**
 * Writes every stored upload back to disk.
 *
 * Uploads live in the database because the filesystem does not survive a
 * rebuild. Individual files also restore themselves on first request, so this
 * is only a convenience — run it after a deploy to warm them all at once.
 *
 *   npm run uploads:restore
 */
import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();
const ROOT = path.join(process.cwd(), 'public', 'uploads');

try {
  const files = await prisma.uploadedFile.findMany({
    select: { path: true, size: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!files.length) {
    console.log('\nNothing stored yet — nothing to restore.\n');
    process.exit(0);
  }

  let restored = 0;
  let present = 0;
  let bytes = 0;

  for (const f of files) {
    const rel = f.path.startsWith('/uploads/') ? f.path.slice('/uploads/'.length) : f.path;
    const target = path.join(ROOT, rel);

    try {
      await stat(target);
      present++;
      continue;
    } catch {
      /* not on disk — restore it */
    }

    const row = await prisma.uploadedFile.findUnique({ where: { path: f.path } });
    if (!row) continue;

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(row.data));
    restored++;
    bytes += row.size;
    console.log(`  restored  ${f.path}`);
  }

  console.log(
    `\n${restored} restored, ${present} already present ` +
      `(${(bytes / 1024 / 1024).toFixed(2)} MB written)\n`
  );
} catch (err) {
  console.error('\nRestore failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
