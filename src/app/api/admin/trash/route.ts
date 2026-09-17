import { revalidatePath } from 'next/cache';
import { getAccessor } from '@/lib/auth';
import { prisma, plain } from '@/lib/db';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseResource } from '@/lib/permissions';
import { RESOURCES } from '@/lib/resources';
import { listTrash, previewTrash, purgeFromTrash, restoreFromTrash, TrashError, TRASH } from '@/lib/trash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Trash: list, preview a delete, restore, delete forever.
 *
 * Each item is only visible to — and only restorable by — someone who can use
 * the area it came from, so an orders-only editor never sees a trashed user.
 */

export async function GET() {
  const user = await getAccessor();
  if (!user) return unauthorized();
  try {
    const items = (await listTrash())
      .filter((i) => canUseResource(user, i.resource))
      .map((i) => ({ ...i, kind: TRASH[i.resource]?.kind ?? i.resource }));
    return json({ items: plain(items) });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');

  try {
    // What a delete would take with it, for the warning shown before it.
    if (action === 'preview') {
      const resource = String(body.resource ?? '');
      const id = String(body.id ?? '');
      if (!resource || !id) return badRequest('Which item?');
      if (!canUseResource(user, resource)) return forbidden();
      return json(await previewTrash(resource, id));
    }

    if (action !== 'restore' && action !== 'purge') return badRequest('Unknown action.');
    const id = String(body.id ?? '');
    if (!id) return badRequest('Which item?');

    const item = await prisma.trashItem.findUnique({ where: { id }, select: { resource: true } });
    if (!item) return json({ error: 'That is no longer in Trash.' }, 404);
    if (!canUseResource(user, item.resource)) return forbidden();

    if (action === 'purge') {
      // Erasing people's accounts or money records is for full admins only.
      if (user.role !== 'ADMIN') {
        return json({ error: 'Only a full admin can delete things forever.' }, 403);
      }
      const gone = await purgeFromTrash(id);
      return json({ ok: true, label: gone.label });
    }

    const restored = await restoreFromTrash(id);
    await refresh(restored.resource, restored.row.id);
    return json({ ok: true, label: restored.label, notes: restored.notes, resource: restored.resource });
  } catch (err) {
    if (err instanceof TrashError) return json({ error: err.message }, err.status);
    return serverError(err);
  }
}

/** Public pages that show the restored record pick it up again. */
async function refresh(resource: string, id: string) {
  const cfg = RESOURCES[resource];
  if (!cfg) return;
  const row = await (prisma[cfg.model] as any).findUnique({ where: { id }, include: cfg.include }).catch(() => null);
  const paths = row ? cfg.revalidate(row) : [];
  if (resource === 'nav') paths.push('/');
  for (const p of [...paths, '/sitemap.xml']) {
    try {
      revalidatePath(p, p === '/' && resource === 'nav' ? 'layout' : undefined);
    } catch {
      /* best-effort */
    }
  }
}
