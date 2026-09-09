import 'server-only';
import { prisma } from './db';
import { ensureSlug, RESOURCES } from './resources';

/**
 * Copies a product, ready to be edited into a different one.
 *
 * Most of a product is the part nobody wants to retype — the size run, the
 * colourways, the volume tiers, the spec answers, the trust points. Those are
 * copied verbatim. Three things deliberately are not:
 *
 *  - **Status.** The copy is a DRAFT. A duplicate is half-finished by
 *    definition, and a near-identical product appearing in the shop the moment
 *    someone clicks Duplicate is the wrong default.
 *  - **The SKU.** It identifies one product; two products sharing one is a
 *    data error waiting to be noticed at the worst moment.
 *  - **The handle.** A new one is derived from the copy's title, with a number
 *    appended if that is taken too.
 *
 * The images point at the same uploaded files rather than copying the bytes,
 * so duplicating costs nothing and deleting the copy cannot orphan them.
 */
export async function duplicateProduct(id: string) {
  const source = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: 'asc' } },
      collections: { orderBy: { position: 'asc' } },
    },
  });
  if (!source) return null;

  const draft: Record<string, unknown> = { title: `${source.title} (copy)` };
  await ensureSlug(RESOURCES.products, draft);

  // Prisma wants `undefined` for "leave this JSON column at its default";
  // passing null through would try to write a JSON null instead.
  const json = <T,>(v: T) => (v ?? undefined) as NonNullable<T> | undefined;

  return prisma.product.create({
    data: {
      handle: String(draft.handle),
      title: String(draft.title),
      subtitle: source.subtitle,
      description: source.description,
      basePrice: source.basePrice,
      compareAt: source.compareAt,
      badge: source.badge,
      categoryLabel: source.categoryLabel,
      status: 'DRAFT',
      featured: source.featured,
      position: source.position,
      sku: null,
      showPrice: source.showPrice,
      sports: json(source.sports),
      colorways: json(source.colorways),
      sizes: json(source.sizes),
      defaultQty: json(source.defaultQty),
      volumeTiers: json(source.volumeTiers),
      specs: json(source.specs),
      trustPoints: json(source.trustPoints),
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      images: {
        create: source.images.map((i) => ({
          url: i.url,
          alt: i.alt,
          position: i.position,
          mediaId: i.mediaId,
        })),
      },
      collections: {
        create: source.collections.map((c) => ({
          collectionId: c.collectionId,
          position: c.position,
        })),
      },
    },
  });
}
