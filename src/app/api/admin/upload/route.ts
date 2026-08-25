import { prisma, plain } from '@/lib/db';
import { badRequest, json, serverError, unauthorized } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { imageSize, IMAGE_MIME, saveUpload } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();

  try {
    const form = await req.formData();
    const folder = String(form.get('folder') ?? 'general');
    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return badRequest('No files were uploaded.');

    const created = [];
    for (const file of files.slice(0, 20)) {
      const saved = await saveUpload(file, folder, 25 * 1024 * 1024);

      let width: number | null = null;
      let height: number | null = null;
      if (IMAGE_MIME.has(saved.mimeType) && saved.mimeType !== 'image/svg+xml') {
        const dims = imageSize(Buffer.from(await file.arrayBuffer()));
        width = dims?.width ?? null;
        height = dims?.height ?? null;
      }

      const row = await prisma.media.create({
        data: {
          url: saved.url,
          filename: saved.filename,
          mimeType: saved.mimeType,
          size: saved.size,
          width,
          height,
          folder,
          alt: '',
        },
      });
      created.push(row);
    }

    return json({ items: plain(created) }, 201);
  } catch (err) {
    if (err instanceof Error && /larger than|not a supported/.test(err.message)) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
