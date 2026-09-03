import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseArea, canUseResource } from '@/lib/permissions';
import { getAccessor } from '@/lib/auth';
import { parseEditTarget, setPath } from '@/lib/blocks/paths';
import { saveSettings, type SiteSettings } from '@/lib/settings';
import type { Block } from '@/lib/blocks/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Change = { target: string; value: unknown };

const MAX_CHANGES = 300;
const MAX_STRING = 20_000;

/**
 * Which database columns may be edited from the page. Anything not listed here
 * is ignored, so a crafted target cannot reach an arbitrary column — prices and
 * publish state included, unless named below.
 */
const EDITABLE_RECORDS: Record<
  string,
  { fields: string[]; money?: string[]; json?: string[]; revalidate: string[] }
> = {
  teamPackage: {
    fields: ['imageUrl', 'tag', 'name', 'note', 'price', 'items'],
    money: ['price'],
    json: ['items'],
    revalidate: ['/', '/team-packages'],
  },
};

class BadValue extends Error {}

function toMoney(raw: unknown) {
  const cleaned = String(raw ?? '').replace(/[^0-9.]/g, '');

  // Stripping the symbols out of text with no digits leaves an empty string,
  // and Number('') is 0 — which would silently zero a price on a typo.
  if (!/[0-9]/.test(cleaned)) {
    throw new BadValue(`"${raw}" is not a valid price. Use a number such as 470.`);
  }

  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    throw new BadValue(`"${raw}" is not a valid price. Use a number such as 470.`);
  }
  return Math.round(n * 100) / 100;
}

/**
 * Applies inline front-end edits. Each change carries the `data-edit` target it
 * came from, so the client never needs to know which page or record owns it.
 */
export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const changes: Change[] = Array.isArray(body?.changes) ? body.changes : [];
    if (!changes.length) return badRequest('No changes were supplied.');
    if (changes.length > MAX_CHANGES) return badRequest('Too many changes in one save.');

    const blockEdits = new Map<string, { path: string; value: unknown }[]>();
    const settingEdits: Record<string, unknown> = {};
    const recordEdits = new Map<
      string,
      { model: string; id: string; edits: { field: string; value: unknown }[] }
    >();

    for (const c of changes) {
      const target = parseEditTarget(String(c?.target ?? ''));
      if (!target) continue;

      let value = c.value;
      if (typeof value === 'string') {
        if (value.length > MAX_STRING) return badRequest('One of the fields is too long.');
        value = value.replace(/ /g, ' ');
      }

      // Each target kind lives in a different area, so an editor limited to
      // orders cannot use the front-end editor to reach settings or the
      // catalogue.
      if (target.kind === 'setting') {
        if (!canUseArea(user, 'settings')) return forbidden();
        settingEdits[target.path] = value;
      } else if (target.kind === 'record') {
        if (!canUseResource(user, target.model)) return forbidden();
        const key = `${target.model}:${target.id}`;
        const entry = recordEdits.get(key) ?? {
          model: target.model,
          id: target.id,
          edits: [],
        };
        entry.edits.push({ field: target.field, value });
        recordEdits.set(key, entry);
      } else {
        if (!canUseArea(user, 'content')) return forbidden();
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

      /** Applies this request's edits to whatever the record holds *now*. */
      const merge = (blocks: Block[]) =>
        blocks.map((b) => {
          const edits = blockEdits.get(b?.id);
          if (!edits) return b;
          let props = b.props ?? {};
          for (const e of edits) props = setPath(props, e.path, e.value);
          return { ...b, props };
        });

      const [pages, collections] = await Promise.all([
        prisma.page.findMany({ select: { id: true, slug: true, blocks: true } }),
        prisma.collection.findMany({ select: { id: true, handle: true, blocks: true } }),
      ]);

      // -- pages
      for (const page of pages) {
        const initial = Array.isArray(page.blocks) ? (page.blocks as Block[]) : [];
        if (!initial.some((b) => wanted.has(b?.id))) continue;

        // Re-read, merge and write under a version check. Two people saving at
        // once used to mean the slower write silently threw away the faster
        // one; re-applying to the current rows makes both survive.
        let saved: Block[] | null = null;
        for (let attempt = 0; attempt < 5 && !saved; attempt++) {
          const fresh = await prisma.page.findUnique({
            where: { id: page.id },
            select: { blocks: true, updatedAt: true },
          });
          if (!fresh) break;

          const next = merge(Array.isArray(fresh.blocks) ? (fresh.blocks as Block[]) : []);
          const res = await prisma.page.updateMany({
            where: { id: page.id, updatedAt: fresh.updatedAt },
            data: { blocks: next as unknown as object },
          });

          if (res.count === 1) saved = next;
          else await new Promise((r) => setTimeout(r, 40 * 2 ** attempt));
        }

        if (!saved) {
          return json(
            { error: 'That page is being saved by someone else. Try again in a moment.' },
            409
          );
        }

        await prisma.pageRevision.create({
          data: {
            pageId: page.id,
            blocks: saved as unknown as object,
            authorId: user.id,
            label: 'Inline edit',
          },
        });

        revalidatePath(page.slug === 'home' ? '/' : `/${page.slug}`);
        if (page.slug === 'product-extras') revalidatePath('/products/[handle]', 'page');
        touched.push(page.slug);
        initial.forEach((b) => wanted.delete(b?.id));
      }

      // -- collection page extras
      for (const col of collections) {
        const initial = Array.isArray(col.blocks) ? (col.blocks as Block[]) : [];
        if (!initial.some((b) => wanted.has(b?.id))) continue;

        let ok = false;
        for (let attempt = 0; attempt < 5 && !ok; attempt++) {
          const fresh = await prisma.collection.findUnique({
            where: { id: col.id },
            select: { blocks: true, updatedAt: true },
          });
          if (!fresh) break;

          const next = merge(Array.isArray(fresh.blocks) ? (fresh.blocks as Block[]) : []);
          const res = await prisma.collection.updateMany({
            where: { id: col.id, updatedAt: fresh.updatedAt },
            data: { blocks: next as unknown as object },
          });

          if (res.count === 1) ok = true;
          else await new Promise((r) => setTimeout(r, 40 * 2 ** attempt));
        }

        if (!ok) {
          return json(
            { error: 'That collection is being saved by someone else. Try again in a moment.' },
            409
          );
        }

        revalidatePath(`/collections/${col.handle}`);
        touched.push(`collections/${col.handle}`);
      }
    }

    // ---------------------------------------------------------- records
    for (const entry of recordEdits.values()) {
      const cfg = EDITABLE_RECORDS[entry.model];
      if (!cfg) continue;

      const model = prisma[entry.model as 'teamPackage'];
      const current = await model.findUnique({ where: { id: entry.id } });
      if (!current) continue;

      const data: Record<string, unknown> = {};
      for (const e of entry.edits) {
        const [base, ...rest] = e.field.split('.');
        if (!cfg.fields.includes(base)) continue;

        if (rest.length) {
          if (!cfg.json?.includes(base)) continue;
          const start = data[base] ?? (current as Record<string, unknown>)[base] ?? [];
          data[base] = setPath(start, rest.join('.'), e.value);
        } else if (cfg.money?.includes(base)) {
          data[base] = toMoney(e.value);
        } else {
          data[base] = e.value;
        }
      }

      if (!Object.keys(data).length) continue;

      await model.update({ where: { id: entry.id }, data: data as never });
      cfg.revalidate.forEach((path) => {
        try {
          revalidatePath(path);
        } catch {
          /* best effort */
        }
      });
      touched.push(`${entry.model}:${entry.id}`);
    }

    if (!touched.length) return badRequest('Nothing matched those edit targets.');

    return json({ ok: true, updated: touched });
  } catch (err) {
    if (err instanceof BadValue) return badRequest(err.message);
    return serverError(err);
  }
}
