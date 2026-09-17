import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './db';

/**
 * Trash: deleting in the admin never erases.
 *
 * A delete copies the record, everything that goes with it and every link other
 * records had to it into `trash_items`, and only then removes it from the live
 * tables. Keeping trashed rows out of the live tables — rather than flagging
 * them — is deliberate: the storefront, checkout, emails and reports are all
 * written against those tables, and a flag every one of them has to remember
 * to check is a trashed store still taking orders the first time one forgets.
 *
 * Restore puts everything back with its original ids, so links from elsewhere
 * (an order line to its design, a quote to its product) are re-pointed too.
 * Only "Delete forever" erases, and only from Trash.
 */

type Tx = Prisma.TransactionClient;
type Row = Record<string, any>;
// Prisma's delegates share no useful common type; they are reached by name.
const table = (client: Tx | typeof prisma, model: string) => (client as any)[model];

export class TrashError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

// ------------------------------------------------------------------ specs

type Ref = { fk: string; model: string };

type Child = {
  /** Key in the snapshot. */
  key: string;
  model: string;
  /** Singular / plural, for "36 designs". */
  noun: [string, string];
  where: (id: string) => Row;
  /**
   * Rows the database will not remove on its own (a restricted relation), so
   * they are deleted by id — only the ids that were copied, so a row that
   * arrives mid-delete makes the delete fail rather than vanish uncopied.
   */
  deleteByHand?: boolean;
  /** Links cleared on restore when what they point at is gone. */
  optional?: Ref[];
  /** Links without which the row cannot exist; it is left out on restore. */
  required?: Ref[];
};

type Spec = {
  model: string;
  /** What a person calls one of these, for the Trash screen. */
  kind: string;
  label: (row: Row, tx: Tx) => Promise<string> | string;
  children?: Child[];
  /** Records elsewhere whose link to this one the delete clears. */
  relinks?: { key: string; model: string; fk: string }[];
  /** A record that must exist for this one to come back. */
  parent?: { fk: string; model: string; resource: string; noun: string };
  /** Links on the record itself, cleared on restore if their target is gone. */
  optional?: Ref[];
  /** Fields that must stay unique. A clash on restore renames, or refuses. */
  unique?: { field: string; onClash: 'suffix' | 'refuse'; scope?: string }[];
};

const clip = (s: unknown, n = 80) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

const storeName = async (tx: Tx, storeId: string) =>
  (await tx.teamStore.findUnique({ where: { id: storeId }, select: { name: true } }))?.name ?? 'a store';

export const TRASH: Record<string, Spec> = {
  storeOrders: {
    model: 'storeOrder',
    kind: 'Store order',
    label: (r) => `Order ${r.reference}${r.customerName ? ` — ${clip(r.customerName, 60)}` : ''}`,
    children: [
      {
        key: 'lines',
        model: 'storeOrderItem',
        noun: ['item', 'items'],
        where: (id) => ({ orderId: id }),
        optional: [{ fk: 'itemId', model: 'teamStoreItem' }],
      },
    ],
    parent: { fk: 'storeId', model: 'teamStore', resource: 'stores', noun: 'store' },
    unique: [
      { field: 'reference', onClash: 'refuse' },
      { field: 'paypalOrderId', onClash: 'refuse' },
    ],
  },

  invoicePayments: {
    model: 'invoicePayment',
    kind: 'Invoice payment',
    label: (r) => `Payment ${r.reference} — invoice ${clip(r.invoiceNumber, 40)}`,
    unique: [
      { field: 'reference', onClash: 'refuse' },
      { field: 'paypalOrderId', onClash: 'refuse' },
    ],
  },

  stores: {
    model: 'teamStore',
    kind: 'Team store',
    label: (r) => `${clip(r.name, 80)} (team store)`,
    // Restored in this order: sections before the designs that sit in them,
    // designs before the order lines that point at them.
    children: [
      { key: 'sections', model: 'storeCategory', noun: ['section', 'sections'], where: (id) => ({ storeId: id }) },
      {
        key: 'designs',
        model: 'teamStoreItem',
        noun: ['design', 'designs'],
        where: (id) => ({ storeId: id }),
        optional: [{ fk: 'categoryId', model: 'storeCategory' }],
      },
      {
        key: 'orders',
        model: 'storeOrder',
        noun: ['order', 'orders'],
        where: (id) => ({ storeId: id }),
        // Orders do not cascade from a store; they are removed by hand.
        deleteByHand: true,
      },
      {
        key: 'orderLines',
        model: 'storeOrderItem',
        noun: ['order line', 'order lines'],
        where: (id) => ({ order: { storeId: id } }),
        optional: [{ fk: 'itemId', model: 'teamStoreItem' }],
      },
    ],
    unique: [{ field: 'slug', onClash: 'suffix' }],
  },

  storeItems: {
    model: 'teamStoreItem',
    kind: 'Store design',
    label: async (r, tx) => `${clip(r.name, 70)} — ${await storeName(tx, r.storeId)}`,
    relinks: [{ key: 'orderLines', model: 'storeOrderItem', fk: 'itemId' }],
    parent: { fk: 'storeId', model: 'teamStore', resource: 'stores', noun: 'store' },
    optional: [{ fk: 'categoryId', model: 'storeCategory' }],
  },

  storeCategories: {
    model: 'storeCategory',
    kind: 'Store section',
    label: async (r, tx) => `${clip(r.name, 60)} section — ${await storeName(tx, r.storeId)}`,
    relinks: [{ key: 'designs', model: 'teamStoreItem', fk: 'categoryId' }],
    parent: { fk: 'storeId', model: 'teamStore', resource: 'stores', noun: 'store' },
    unique: [{ field: 'name', onClash: 'suffix', scope: 'storeId' }],
  },

  products: {
    model: 'product',
    kind: 'Product',
    label: (r) => clip(r.title, 90),
    children: [
      {
        key: 'images',
        model: 'productImage',
        noun: ['image', 'images'],
        where: (id) => ({ productId: id }),
        optional: [{ fk: 'mediaId', model: 'media' }],
      },
      {
        key: 'collectionLinks',
        model: 'productCollection',
        noun: ['collection', 'collections'],
        where: (id) => ({ productId: id }),
        required: [{ fk: 'collectionId', model: 'collection' }],
      },
    ],
    relinks: [{ key: 'quotes', model: 'quoteRequest', fk: 'productId' }],
    unique: [{ field: 'handle', onClash: 'suffix' }],
  },

  collections: {
    model: 'collection',
    kind: 'Collection',
    label: (r) => `${clip(r.title, 80)} collection`,
    children: [
      {
        key: 'productLinks',
        model: 'productCollection',
        noun: ['product in it', 'products in it'],
        where: (id) => ({ collectionId: id }),
        required: [{ fk: 'productId', model: 'product' }],
      },
    ],
    unique: [{ field: 'handle', onClash: 'suffix' }],
  },

  packages: {
    model: 'teamPackage',
    kind: 'Team package',
    label: (r) => `${clip(r.name, 70)} package`,
    unique: [{ field: 'handle', onClash: 'suffix' }],
  },

  reviews: { model: 'review', kind: 'Review', label: (r) => `Review by ${clip(r.name, 60)}` },
  faqs: { model: 'faq', kind: 'FAQ', label: (r) => clip(r.question, 90) },
  contacts: { model: 'contactMessage', kind: 'Contact message', label: (r) => `Message from ${clip(r.name, 60)}` },
  nav: { model: 'navItem', kind: 'Menu link', label: (r) => `${clip(r.label, 60)} (menu link)` },

  quotes: {
    model: 'quoteRequest',
    kind: 'Quote request',
    label: (r) => `Quote ${r.reference} — ${clip(r.team || r.name, 60)}`,
    optional: [{ fk: 'productId', model: 'product' }],
    unique: [{ field: 'reference', onClash: 'refuse' }],
  },

  media: {
    model: 'media',
    kind: 'Media file',
    label: (r) => clip(r.filename, 90),
    relinks: [{ key: 'productImages', model: 'productImage', fk: 'mediaId' }],
  },

  users: {
    model: 'user',
    kind: 'User',
    label: (r) => `${clip(r.name, 50)} <${clip(r.email, 60)}>`,
    unique: [{ field: 'email', onClash: 'refuse' }],
  },

  pages: {
    model: 'page',
    kind: 'Page',
    label: (r) => `${clip(r.title, 80)} page`,
    children: [
      { key: 'revisions', model: 'pageRevision', noun: ['saved version', 'saved versions'], where: (id) => ({ pageId: id }) },
    ],
    unique: [{ field: 'slug', onClash: 'suffix' }],
  },
};

// ------------------------------------------------------------------ helpers

type FieldInfo = { name: string; kind: string; type: string };

/** Scalar fields of a model, from Prisma's own description of the schema. */
function fieldsOf(model: string): FieldInfo[] {
  const name = model.charAt(0).toUpperCase() + model.slice(1);
  const found = Prisma.dmmf.datamodel.models.find((m) => m.name === name);
  if (!found) throw new Error(`No such model: ${model}`);
  return found.fields as unknown as FieldInfo[];
}

/**
 * A snapshot row made fit to write back.
 *
 * Relations are dropped (they are restored as rows of their own), and a JSON
 * column that was NULL is left out rather than written as null, which Prisma
 * would read as the JSON value `null` instead of an empty column.
 */
function writable(model: string, row: Row): Row {
  const out: Row = {};
  for (const f of fieldsOf(model)) {
    if (f.kind === 'object' || !(f.name in row)) continue;
    const v = row[f.name];
    if (v === null && f.type === 'Json') continue;
    if (f.type === 'Bytes') continue;
    out[f.name] = v;
  }
  return out;
}

/** JSON-safe copy: dates become ISO strings, decimals keep their exact digits. */
const freeze = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const describe = (counts: [string, string, number][]) =>
  counts
    .filter(([, , n]) => n > 0)
    .map(([one, many, n]) => `${n} ${n === 1 ? one : many}`)
    .join(', ') || null;

async function existingIds(tx: Tx, model: string, ids: unknown[]) {
  const wanted = [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];
  if (!wanted.length) return new Set<string>();
  const rows: { id: string }[] = await table(tx, model).findMany({
    where: { id: { in: wanted } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

// ------------------------------------------------------------------ preview

export type TrashPreview = {
  label: string;
  kind: string;
  contents: { noun: string; count: number }[];
};

/** What deleting this would take with it — for the warning before it happens. */
export async function previewTrash(resource: string, id: string): Promise<TrashPreview> {
  const spec = TRASH[resource];
  if (!spec) throw new TrashError('That cannot be moved to Trash.', 400);
  return prisma.$transaction(async (tx) => {
    const row = await table(tx, spec.model).findUnique({ where: { id } });
    if (!row) throw new TrashError('That was not found — it may already be in Trash.', 404);
    const contents: TrashPreview['contents'] = [];
    for (const c of spec.children ?? []) {
      const count: number = await table(tx, c.model).count({ where: c.where(id) });
      if (count) contents.push({ noun: count === 1 ? c.noun[0] : c.noun[1], count });
    }
    return { label: await spec.label(row, tx), kind: spec.kind, contents };
  });
}

// ------------------------------------------------------------------ move

export async function moveToTrash(
  resource: string,
  id: string,
  actor: { id: string; name: string }
) {
  const spec = TRASH[resource];
  // Anything without a spec is refused rather than erased: a new resource
  // added without thinking about Trash must not quietly skip it.
  if (!spec) throw new TrashError('That cannot be deleted from here.', 400);

  return prisma.$transaction(
    async (tx) => {
      // Read inside the transaction, so what is copied is what is removed.
      const row = await table(tx, spec.model).findUnique({ where: { id } });
      if (!row) throw new TrashError('That was not found — it may already be in Trash.', 404);

      const children: Record<string, Row[]> = {};
      const counts: [string, string, number][] = [];
      for (const c of spec.children ?? []) {
        children[c.key] = await table(tx, c.model).findMany({ where: c.where(id) });
        counts.push([c.noun[0], c.noun[1], children[c.key].length]);
      }

      const relinks: Record<string, string[]> = {};
      for (const r of spec.relinks ?? []) {
        const linked: { id: string }[] = await table(tx, r.model).findMany({
          where: { [r.fk]: id },
          select: { id: true },
        });
        relinks[r.key] = linked.map((x) => x.id);
      }

      const label = await spec.label(row, tx);
      const item = await tx.trashItem.create({
        data: {
          resource,
          recordId: id,
          label: label.slice(0, 255),
          detail: describe(counts)?.slice(0, 255) ?? null,
          snapshot: freeze({ v: 1, row, children, relinks }),
          deletedById: actor.id,
          deletedByName: actor.name.slice(0, 120),
        },
        select: { id: true, label: true, detail: true },
      });

      for (const c of spec.children ?? []) {
        if (!c.deleteByHand || !children[c.key].length) continue;
        await table(tx, c.model).deleteMany({ where: { id: { in: children[c.key].map((x) => x.id) } } });
      }
      await table(tx, spec.model).delete({ where: { id } });

      return { trashId: item.id, label: item.label, detail: item.detail, row };
    },
    // A store with its designs and orders is a large copy on a remote database.
    { timeout: 60_000, maxWait: 15_000 }
  );
}

// ------------------------------------------------------------------ restore

export type RestoreResult = {
  resource: string;
  label: string;
  row: Row;
  /** Anything that could not come back exactly as it was, said plainly. */
  notes: string[];
};

export async function restoreFromTrash(trashId: string): Promise<RestoreResult> {
  const item = await prisma.trashItem.findUnique({ where: { id: trashId } });
  if (!item) throw new TrashError('That is no longer in Trash.', 404);
  const spec = TRASH[item.resource];
  if (!spec) throw new TrashError('That kind of item cannot be restored.', 400);

  const snap = item.snapshot as { row: Row; children?: Record<string, Row[]>; relinks?: Record<string, string[]> };
  const row: Row = { ...snap.row };
  const notes: string[] = [];

  try {
    return await prisma.$transaction(
      async (tx) => {
        if (await table(tx, spec.model).findUnique({ where: { id: row.id }, select: { id: true } })) {
          throw new TrashError('That is already back — it exists on the site again.', 409);
        }

        if (spec.parent) {
          const parentId = row[spec.parent.fk];
          const there = await table(tx, spec.parent.model).findUnique({ where: { id: parentId }, select: { id: true } });
          if (!there) {
            const inTrash = await tx.trashItem.findFirst({
              where: { resource: spec.parent.resource, recordId: parentId },
              select: { label: true },
            });
            throw new TrashError(
              inTrash
                ? `Restore “${inTrash.label}” first — this needs its ${spec.parent.noun}, which is also in Trash.`
                : `Its ${spec.parent.noun} no longer exists, so this cannot come back.`,
              409
            );
          }
        }

        for (const o of spec.optional ?? []) {
          if (row[o.fk] && !(await existingIds(tx, o.model, [row[o.fk]])).has(row[o.fk])) {
            row[o.fk] = null;
          }
        }

        for (const u of spec.unique ?? []) {
          const value = row[u.field];
          if (value === null || value === undefined || value === '') continue;
          const clashWhere = (v: unknown) => ({
            [u.field]: v,
            ...(u.scope ? { [u.scope]: row[u.scope] } : {}),
            NOT: { id: row.id },
          });
          if (!(await table(tx, spec.model).findFirst({ where: clashWhere(value), select: { id: true } }))) continue;
          if (u.onClash === 'refuse') {
            throw new TrashError(
              `Something else now uses the same ${u.field} (“${value}”), so this cannot be restored without clashing.`,
              409
            );
          }
          // A slug or name: find a free variant and say so.
          const isSlug = /slug|handle/.test(u.field);
          let n = 1;
          let next = '';
          do {
            next = isSlug
              ? `${value}-restored${n > 1 ? `-${n}` : ''}`
              : `${value} (restored${n > 1 ? ` ${n}` : ''})`;
            n += 1;
          } while (await table(tx, spec.model).findFirst({ where: clashWhere(next), select: { id: true } }));
          notes.push(`Its ${u.field} “${value}” was taken, so it came back as “${next}”.`);
          row[u.field] = next;
        }

        await table(tx, spec.model).create({ data: writable(spec.model, row) });

        for (const c of spec.children ?? []) {
          let rows = (snap.children?.[c.key] ?? []).map((r) => ({ ...r }));
          if (!rows.length) continue;

          for (const ref of c.required ?? []) {
            const there = await existingIds(tx, ref.model, rows.map((r) => r[ref.fk]));
            const before = rows.length;
            rows = rows.filter((r) => there.has(r[ref.fk]));
            if (rows.length < before) {
              notes.push(`${before - rows.length} ${before - rows.length === 1 ? c.noun[0] : c.noun[1]} could not be relinked — what they pointed at is gone.`);
            }
          }
          for (const ref of c.optional ?? []) {
            const there = await existingIds(tx, ref.model, rows.map((r) => r[ref.fk]));
            for (const r of rows) if (r[ref.fk] && !there.has(r[ref.fk])) r[ref.fk] = null;
          }
          if (rows.length) {
            await table(tx, c.model).createMany({ data: rows.map((r) => writable(c.model, r)) });
          }
        }

        for (const r of spec.relinks ?? []) {
          const ids = snap.relinks?.[r.key] ?? [];
          if (!ids.length) continue;
          // Only records still unlinked: one pointed somewhere new since is left alone.
          await table(tx, r.model).updateMany({
            where: { id: { in: ids }, [r.fk]: null },
            data: { [r.fk]: row.id },
          });
        }

        await tx.trashItem.delete({ where: { id: trashId } });
        return { resource: item.resource, label: item.label, row, notes };
      },
      { timeout: 60_000, maxWait: 15_000 }
    );
  } catch (err) {
    if (err instanceof TrashError) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new TrashError('Part of this now clashes with something added since, so it cannot be restored as it was.', 409);
    }
    throw err;
  }
}

// ------------------------------------------------------------------ purge

/** Erases for good. The only path in the admin that does. */
export async function purgeFromTrash(trashId: string) {
  const item = await prisma.trashItem.findUnique({ where: { id: trashId } });
  if (!item) throw new TrashError('That is no longer in Trash.', 404);

  await prisma.trashItem.delete({ where: { id: trashId } });

  // A media file's bytes were kept while it sat in Trash, so pages still
  // pointing at it kept working. Erasing it is what frees them — unless a
  // different library entry now uses the same file.
  if (item.resource === 'media') {
    const url = (item.snapshot as { row?: Row })?.row?.url;
    if (typeof url === 'string' && !(await prisma.media.count({ where: { url } }))) {
      await prisma.uploadedFile.deleteMany({ where: { path: url } });
    }
  }
  return { label: item.label, resource: item.resource };
}

// ------------------------------------------------------------------ list

export async function listTrash() {
  // The snapshot never leaves the server: it can hold anything, down to a
  // user's password hash.
  return prisma.trashItem.findMany({
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      resource: true,
      recordId: true,
      label: true,
      detail: true,
      deletedAt: true,
      deletedByName: true,
    },
  });
}
