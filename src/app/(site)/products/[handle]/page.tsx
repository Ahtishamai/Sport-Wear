import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPage, getProductByHandle, getProductsForBlock } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { ProductDetail } from '@/components/site/ProductDetail';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { ProductPlateCard, Section, SectionHeading } from '@/components/blocks/primitives';

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const rows = await prisma.product.findMany({
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
  const p = await getProductByHandle(handle);
  if (!p) return {};
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.description.slice(0, 160),
    alternates: { canonical: `/products/${handle}` },
    openGraph: {
      type: 'website',
      title: p.seoTitle || p.title,
      description: p.seoDescription || p.description.slice(0, 160),
      images: p.images[0] ? [p.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [product, settings] = await Promise.all([getProductByHandle(handle), getSettings()]);
  if (!product) notFound();

  const [related, pdpExtras] = await Promise.all([
    getProductsForBlock({ source: 'featured', limit: 4, excludeId: product.id }),
    getPage('product-extras'),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL || '';

  return (
    <>
      <nav aria-label="Breadcrumb" className="gutter pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-muted">
          <li>
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/collections" className="hover:text-ink">
              Collections
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink">{product.title}</li>
        </ol>
      </nav>

      <ProductDetail
        product={product}
        urgencyLine="In production now · 6 teams this week"
        showPrices={settings.showPrices !== false}
      />

      {pdpExtras && (
        <BlockRenderer blocks={pdpExtras.blocks} context={{ excludeProductId: product.id }} />
      )}

      {related.length > 0 && (
        <Section background="surface">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading heading="Complete the kit" className="!mb-0" />
            <Link
              href="/collections"
              className="border-b-2 border-brand pb-1 text-[13px] font-semibold uppercase tracking-[.1em]"
            >
              All products →
            </Link>
          </div>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}
          >
            {related.map((p) => (
              <ProductPlateCard key={p.id} p={p} showPrice={settings.showPrices !== false} />
            ))}
          </div>
        </Section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            description: product.description,
            image: product.images.map((i) => (base ? `${base}${i.url}` : i.url)),
            brand: { '@type': 'Brand', name: settings.siteName },
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: product.basePrice,
              availability: 'https://schema.org/InStock',
              url: `${base}/products/${product.handle}`,
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '128',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Collections',
                item: `${base}/collections`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: product.title,
                item: `${base}/products/${product.handle}`,
              },
            ],
          }),
        }}
      />
    </>
  );
}
