import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { redirectAwayIfMoved } from '@/lib/not-found';
import { prisma } from '@/lib/db';
import { getCatalogFacets, getCollectionByHandle } from '@/lib/queries';
import { CatalogView, type CatalogSearchParams } from '@/components/site/CatalogView';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { PageHeaderBlock } from '@/components/blocks/sections';
import { JsonLd } from '@/components/site/JsonLd';
import { SITE_URL, breadcrumbLd, pageDescription, pageTitle } from '@/lib/seo';
import { getSettings } from '@/lib/settings';

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
  const [c, s, facets] = await Promise.all([
    getCollectionByHandle(handle),
    getSettings(),
    // Already read once for every page and held; see lib/cache.ts.
    getCatalogFacets(),
  ]);
  if (!c) return {};
  const stocked = facets.collections.find((f) => f.handle === handle)?.count ?? 0;
  const title = pageTitle(c.seoTitle || c.title, s.siteName);
  // A collection with nothing written about it still needs a sentence, or
  // Google writes one out of whatever text the page happens to start with.
  const description = pageDescription(
    c.seoDescription,
    c.description,
    c.subtitle,
    `Custom ${c.title.trim().toLowerCase()} from ${s.siteName} — sublimated in-house, names and numbers included, free digital mockup in 24 hours.`
  );
  const banner = c.bannerUrl && !/^https?:/i.test(c.bannerUrl) ? `${SITE_URL}${c.bannerUrl}` : c.bannerUrl;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/collections/${handle}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/collections/${handle}`,
      images: banner ? [banner] : undefined,
    },
    twitter: {
      card: banner ? 'summary_large_image' : 'summary',
      title,
      description,
      images: banner ? [banner] : undefined,
    },
    /*
     * A shelf with nothing on it is asked not to be indexed.
     *
     * Three collections are set up ahead of the products that will fill them.
     * Indexed empty, they are the thin page a search engine counts against
     * the whole site — and a visitor who lands on one sees nothing for sale.
     * Links are still followed, and the moment a product is filed here the
     * page indexes itself again, because this is read from the live count
     * rather than a flag somebody has to remember to turn off.
     */
    robots: stocked === 0 ? { index: false, follow: true } : undefined,
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
  if (!collection) {
    await redirectAwayIfMoved(`/collections/${handle}`);
    notFound();
  }

  const blocks = Array.isArray(collection.blocks) ? collection.blocks : [];
  // Its own products plus those of its sub-collections: a parent collection
  // lists them all, so it is only an empty shelf when the children are empty too.
  const [stocked, parent] = await Promise.all([
    prisma.product.count({
      where: {
        status: 'PUBLISHED',
        collections: {
          some: {
            collection: {
              OR: [
                { id: collection.id },
                { parentLinks: { some: { parentId: collection.id } } },
              ],
            },
          },
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
        {/* The catalogue view emits its own trail; this branch is not one. */}
        <JsonLd
          data={breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Collections', path: '/collections' },
            ...(parent ? [{ name: parent.title, path: `/collections/${parent.handle}` }] : []),
            { name: collection.title.trim(), path: `/collections/${handle}` },
          ])}
        />
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
        bodyCopy={collection.bodyCopy}
        searchParams={sp}
      />
      {collection.blocks ? <BlockRenderer blocks={collection.blocks} /> : null}
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/collections' },
          ...(parent ? [{ name: parent.title, path: `/collections/${parent.handle}` }] : []),
          { name: collection.title.trim(), path: `/collections/${handle}` },
        ])}
      />
    </>
  );
}
