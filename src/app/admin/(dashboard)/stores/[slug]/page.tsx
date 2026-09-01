import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { StoreEditor, type EditableStore } from '@/components/admin/StoreEditor';

export const dynamic = 'force-dynamic';

/** datetime-local wants `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
function toLocalInput(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default async function EditStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = await prisma.teamStore.findUnique({
    where: { slug },
    include: { items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
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
    items: store.items.map((i) => ({
      id: i.id,
      name: i.name,
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
