import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCollectionByHandle } from '@/lib/queries';
import { CatalogView, type CatalogSearchParams } from '@/components/site/CatalogView';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { PageHeaderBlock } from '@/components/blocks/sections';

export const revalidate = 120;

/** Built on first visit, like the product pages — see the note there. */
export async function generateStaticParams() {
  if (process.env.PRERENDER_PAGES !== '1') return [];
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

  const blocks = Array.isArray(collection.blocks) ? collection.blocks : [];
  const stocked = await prisma.productCollection.count({
    where: { collectionId: collection.id, product: { status: 'PUBLISHED' } },
  });

  // A collection that holds no products but has sections of its own is a
  // landing page — a choice of what to look at next. Showing it as a catalogue
  // would greet people with "nothing matches those filters" and a price slider
  // for an empty shelf.
  if (stocked === 0 && blocks.length > 0) {
    return (
      <>
        <PageHeaderBlock
          p={{
            eyebrow: collection.subtitle ?? '',
            heading: collection.title,
            body: collection.description ?? '',
            image: collection.bannerUrl ?? '',
            showBreadcrumb: true,
          }}
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'Collections', href: '/collections' },
            { label: collection.title },
          ]}
        />
        <BlockRenderer blocks={blocks} />
      </>
    );
  }

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
