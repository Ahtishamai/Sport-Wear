import { notFound } from 'next/navigation';
import { prisma, plain } from '@/lib/db';
import { CollectionEditor, type EditableCollection } from '@/components/admin/CollectionEditor';
import { loadProductOptions } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function EditCollection({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [collection, products] = await Promise.all([
    prisma.collection.findUnique({ where: { handle } }),
    loadProductOptions(),
  ]);

  if (!collection) notFound();

  const memberIds = products.filter((p) => p.collectionIds.includes(collection.id)).map((p) => p.id);

  // Only the primary collections can be a parent, and never itself: that is
  // what keeps the tree two levels deep and loop-free.
  const [parents, childCount] = await Promise.all([
    prisma.collection.findMany({
      where: { parentId: null, id: { not: collection.id } },
      orderBy: { position: 'asc' },
      select: { id: true, title: true },
    }),
    prisma.collection.count({ where: { parentId: collection.id } }),
  ]);

  return (
    <CollectionEditor
      collection={plain(collection) as unknown as EditableCollection}
      products={products}
      memberIds={memberIds}
      parents={parents}
      childCount={childCount}
    />
  );
}
