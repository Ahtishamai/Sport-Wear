import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCollectionByHandle } from '@/lib/queries';
import { CatalogView, type CatalogSearchParams } from '@/components/site/CatalogView';
import { BlockRenderer } from '@/components/blocks/Renderer';

export const revalidate = 120;

export async function generateStaticParams() {
  try {
    const rows = await prisma.collection.findMany({
      where: { status: 'PUBLISHED' },
      select: { handle: true },
    });
    return rows.map((r) => ({ handle: r.handle }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const c = await getCollectionByHandle(handle);
  if (!c) return {};
  return {
    title: c.seoTitle || c.title,
    description: c.seoDescription || c.description || c.subtitle || undefined,
    alternates: { canonical: `/collections/${handle}` },
    openGraph: {
      title: c.seoTitle || c.title,
      description: c.seoDescription || c.description || undefined,
      images: c.bannerUrl ? [c.bannerUrl] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<CatalogSearchParams>;
}) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const collection = await getCollectionByHandle(handle);
  if (!collection) notFound();

  return (
    <>
      <CatalogView
        handle={handle}
        title={collection.title}
        intro={collection.description || collection.subtitle}
        banner={collection.bannerUrl}
        searchParams={sp}
      />
      {collection.blocks ? <BlockRenderer blocks={collection.blocks} /> : null}
    </>
  );
}
