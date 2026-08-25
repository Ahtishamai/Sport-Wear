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

  return (
    <CollectionEditor
      collection={plain(collection) as unknown as EditableCollection}
      products={products}
      memberIds={memberIds}
    />
  );
}
