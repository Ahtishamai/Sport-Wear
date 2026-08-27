import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { UPLOAD_ROOT } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ai': 'application/postscript',
};

/**
 * Serves uploaded media through the Node process rather than relying on the
 * host's static file handling. Files written after the build are not always
 * picked up by a platform's static layer, which leaves freshly uploaded images
 * 404ing even though they exist on disk.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await ctx.params;

  // Resolve inside the upload root and refuse anything that escapes it.
  const target = path.resolve(UPLOAD_ROOT, ...parts);
  const root = path.resolve(UPLOAD_ROOT);
  if (target !== root && !target.startsWith(root + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) return new Response('Not found', { status: 404 });

    const type = TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream';
    const body = Readable.toWeb(createReadStream(target)) as ReadableStream;

    return new Response(body, {
      headers: {
        'Content-Type': type,
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
