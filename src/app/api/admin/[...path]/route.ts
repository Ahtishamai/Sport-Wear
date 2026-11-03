import { revalidatePath } from 'next/cache';
import { bustResource } from '@/lib/cache';
import { prisma, plain } from '@/lib/db';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { getAccessor, hashPassword } from '@/lib/auth';
import { coerce, ensureSlug, RESOURCES, type ResourceConfig } from '@/lib/resources';
import { canUseResource } from '@/lib/permissions';
import { saveSettings } from '@/lib/settings';
import { savePaymentSecret, clearPaymentSecret, paypalSecretSummary } from '@/lib/payments';
import { saveMailConfig, mailConfigSummary, type MailConfig } from '@/lib/mail';
import { duplicateProduct } from '@/lib/duplicate';
import { moveToTrash, TrashError } from '@/lib/trash';
import { normalizePath, normalizeTarget, redirectProblem } from '@/lib/redirects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

function model(cfg: ResourceConfig) {
  return prisma[cfg.model] as unknown as {
    findMany: (a?: unknown) => Promise<Record<string, any>[]>;
    findUnique: (a: unknown) => Promise<Record<string, any> | null>;
    create: (a: unknown) => Promise<Record<string, any>>;
    update: (a: unknown) => Promise<Record<string, any>>;
    delete: (a: unknown) => Promise<Record<string, any>>;
    count: (a?: unknown) => Promise<number>;
  };
}

/**
 * Keeps the collection tree two levels deep and free of loops.
 *
 * A collection may sit under a primary collection — one with no parent of its
 * own. Anything further would put a third tier in the menu, and pointing two
 * collections at each other would make a page that cannot render.
 */
/**
 * The parents a write is asking for, or undefined when it says nothing about
 * them. `parentIds` is what the editor sends; a lone `parentId` is still
 * accepted, so anything written against the older shape keeps working.
 */
function wantedParents(body: Record<string, any>): string[] | undefined {
  if (Array.isArray(body?.parentIds)) {
    return [...new Set(body.parentIds.map((v: unknown) => String(v)).filter(Boolean))];
  }
  if ('parentId' in (body ?? {})) return body.parentId ? [String(body.parentId)] : [];
  return undefined;
}

async function checkCollectionParents(parentIds: string[], selfId?: string) {
  if (parentIds.length === 0) return null;
  if (selfId && parentIds.includes(selfId)) return 'A collection cannot sit under itself.';

  const parents = await prisma.collection.findMany({
    where: { id: { in: parentIds } },
    select: {
      id: true,
      title: true,
      parentLinks: { select: { parent: { select: { title: true } } } },
    },
  });
  if (parents.length !== parentIds.length) return 'One of those parent collections no longer exists.';

  const nested = parents.find((p) => p.parentLinks.length > 0);
  if (nested) {
    const above = nested.parentLinks[0]?.parent.title ?? 'another collection';
    return `“${nested.title}” already sits under “${above}”. Pick collections that are not themselves sub-collections.`;
  }

  if (selfId) {
    const kids = await prisma.collectionParent.count({ where: { parentId: selfId } });
    if (kids > 0) {
      return `This collection has ${kids === 1 ? 'a sub-collection' : kids + ' sub-collections'} of its own, so it has to stay at the top level. Move those out first.`;
    }
  }
  return null;
}

/**
 * Tidies and checks a discount before it is saved.
 *
 * The code itself is forced to upper case with the spaces taken out, so
 * "spring 25" and "SPRING25" are the same code and a customer cannot miss
 * by a space. Returns a message when the row makes no sense.
 */
function checkDiscount(data: Record<string, any>): string | null {
  if ('code' in data) {
    const code = String(data.code ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .slice(0, 40);
    if (!code) return 'A discount needs a code for the customer to type.';
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
      return 'A code can use letters, numbers, dashes and underscores.';
    }
    data.code = code;
  }

  if ('value' in data) {
    const value = Number(data.value);
    if (!Number.isFinite(value) || value <= 0) return 'How much it takes off must be above zero.';
    if (data.kind === 'PERCENT' && value > 100) return 'A percentage cannot be more than 100.';
  }

  if (data.scope && data.scope !== 'ALL') {
    const targets = Array.isArray(data.targets) ? data.targets.filter(Boolean) : [];
    if (targets.length === 0) {
      return 'Name at least one collection or product, or set it to apply to the whole order.';
    }
    data.targets = targets.map((t: unknown) => String(t).trim().toLowerCase());
  }

  if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
    return 'The end of the run cannot be before the start.';
  }
  return null;
}

/**
 * Tidies and checks a redirect before it is saved.
 *
 * The old address is forced into the one form the site matches on, so a rule
 * typed with the host in front, a capital letter or a trailing slash still
 * fires. `existing` fills in whichever half a partial save left out, since a
 * rule only makes sense judged as a pair.
 */
function checkRedirect(data: Record<string, any>, existing?: Record<string, any>): string | null {
  const from = 'from' in data ? String(data.from ?? '') : String(existing?.from ?? '');
  const to = 'to' in data ? String(data.to ?? '') : String(existing?.to ?? '');

  const wrong = redirectProblem(from, to);
  if (wrong) return wrong;

  if ('from' in data) data.from = normalizePath(from);
  if ('to' in data) data.to = normalizeTarget(to);
  return null;
}

/**
 * Sets which products are in a collection, from a list the editor sends.
 *
 * It is done here, against the collection, rather than by patching every
 * product from the browser: a save then cannot half-apply, and a list that
 * arrives empty by mistake cannot quietly clear a full collection — emptying
 * one is refused unless the caller says it means to.
 */
async function syncCollectionMembers(
  collectionId: string,
  memberIds: string[],
  allowEmptying: boolean
) {
  const wanted = [...new Set(memberIds.filter(Boolean))];
  const have = (
    await prisma.productCollection.findMany({
      where: { collectionId },
      select: { productId: true },
    })
  ).map((r) => r.productId);

  if (wanted.length === 0 && have.length > 0 && !allowEmptying) {
    return `This save would take all ${have.length} products out of the collection. Reload the page and try again — or, if emptying it is what you want, untick them and confirm.`;
  }

  const gone = have.filter((id) => !wanted.includes(id));
  const added = wanted.filter((id) => !have.includes(id));
  if (gone.length === 0 && added.length === 0) return null;

  await prisma.$transaction([
    ...(gone.length
      ? [prisma.productCollection.deleteMany({ where: { collectionId, productId: { in: gone } } })]
      : []),
    ...(added.length
      ? [
          prisma.productCollection.createMany({
            data: added.map((productId, i) => ({
              collectionId,
              productId,
              position: have.length + i,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  // Every product that moved now lists a different set of collections.
  const moved = await prisma.product.findMany({
    where: { id: { in: [...gone, ...added] } },
    select: { handle: true },
  });
  for (const p of moved) {
    try {
      revalidatePath(`/products/${p.handle}`);
    } catch {
      /* revalidation is best-effort */
    }
  }
  return null;
}

/**
 * Files a collection under the parents asked for. `parentId` on the row is
 * kept in step as the first of them: the breadcrumb and the admin tree each
 * need one path to follow.
 */
async function syncCollectionParents(id: string, parentIds: string[]) {
  await prisma.$transaction([
    prisma.collectionParent.deleteMany({
      where: parentIds.length ? { childId: id, parentId: { notIn: parentIds } } : { childId: id },
    }),
    ...parentIds.map((parentId, position) =>
      prisma.collectionParent.upsert({
        where: { childId_parentId: { childId: id, parentId } },
        create: { childId: id, parentId, position },
        update: { position },
      })
    ),
  ]);
}

/**
 * Puts a write through to what the public sees: the rendered pages that show
 * this record, and the shared answers those pages are drawn from. Clearing
 * one without the other leaves a page to be drawn again from the same stale
 * reads — see lib/cache.ts.
 */
function bump(resource: string, cfg: ResourceConfig, row: Record<string, any>) {
  bustResource(resource);
  for (const p of cfg.revalidate(row)) {
    try {
      revalidatePath(p);
    } catch {
      /* revalidation is best-effort */
    }
  }
  try {
    revalidatePath('/sitemap.xml');
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ GET

export async function GET(req: Request, ctx: Ctx) {
  const user = await getAccessor();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
  // The menu hides areas an account cannot use; this is what actually stops
  // them being reached, since the endpoints are guessable.
  if (!canUseResource(user, path[0])) return forbidden();
  const [resource, id] = path;

  if (resource === 'stats') return stats();

  const cfg = RESOURCES[resource];
  if (!cfg) return badRequest(`Unknown resource "${resource}"`);

  try {
    const m = model(cfg);

    if (id) {
      const row = await m.findUnique({ where: { id }, include: cfg.include });
      if (!row) return json({ error: 'Not found' }, 404);
      return json({ item: plain(row) });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const group = url.searchParams.get('group')?.trim();
    const menu = url.searchParams.get('menu')?.trim();
    const take = Math.min(Number(url.searchParams.get('take')) || 200, 500);
    const skip = Number(url.searchParams.get('skip')) || 0;

    const where: Record<string, unknown> = {};
    if (q && cfg.searchFields?.length) {
      where.OR = cfg.searchFields.map((f) => ({ [f]: { contains: q } }));
    }
    if (status) where.status = status;
    if (group) where.group = group;
    if (menu) where.menu = menu;

    const [items, total] = await Promise.all([
      m.findMany({
        where,
        orderBy: cfg.defaultOrder,
        include: cfg.include,
        take,
        skip,
      }),
      m.count({ where }),
    ]);

    return json({ items: plain(items), total });
  } catch (err) {
    return serverError(err);
  }
}

// ------------------------------------------------------------------ POST

export async function POST(req: Request, ctx: Ctx) {
  const user = await getAccessor();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
  // The menu hides areas an account cannot use; this is what actually stops
  // them being reached, since the endpoints are guessable.
  if (!canUseResource(user, path[0])) return forbidden();
  const [resource, action] = path;

  try {
    const body = await req.json().catch(() => ({}));

    // ---- settings (singleton) ----
    if (resource === 'settings') {
      // The PayPal secret is stored apart from site settings and never sent
      // back to the browser. An empty value means "leave it alone", so the
      // form can be saved without the admin re-entering it.
      // '' (or absent) keeps the stored secret, a string replaces it, and an
      // explicit null removes it — the form has no way to show what is saved,
      // so "leave blank to keep" needs a separate way to actually clear.
      const { paypalSecret, smtp, ...rest } = (body ?? {}) as Record<string, unknown>;
      if (paypalSecret === null) {
        await clearPaymentSecret();
      } else if (typeof paypalSecret === 'string' && paypalSecret.trim()) {
        await savePaymentSecret(paypalSecret);
      }
      // The mail server, its login and its password travel together and are
      // stored in their own row, so they never reach the site layout.
      if (smtp && typeof smtp === 'object') {
        await saveMailConfig(smtp as Partial<MailConfig> & { pass?: string | null });
      }
      const value = await saveSettings(rest);
      revalidatePath('/', 'layout');
      return json({
        settings: value,
        paypalSecret: await paypalSecretSummary(),
        smtp: await mailConfigSummary(),
      });
    }

    const cfg = RESOURCES[resource];
    if (!cfg) return badRequest(`Unknown resource "${resource}"`);
    const m = model(cfg);

    // ---- duplicate ----
    if (action === 'duplicate' && resource === 'products') {
      const sourceId = String(body?.id ?? '').trim();
      if (!sourceId) return badRequest('Which product?');
      const copy = await duplicateProduct(sourceId);
      if (!copy) return json({ error: 'That product was not found.' }, 404);
      // The copy is a draft, so no public page changes; the admin list does.
      return json({ item: plain(copy) }, 201);
    }

    // ---- reorder ----
    if (action === 'reorder') {
      const order: { id: string; position: number }[] = body?.order ?? [];
      if (!Array.isArray(order)) return badRequest('order must be an array');
      await prisma.$transaction(
        order.map((o) =>
          (prisma[cfg.model] as any).update({
            where: { id: o.id },
            data: { position: Math.trunc(Number(o.position) || 0) },
          })
        )
      );
      bump(resource, cfg, order[0] ?? {});
      return json({ ok: true });
    }

    // ---- bulk replace (navigation menus) ----
    if (action === 'replace' && resource === 'nav') {
      const menu = String(body?.menu ?? '');
      const items: { label: string; href: string; newTab?: boolean }[] = body?.items ?? [];
      if (!menu) return badRequest('menu is required');
      await prisma.$transaction([
        prisma.navItem.deleteMany({ where: { menu } }),
        prisma.navItem.createMany({
          data: items
            .filter((i) => i.label && i.href)
            .map((i, idx) => ({
              menu,
              label: String(i.label).slice(0, 80),
              href: String(i.href).slice(0, 300),
              newTab: Boolean(i.newTab),
              position: idx,
            })),
        }),
      ]);
      bustResource('nav');
      revalidatePath('/', 'layout');
      return json({ ok: true });
    }

    // ---- create ----
    const data = coerce(cfg, body ?? {});

    if (resource === 'users') {
      const password = String(body?.password ?? '');
      if (password.length < 8) return badRequest('Password must be at least 8 characters.');
      data.passwordHash = await hashPassword(password);
      data.email = String(data.email ?? '').toLowerCase();
    }

    if (resource === 'pages' && data.blocks === undefined) data.blocks = [];
    if (resource === 'products' && data.description === undefined) data.description = '';

    if (resource === 'discounts') {
      const wrong = checkDiscount(data);
      if (wrong) return badRequest(wrong);
    }

    if (resource === 'redirects') {
      const wrong = checkRedirect(data);
      if (wrong) return badRequest(wrong);
    }

    const newParents = resource === 'collections' ? wantedParents(body) : undefined;
    if (newParents) {
      const wrong = await checkCollectionParents(newParents);
      if (wrong) return badRequest(wrong);
      data.parentId = newParents[0] ?? null;
    }

    await ensureSlug(cfg, data);

    const row = await m.create({ data, include: cfg.include });

    if (newParents) await syncCollectionParents(row.id, newParents);
    if (resource === 'collections' && Array.isArray(body?.memberIds)) {
      await syncCollectionMembers(row.id, body.memberIds.map(String), true);
    }
    if (resource === 'products') await syncProductRelations(row.id, body);
    if (resource === 'pages') await snapshot(row.id, row.blocks, user.id, 'Created');

    bump(resource, cfg, row);
    return json({ item: plain(row) }, 201);
  } catch (err) {
    return handleWriteError(err);
  }
}

// ------------------------------------------------------------------ PATCH

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getAccessor();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
  // The menu hides areas an account cannot use; this is what actually stops
  // them being reached, since the endpoints are guessable.
  if (!canUseResource(user, path[0])) return forbidden();
  const [resource, id] = path;
  const cfg = RESOURCES[resource];
  if (!cfg) return badRequest(`Unknown resource "${resource}"`);
  if (!id) return badRequest('An id is required.');

  try {
    const body = await req.json().catch(() => ({}));
    const m = model(cfg);

    const existing = await m.findUnique({ where: { id } });
    if (!existing) return json({ error: 'Not found' }, 404);

    // A full-document save (the page builder sends the whole blocks array)
    // must not silently discard changes made since it loaded the page — for
    // example an inline edit from the front of the site. Callers must either
    // say which version they are replacing, or opt out on purpose.
    if (body?.blocks !== undefined && !body?.expectedUpdatedAt && !body?.allowOverwrite) {
      return badRequest(
        'A full save must include expectedUpdatedAt so it cannot overwrite newer changes. ' +
          'Pass allowOverwrite: true to replace the record regardless.'
      );
    }

    if (body?.expectedUpdatedAt && existing.updatedAt) {
      const seen = new Date(body.expectedUpdatedAt).getTime();
      const now = new Date(existing.updatedAt).getTime();
      if (Number.isFinite(seen) && seen !== now) {
        return json(
          {
            error:
              'This page changed somewhere else after you opened it. Reload to pick up those changes before saving, or your edits would overwrite them.',
            reason: 'stale_write',
            currentUpdatedAt: existing.updatedAt,
          },
          409
        );
      }
    }

    const data = coerce(cfg, body ?? {});

    if (resource === 'discounts') {
      const wrong = checkDiscount(data);
      if (wrong) return badRequest(wrong);
    }

    if (resource === 'redirects') {
      const wrong = checkRedirect(data, existing);
      if (wrong) return badRequest(wrong);
    }

    const nextParents = resource === 'collections' ? wantedParents(body) : undefined;
    if (nextParents) {
      const wrong = await checkCollectionParents(nextParents, id);
      if (wrong) return badRequest(wrong);
      data.parentId = nextParents[0] ?? null;
    }

    // Membership goes first: if the list looks like it arrived empty by
    // mistake this refuses before anything at all has been written.
    if (resource === 'collections' && Array.isArray(body?.memberIds)) {
      const wrong = await syncCollectionMembers(
        id,
        body.memberIds.map(String),
        body?.allowEmptying === true
      );
      if (wrong) return badRequest(wrong);
    }

    if (resource === 'users' && body?.password) {
      const password = String(body.password);
      if (password.length < 8) return badRequest('Password must be at least 8 characters.');
      data.passwordHash = await hashPassword(password);
    }

    // A system page keeps its slug so its route never breaks.
    if (resource === 'pages' && existing.isSystem) delete data.slug;
    else if (cfg.slugField && data[cfg.slugField] !== undefined) {
      await ensureSlug(cfg, data, id);
    }

    const row = await m.update({ where: { id }, data, include: cfg.include });

    if (nextParents) await syncCollectionParents(id, nextParents);
    if (resource === 'products') await syncProductRelations(id, body);
    if (resource === 'pages' && body?.blocks !== undefined) {
      await snapshot(id, row.blocks, user.id, body?.revisionLabel);
    }

    bump(resource, cfg, row);
    if (resource === 'pages' && existing.slug !== row.slug) bump(resource, cfg, existing);

    return json({ item: plain(row) });
  } catch (err) {
    return handleWriteError(err);
  }
}

// ------------------------------------------------------------------ DELETE

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getAccessor();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
  // The menu hides areas an account cannot use; this is what actually stops
  // them being reached, since the endpoints are guessable.
  if (!canUseResource(user, path[0])) return forbidden();
  const [resource, id] = path;
  const cfg = RESOURCES[resource];
  if (!cfg) return badRequest(`Unknown resource "${resource}"`);
  if (!id) return badRequest('An id is required.');

  try {
    const m = model(cfg);
    const row = await m.findUnique({ where: { id } });
    if (!row) return json({ error: 'Not found' }, 404);

    if (cfg.protectedWhen?.(row)) {
      return badRequest('This item is part of the site structure and cannot be deleted.');
    }
    if (resource === 'users') {
      if (row.id === user.id) return badRequest('You cannot delete your own account.');
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (row.role === 'ADMIN' && admins <= 1) {
        return badRequest('At least one admin account must remain.');
      }
    }

    if (resource === 'media' && typeof row.url === 'string') {
      const force = new URL(_req.url).searchParams.get('force') === '1';
      const used = await findMediaUsage(row.url);

      if (used.length && !force) {
        return json(
          {
            error:
              'That image is still used in ' +
              used.length +
              (used.length === 1 ? ' place. ' : ' places. ') +
              'Replace it there first, or delete it anyway to leave those spots empty.',
            reason: 'media_in_use',
            usedBy: used.slice(0, 12),
          },
          409
        );
      }
    }

    // Pages need the store's address to refresh; load it before it goes.
    const full = cfg.include ? ((await m.findUnique({ where: { id }, include: cfg.include })) ?? row) : row;

    // Nothing is erased here: it moves to Trash with everything that belongs
    // to it. A media file's bytes stay until it is deleted forever from Trash.
    const moved = await moveToTrash(resource, id, { id: user.id, name: user.name || user.email });

    bump(resource, cfg, full);
    return json({ ok: true, trashed: { id: moved.trashId, label: moved.label, detail: moved.detail } });
  } catch (err) {
    if (err instanceof TrashError) return json({ error: err.message }, err.status);
    return handleWriteError(err);
  }
}

// ------------------------------------------------------------------ helpers

/**
 * Everywhere a media URL is referenced. Deleting a file that is still in use
 * leaves a dead image on a live page — and now that the bytes live in the
 * database, that loss is permanent rather than merely until the next upload.
 */
async function findMediaUsage(url: string) {
  const used: string[] = [];

  const [pages, collections, images, packages, settings] = await Promise.all([
    prisma.page.findMany({ select: { slug: true, blocks: true } }),
    prisma.collection.findMany({
      select: { handle: true, blocks: true, bannerUrl: true, thumbUrl: true },
    }),
    prisma.productImage.findMany({
      where: { url },
      select: { product: { select: { title: true } } },
    }),
    prisma.teamPackage.findMany({ where: { imageUrl: url }, select: { name: true } }),
    prisma.setting.findMany(),
  ]);

  const mentions = (value: unknown) => JSON.stringify(value ?? '').includes(url);

  for (const page of pages) {
    if (mentions(page.blocks)) used.push('page: ' + page.slug);
  }
  for (const col of collections) {
    if (col.bannerUrl === url || col.thumbUrl === url || mentions(col.blocks)) {
      used.push('collection: ' + col.handle);
    }
  }
  for (const img of images) {
    used.push('product: ' + (img.product?.title ?? 'unknown'));
  }
  for (const pkg of packages) {
    used.push('package: ' + pkg.name);
  }
  for (const setting of settings) {
    if (mentions(setting.value)) used.push('site settings (logo or similar)');
  }

  return used;
}

async function syncProductRelations(productId: string, body: Record<string, any>) {
  if (Array.isArray(body?.images)) {
    await prisma.productImage.deleteMany({ where: { productId } });
    const rows = (body.images as { url: string; alt?: string; mediaId?: string }[])
      .filter((i) => i?.url)
      .slice(0, 12)
      .map((i, idx) => ({
        productId,
        url: String(i.url).slice(0, 512),
        alt: String(i.alt ?? '').slice(0, 200),
        mediaId: i.mediaId || null,
        position: idx,
      }));
    if (rows.length) await prisma.productImage.createMany({ data: rows });
  }

  if (Array.isArray(body?.collectionIds)) {
    await prisma.productCollection.deleteMany({ where: { productId } });
    const ids = (body.collectionIds as string[]).filter(Boolean).slice(0, 30);
    if (ids.length) {
      await prisma.productCollection.createMany({
        data: ids.map((collectionId, idx) => ({ productId, collectionId, position: idx })),
        skipDuplicates: true,
      });
      const handles = await prisma.collection.findMany({
        where: { id: { in: ids } },
        select: { handle: true },
      });
      handles.forEach((h) => {
        try {
          revalidatePath(`/collections/${h.handle}`);
        } catch {
          /* ignore */
        }
      });
    }
  }
}

async function snapshot(pageId: string, blocks: unknown, authorId: string, label?: string) {
  await prisma.pageRevision.create({
    data: { pageId, blocks: blocks as object, authorId, label: label ?? null },
  });
  // Keep the last 30 revisions per page.
  const old = await prisma.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: 'desc' },
    skip: 30,
    select: { id: true },
  });
  if (old.length) {
    await prisma.pageRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
}

async function stats() {
  const [products, collections, pages, quotes, newQuotes, contacts, newContacts, recentQuotes] =
    await Promise.all([
      prisma.product.count(),
      prisma.collection.count(),
      prisma.page.count(),
      prisma.quoteRequest.count(),
      prisma.quoteRequest.count({ where: { status: 'NEW' } }),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.quoteRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          reference: true,
          team: true,
          name: true,
          subject: true,
          status: true,
          estTotal: true,
          createdAt: true,
        },
      }),
    ]);

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [quotes30, pipeline] = await Promise.all([
    prisma.quoteRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.quoteRequest.aggregate({
      where: { status: { in: ['NEW', 'IN_PROGRESS', 'QUOTED'] } },
      _sum: { estTotal: true },
    }),
  ]);

  return json({
    products,
    collections,
    pages,
    quotes,
    newQuotes,
    contacts,
    newContacts,
    quotes30,
    pipeline: Number(pipeline._sum.estTotal ?? 0),
    recentQuotes: plain(recentQuotes),
  });
}

/** What a person calls the columns the database insists are unique. */
const UNIQUE_LABEL: Record<string, string> = {
  from: 'old address',
  code: 'code',
  handle: 'handle',
  slug: 'address',
  email: 'email address',
  path: 'address',
  reference: 'reference',
};

/**
 * The column a unique clash tripped on, whichever way the driver names it.
 *
 * MySQL reports the index rather than the field, so `Redirect_from_key` has
 * to be read back down to `from`.
 */
function clashedField(err: unknown): string | null {
  const target = (err as { meta?: { target?: unknown } })?.meta?.target;
  const raw = Array.isArray(target) ? String(target[0] ?? '') : String(target ?? '');
  if (!raw) return null;
  if (raw in UNIQUE_LABEL) return raw;
  const parts = raw.replace(/_key$|_unique$/i, '').split('_');
  return parts.length > 1 ? parts.slice(1).join('_') : parts[0];
}

function handleWriteError(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('Unique constraint')) {
    const field = clashedField(err);
    const label = field ? (UNIQUE_LABEL[field] ?? field) : null;
    return badRequest(
      label
        ? `That ${label} is already used by another record. Change it, or edit the one that has it.`
        : 'That handle or email is already taken.'
    );
  }
  if (
    message.includes('must be a number') ||
    message.includes('is not valid JSON') ||
    message.includes('is not a valid date') ||
    message.includes('at least')
  ) {
    return badRequest(message);
  }
  return serverError(err);
}
