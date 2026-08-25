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
  seoTitle: '',
  seoDescription: '',
  blocks: [],
};

export default async function NewCollection() {
  const products = await loadProductOptions();
  return <CollectionEditor collection={BLANK} products={products} memberIds={[]} />;
}
