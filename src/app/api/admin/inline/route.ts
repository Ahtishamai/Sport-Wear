import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { badRequest, json, serverError, unauthorized } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { parseEditTarget, setPath } from '@/lib/blocks/paths';
import { saveSettings, type SiteSettings } from '@/lib/settings';
import type { Block } from '@/lib/blocks/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Change = { target: string; value: unknown };

const MAX_CHANGES = 300;
const MAX_STRING = 20_000;

/**
 * Applies inline front-end edits. Each change carries the `data-edit` target it
 * came from, so the client never needs to know which page or record owns it.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const changes: Change[] = Array.isArray(body?.changes) ? body.changes : [];
    if (!changes.length) return badRequest('No changes were supplied.');
    if (changes.length > MAX_CHANGES) return badRequest('Too many changes in one save.');

    const blockEdits = new Map<string, { path: string; value: unknown }[]>();
    const settingEdits: Record<string, unknown> = {};

    for (const c of changes) {
      const target = parseEditTarget(String(c?.target ?? ''));
      if (!target) continue;

      let value = c.value;
      if (typeof value === 'string') {
        if (value.length > MAX_STRING) return badRequest('One of the fields is too long.');
        value = value.replace(/ /g, ' ');
      }

      if (target.kind === 'setting') {
        settingEdits[target.path] = value;
      } else {
        const list = blockEdits.get(target.id) ?? [];
        list.push({ path: target.path, value });
        blockEdits.set(target.id, list);
      }
    }

    const touched: string[] = [];

    // ---------------------------------------------------------- settings
    if (Object.keys(settingEdits).length) {
      await saveSettings(settingEdits as Partial<SiteSettings>);
      revalidatePath('/', 'layout');
      touched.push('settings');
    }

    // ---------------------------------------------------------- blocks
    if (blockEdits.size) {
      const wanted = new Set(blockEdits.keys());

      const [pages, collections] = await Promise.all([
        prisma.page.findMany({ select: { id: true, slug: true, blocks: true } }),
        prisma.collection.findMany({ select: { id: true, handle: true, blocks: true } }),
      ]);

      // -- pages
      for (const page of pages) {
        const blocks = Array.isArray(page.blocks) ? (page.blocks as Block[]) : [];
        if (!blocks.some((b) => wanted.has(b?.id))) continue;

        const next = blocks.map((b) => {
          const edits = blockEdits.get(b?.id);
          if (!edits) return b;
          let props = b.props ?? {};
          for (const e of edits) props = setPath(props, e.path, e.value);
          return { ...b, props };
        });

        await prisma.page.update({
          where: { id: page.id },
          data: { blocks: next as unknown as object },
        });
        await prisma.pageRevision.create({
          data: {
            pageId: page.id,
            blocks: next as unknown as object,
            authorId: user.id,
            label: 'Inline edit',
          },
        });

        revalidatePath(page.slug === 'home' ? '/' : `/${page.slug}`);
        if (page.slug === 'product-extras') revalidatePath('/products/[handle]', 'page');
        touched.push(page.slug);
        blocks.forEach((b) => wanted.delete(b?.id));
      }

      // -- collection page extras
      for (const col of collections) {
        const blocks = Array.isArray(col.blocks) ? (col.blocks as Block[]) : [];
        if (!blocks.some((b) => wanted.has(b?.id))) continue;

        const next = blocks.map((b) => {
          const edits = blockEdits.get(b?.id);
          if (!edits) return b;
          let props = b.props ?? {};
          for (const e of edits) props = setPath(props, e.path, e.value);
          return { ...b, props };
        });

        await prisma.collection.update({
          where: { id: col.id },
          data: { blocks: next as unknown as object },
        });
        revalidatePath(`/collections/${col.handle}`);
        touched.push(`collections/${col.handle}`);
      }
    }

    if (!touched.length) return badRequest('Nothing matched those edit targets.');

    return json({ ok: true, updated: touched });
  } catch (err) {
    return serverError(err);
  }
}
