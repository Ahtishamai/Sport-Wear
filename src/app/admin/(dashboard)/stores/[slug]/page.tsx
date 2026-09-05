import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { dateToStoreInput } from '@/lib/utils';
import { StoreEditor, type EditableStore } from '@/components/admin/StoreEditor';

export const dynamic = 'force-dynamic';

/**
 * datetime-local wants `YYYY-MM-DDTHH:mm`, and the store clock is the one the
 * admin means — not the timezone whichever machine renders this page is set to.
 */
const toLocalInput = dateToStoreInput;

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = await prisma.teamStore.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { position: 'asc' } },
      items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  if (!store) notFound();

  const editable: EditableStore = {
    id: store.id,
    slug: store.slug,
    name: store.name,
    intro: store.intro ?? '',
    logoUrl: store.logoUrl ?? '',
    heroUrl: store.heroUrl ?? '',
    status: store.status,
    opensAt: toLocalInput(store.opensAt),
    closesAt: toLocalInput(store.closesAt),
    shipNote: store.shipNote ?? '',
    contactNote: store.contactNote ?? '',
    seoTitle: store.seoTitle ?? '',
    seoDescription: store.seoDescription ?? '',
    categories: store.categories.map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
      // Saved categories key off their real id; only new ones need a temp key.
      tempId: c.id,
    })),
    items: store.items.map((i) => ({
      id: i.id,
      name: i.name,
      categoryKey: i.categoryId ?? '',
      category: i.category,
      description: i.description ?? '',
      price: Number(i.price),
      images: ((i.images as { url: string; alt?: string }[] | null) ?? []).filter((x) => x?.url),
      sizes: ((i.sizes as string[] | null) ?? []).filter(Boolean),
      options: ((i.options as { name: string; values: string[] }[] | null) ?? []).filter(
        (o) => o?.name
      ),
      allowName: i.allowName,
      namePrice: Number(i.namePrice),
      allowNumber: i.allowNumber,
      numberPrice: Number(i.numberPrice),
      position: i.position,
      status: i.status,
    })),
  };

  return <StoreEditor store={editable} />;
}
