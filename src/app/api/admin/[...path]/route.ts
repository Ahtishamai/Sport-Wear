import { revalidatePath } from 'next/cache';
import { prisma, plain } from '@/lib/db';
import { badRequest, json, serverError, unauthorized } from '@/lib/api';
import { getSession, hashPassword } from '@/lib/auth';
import { coerce, ensureSlug, RESOURCES, type ResourceConfig } from '@/lib/resources';
import { saveSettings } from '@/lib/settings';
import { savePaymentSecret, paypalSecretSummary } from '@/lib/payments';

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

function bump(cfg: ResourceConfig, row: Record<string, any>) {
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
  const user = await getSession();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
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
  const user = await getSession();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
  const [resource, action] = path;

  try {
    const body = await req.json().catch(() => ({}));

    // ---- settings (singleton) ----
    if (resource === 'settings') {
      // The PayPal secret is stored apart from site settings and never sent
      // back to the browser. An empty value means "leave it alone", so the
      // form can be saved without the admin re-entering it.
      const { paypalSecret, ...rest } = (body ?? {}) as Record<string, unknown>;
      if (typeof paypalSecret === 'string' && paypalSecret.trim()) {
        await savePaymentSecret(paypalSecret);
      }
      const value = await saveSettings(rest);
      revalidatePath('/', 'layout');
      return json({ settings: value, paypalSecret: await paypalSecretSummary() });
    }

    const cfg = RESOURCES[resource];
    if (!cfg) return badRequest(`Unknown resource "${resource}"`);
    const m = model(cfg);

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
      bump(cfg, order[0] ?? {});
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

    await ensureSlug(cfg, data);

    const row = await m.create({ data, include: cfg.include });

    if (resource === 'products') await syncProductRelations(row.id, body);
    if (resource === 'pages') await snapshot(row.id, row.blocks, user.id, 'Created');

    bump(cfg, row);
    return json({ item: plain(row) }, 201);
  } catch (err) {
    return handleWriteError(err);
  }
}

// ------------------------------------------------------------------ PATCH

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSession();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
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

    if (resource === 'products') await syncProductRelations(id, body);
    if (resource === 'pages' && body?.blocks !== undefined) {
      await snapshot(id, row.blocks, user.id, body?.revisionLabel);
    }

    bump(cfg, row);
    if (resource === 'pages' && existing.slug !== row.slug) bump(cfg, existing);

    return json({ item: plain(row) });
  } catch (err) {
    return handleWriteError(err);
  }
}

// ------------------------------------------------------------------ DELETE

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSession();
  if (!user) return unauthorized();

  const { path } = await ctx.params;
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

    await m.delete({ where: { id } });

    // Media rows own their bytes; drop them so deleting a file actually
    // reclaims the space rather than orphaning a blob.
    if (resource === 'media' && typeof row.url === 'string') {
      await prisma.uploadedFile.deleteMany({ where: { path: row.url } });
    }

    bump(cfg, row);
    return json({ ok: true });
  } catch (err) {
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

function handleWriteError(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('Unique constraint')) {
    return badRequest('That handle or email is already taken.');
  }
  if (
    message.includes('must be a number') ||
    message.includes('is not valid JSON') ||
    message.includes('at least')
  ) {
    return badRequest(message);
  }
  return serverError(err);
}
