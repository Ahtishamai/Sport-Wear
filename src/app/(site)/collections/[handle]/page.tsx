import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCollectionByHandle } from '@/lib/queries';
import { CatalogView, type CatalogSearchParams } from '@/components/site/CatalogView';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { PageHeaderBlock } from '@/components/blocks/sections';

export const revalidate = 120;

/*
 * No generateStaticParams here, unlike the product pages.
 *
 * This page reads searchParams — the sort, the price cap, the fabric filters —
 * and a route that both declares static params and reads the request cannot be
 * rendered: Next refuses with DYNAMIC_SERVER_USAGE and serves a 500. It is
 * rendered on demand instead and cached for the two minutes above, which is
 * what /collections (the same view, no params to declare) already does.
 */

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
  // Its own products plus those of its sub-collections: a parent collection
  // lists them all, so it is only an empty shelf when the children are empty too.
  const [stocked, parent] = await Promise.all([
    prisma.product.count({
      where: {
        status: 'PUBLISHED',
        collections: {
          some: { collection: { OR: [{ id: collection.id }, { parentId: collection.id }] } },
        },
      },
    }),
    collection.parentId
      ? prisma.collection.findUnique({
          where: { id: collection.parentId },
          select: { handle: true, title: true },
        })
      : null,
  ]);

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
            ...(parent ? [{ label: parent.title, href: `/collections/${parent.handle}` }] : []),
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
