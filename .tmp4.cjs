const fs = require('fs');
const p = 'src/app/api/admin/[...path]/route.ts';
let s = fs.readFileSync(p, 'utf8');

// ---- where is this file used? ----
const helperAnchor = `async function syncProductRelations(`;
const helper = `/**
 * Everywhere a media URL is referenced. Deleting a file that is still in use
 * leaves a dead image on a live page — and now that the bytes live in the
 * database, that loss is permanent rather than merely until the next upload.
 */
async function findMediaUsage(url: string) {
  const like = \`%\${url}%\`;
  const used: string[] = [];

  const [pages, collections, images, packages, settings] = await Promise.all([
    prisma.$queryRaw<{ slug: string }[]>\`SELECT slug FROM pages WHERE blocks LIKE \${like}\`,
    prisma.$queryRaw<{ handle: string }[]>\`
      SELECT handle FROM collections
      WHERE blocks LIKE \${like} OR bannerUrl = \${url} OR thumbUrl = \${url}\`,
    prisma.productImage.findMany({
      where: { url },
      select: { product: { select: { title: true } } },
    }),
    prisma.teamPackage.findMany({ where: { imageUrl: url }, select: { name: true } }),
    prisma.$queryRaw<{ k: string }[]>\`SELECT \\`key\\` AS k FROM settings WHERE value LIKE \${like}\`,
  ]);

  pages.forEach((r) => used.push(\`page: \${r.slug}\`));
  collections.forEach((r) => used.push(\`collection: \${r.handle}\`));
  images.forEach((r) => used.push(\`product: \${r.product?.title ?? 'unknown'}\`));
  packages.forEach((r) => used.push(\`package: \${r.name}\`));
  settings.forEach(() => used.push('site settings (logo or similar)'));

  return used;
}

async function syncProductRelations(`;
if (!s.includes(helperAnchor)) throw new Error('helper anchor');
s = s.replace(helperAnchor, helper);

// ---- refuse the delete unless forced ----
const oldDelete = `    await m.delete({ where: { id } });

    // Media rows own their bytes; drop them so deleting a file actually
    // reclaims the space rather than orphaning a blob.
    if (resource === 'media' && typeof row.url === 'string') {
      await prisma.uploadedFile.deleteMany({ where: { path: row.url } });
    }`;

const newDelete = `    if (resource === 'media' && typeof row.url === 'string') {
      const force = new URL(_req.url).searchParams.get('force') === '1';
      const used = await findMediaUsage(row.url);

      if (used.length && !force) {
        return json(
          {
            error:
              \`That image is still used in \${used.length} place\${used.length === 1 ? '' : 's'}. \` +
              'Replace it there first, or delete it anyway to leave those spots empty.',
            reason: 'media_in_use',
            usedBy: used.slice(0, 12),
          },
          409
        );
      }
    }

    await m.delete({ where: { id } });

    // Media rows own their bytes; drop them so deleting a file actually
    // reclaims the space rather than orphaning a blob.
    if (resource === 'media' && typeof row.url === 'string') {
      await prisma.uploadedFile.deleteMany({ where: { path: row.url } });
    }`;
if (!s.includes(oldDelete)) throw new Error('delete anchor');
s = s.replace(oldDelete, newDelete);

fs.writeFileSync(p, s);
console.log('media delete — checks usage first');
