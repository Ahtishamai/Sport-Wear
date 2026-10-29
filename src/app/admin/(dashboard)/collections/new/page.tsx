import { prisma } from '@/lib/db';
import { CollectionEditor, type EditableCollection } from '@/components/admin/CollectionEditor';
import { loadProductOptions } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

const BLANK: EditableCollection = {
  handle: '',
  title: '',
  subtitle: '',
  description: '',
  bannerUrl: '',
  thumbUrl: '',
  status: 'PUBLISHED',
  position: 0,
  showInNav: true,
  parentId: null,
  seoTitle: '',
  seoDescription: '',
  blocks: [],
};

export default async function NewCollection() {
  const [products, parents] = await Promise.all([
    loadProductOptions(),
    prisma.collection.findMany({
      where: { parentLinks: { none: {} } },
      orderBy: { position: 'asc' },
      select: { id: true, title: true },
    }),
  ]);
  return (
    <CollectionEditor collection={BLANK} products={products} memberIds={[]} parents={parents} />
  );
}
