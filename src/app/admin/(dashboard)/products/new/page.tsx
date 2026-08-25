import { prisma } from '@/lib/db';
import { ProductEditor, type EditableProduct } from '@/components/admin/ProductEditor';
import { DEFAULT_TIERS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const BLANK: EditableProduct = {
  handle: '',
  title: '',
  subtitle: '',
  description: '',
  basePrice: 35,
  compareAt: null,
  badge: '',
  categoryLabel: 'Fully customizable',
  status: 'DRAFT',
  featured: false,
  position: 0,
  sku: '',
  sports: ['Baseball', 'Softball', 'Other'],
  colorways: [
    { name: 'Navy / Gold', from: '#16264B', to: '#FFD100' },
    { name: 'Black / Red', from: '#1A1A1A', to: '#C42027' },
    { name: 'Royal / White', from: '#1B4FD8', to: '#F2F2EF' },
  ],
  sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  defaultQty: { S: 2, M: 4, L: 4, XL: 2 },
  volumeTiers: DEFAULT_TIERS,
  specs: [
    { q: 'Fabric & construction', a: '' },
    { q: 'Customization included', a: '' },
    { q: 'Sizing & fit', a: '' },
    { q: 'Turnaround & shipping', a: '' },
    { q: 'Minimums & reorders', a: '' },
  ],
  trustPoints: ['No deposit to get a quote', 'Names & numbers included', 'Reorders anytime'],
  seoTitle: '',
  seoDescription: '',
  images: [],
  collections: [],
};

export default async function NewProduct() {
  const collections = await prisma.collection.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, title: true, handle: true },
  });
  return <ProductEditor product={BLANK} collections={collections} />;
}
