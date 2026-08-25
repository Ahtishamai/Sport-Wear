import { notFound } from 'next/navigation';
import { prisma, plain } from '@/lib/db';
import { ProductEditor, type EditableProduct } from '@/components/admin/ProductEditor';

export const dynamic = 'force-dynamic';

export default async function EditProduct({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const [product, collections] = await Promise.all([
    prisma.product.findUnique({
      where: { handle },
      include: {
        images: { orderBy: { position: 'asc' } },
        collections: { select: { collection: { select: { id: true } } } },
      },
    }),
    prisma.collection.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, title: true, handle: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <ProductEditor
      product={plain(product) as unknown as EditableProduct}
      collections={collections}
    />
  );
}
