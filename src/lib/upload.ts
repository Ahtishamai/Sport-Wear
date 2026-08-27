import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma } from './db';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'application/postscript': '.ai',
};

export const IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

export type SavedFile = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

export async function saveUpload(
  file: File,
  folder = 'general',
  maxBytes = 25 * 1024 * 1024
): Promise<SavedFile> {
  if (file.size > maxBytes) {
    throw new Error(`${file.name} is larger than ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'general';
  const ext =
    EXT_BY_MIME[file.type] ??
    (path.extname(file.name).match(/^\.[a-z0-9]{1,5}$/i) ? path.extname(file.name) : '');

  if (!ext) throw new Error(`${file.name} is not a supported file type`);

  const dir = path.join(UPLOAD_ROOT, safeFolder);
  await mkdir(dir, { recursive: true });

  const name = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}${ext.toLowerCase()}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = `/uploads/${safeFolder}/${name}`;
  const mimeType = file.type || 'application/octet-stream';

  await writeFile(path.join(dir, name), buffer);

  // The filesystem does not survive a rebuild on most hosts, so the bytes are
  // also kept in the database. That copy is the authority; disk is a cache the
  // serving route refills on demand.
  await prisma.uploadedFile.upsert({
    where: { path: url },
    create: { path: url, mimeType, size: file.size, data: buffer },
    update: { mimeType, size: file.size, data: buffer },
  });

  return { url, filename: file.name, mimeType, size: file.size };
}

/**
 * Writes a stored file back to disk. Called when a request finds the cache
 * empty — after a deploy, the first view of each image restores it.
 */
export async function restoreFromDb(publicPath: string) {
  const row = await prisma.uploadedFile.findUnique({ where: { path: publicPath } });
  if (!row) return null;

  const prefix = '/uploads/';
  const rel = publicPath.startsWith(prefix) ? publicPath.slice(prefix.length) : publicPath;
  const target = path.join(UPLOAD_ROOT, rel);
  if (!path.resolve(target).startsWith(path.resolve(UPLOAD_ROOT))) return null;

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(row.data));
  return { buffer: Buffer.from(row.data), mimeType: row.mimeType };
}

/** Reads intrinsic dimensions for PNG / JPEG / WebP / GIF without a decoder dependency. */
export function imageSize(buf: Buffer): { width: number; height: number } | null {
  // PNG
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // WebP (VP8X / VP8 / VP8L simple cases)
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8X') {
      return {
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
      };
    }
  }
  // JPEG — walk the segment markers
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}
