import 'server-only';
import { prisma } from './db';

/** Product picker options shared by the collection editors. */
export async function loadProductOptions() {
  const rows = await prisma.product.findMany({
    orderBy: [{ position: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      handle: true,
      images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
      collections: { select: { collectionId: true } },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    image: p.images[0]?.url ?? null,
    collectionIds: p.collections.map((c) => c.collectionId),
  }));
}
