import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { redirectAwayIfMoved } from '@/lib/not-found';
import { prisma } from '@/lib/db';
import { getPage, getProductByHandle, getProductsForBlock } from '@/lib/queries';
import { RandomPick } from '@/components/blocks/RandomPick';
import { getSettings } from '@/lib/settings';
import { ProductDetail } from '@/components/site/ProductDetail';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { ProductPlateCard, Section, SectionHeading } from '@/components/blocks/primitives';
import { tierPrice } from '@/lib/utils';

export const revalidate = 300;

/**
 * Which product pages to build ahead of time.
 *
 * None, by default. Building all sixty-odd at once is what tips the deploy
 * host over its thread limit, and the pages are cached the moment they are
 * first opened anyway — so the only cost is the first visitor to each one
 * waiting a beat, against a deploy that reliably finishes.
 *
 * Set PRERENDER_PAGES=1 to build them all up front on a machine that can.
 */
export async function generateStaticParams() {
  if (process.env.PRERENDER_PAGES !== '1') return [];
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
  if (!product) {
    await redirectAwayIfMoved(`/products/${handle}`);
    notFound();
  }

  const [related, pdpExtras] = await Promise.all([
    // Random, and never the product being looked at: the same four suggestions
    // under every product told a shopper nothing new however far they browsed.
    getProductsForBlock({ source: 'featured', limit: 4, excludeId: product.id, order: 'random' }),
    getPage('product-extras'),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL || '';

  // The site-wide setting and the product's own switch; either hides the price.
  const priced = settings.showPrices !== false && product.showPrice !== false;

  // What this product actually costs, across the whole volume ladder.
  const tierPrices = (product.volumeTiers ?? []).map((t) => tierPrice(product.basePrice, t));
  const everyPrice = (tierPrices.length ? tierPrices : [product.basePrice]).filter((n) => n > 0);
  const priceRange = {
    low: everyPrice.length ? Math.min(...everyPrice) : product.basePrice,
    high: everyPrice.length ? Math.max(...everyPrice) : product.basePrice,
    count: everyPrice.length || 1,
  };

  // The collection it is filed in, so the trail reads the way the site does.
  const home = product.collections[0];

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
        // Hiding the figure in the markup is not hiding it: ProductDetail is a
        // client component, so whatever it is handed is serialised into the
        // page source where anyone can read it. A quote-only product is sent
        // no price and no discount table at all.
        product={priced ? product : { ...product, basePrice: 0, volumeTiers: [] }}
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
          <RandomPick
            id="related"
            count={4}
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}
          >
            {related.map((p) => (
              <ProductPlateCard key={p.id} p={p} showPrice={settings.showPrices !== false} />
            ))}
          </RandomPick>
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
            // A hidden price must stay hidden here too. Left in, the figure
            // would still surface in Google's result for a product whose page
            // says "Request a quote", which is worse than showing no price.
            category: product.categoryLabel || undefined,
            itemCondition: 'https://schema.org/NewCondition',
            ...(priced
              ? {
                  offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'USD',
                    // The ladder, not the headline figure: one shirt costs the
                    // most and a big order the least, so the range a result
                    // shows is "from $20 to $50" rather than "from $50".
                    lowPrice: priceRange.low,
                    highPrice: priceRange.high,
                    offerCount: priceRange.count,
                    availability: 'https://schema.org/InStock',
                    url: `${base}/products/${product.handle}`,
                  },
                }
              : {}),
            /*
             * No aggregateRating.
             *
             * Reviews on this site are about the shop, not about one jersey,
             * so there is no honest figure to put here — and a number that
             * cannot be traced to reviews on the page is the thing search
             * engines take manual action over. The price ladder above is the
             * rich result this page has earned.
             */
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
              { name: 'Home', path: '/' },
              { name: 'Collections', path: '/collections' },
              // The collection it belongs to, when it has one: the trail a
              // shopper walked, rather than a jump from the index.
              ...(home ? [{ name: home.title.trim(), path: `/collections/${home.handle}` }] : []),
              { name: product.title.trim(), path: `/products/${product.handle}` },
            ].map((step, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: step.name,
              item: `${base}${step.path}`,
            })),
          }),
        }}
      />
    </>
  );
}
