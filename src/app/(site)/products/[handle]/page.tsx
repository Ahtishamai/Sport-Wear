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
import { JsonLd } from '@/components/site/JsonLd';
import { productLd } from '@/lib/schema';
import {
  SITE_URL,
  breadcrumbLd,
  echoesTitle,
  pageDescription,
  pageTitle,
  plainText,
  productDescription,
} from '@/lib/seo';

/** The product as the page reads it; `ProductDetail` here is the component. */
type ProductRow = NonNullable<Awaited<ReturnType<typeof getProductByHandle>>>;

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
  const [p, s] = await Promise.all([getProductByHandle(handle), getSettings()]);
  if (!p) return {};

  const title = pageTitle(p.seoTitle || p.title, s.siteName);
  const description = productMeta(p, s.siteName, s.showPrices !== false);
  const image = p.images[0]?.url;
  const absolute = image && !/^https?:/i.test(image) ? `${SITE_URL}${image}` : image;

  return {
    // The root layout appends the shop's name to every title; pageTitle has
    // already decided whether it fits, so this one is final.
    title: { absolute: title },
    description,
    alternates: { canonical: `/products/${handle}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/products/${handle}`,
      images: absolute ? [absolute] : undefined,
    },
    twitter: {
      card: absolute ? 'summary_large_image' : 'summary',
      title,
      description,
      images: absolute ? [absolute] : undefined,
    },
  };
}

/**
 * The sentence under this product in a search result.
 *
 * What the shop typed wins. Then the product's own description, but only when
 * there is enough of it to be a sentence — most of these are a repeat of the
 * title, and a few name a different product altogether, which is how they were
 * found. Failing both, one is built from what is true of this product.
 */
function productMeta(
  p: ProductRow,
  siteName: string,
  pricesShown: boolean
): string | undefined {
  const priced = pricesShown && p.showPrice !== false;
  const ladder = (p.volumeTiers ?? []).map((t) => tierPrice(p.basePrice, t)).filter((n) => n > 0);
  const from = priced ? Math.min(...(ladder.length ? ladder : [p.basePrice])) : null;

  // The typed description is only used when it is a sentence about this
  // product rather than its name repeated — see echoesTitle.
  const typed = plainText(p.description);
  const worthShowing = typed.length >= 80 && !echoesTitle(typed, p.title);

  return pageDescription(
    p.seoDescription,
    worthShowing ? typed : '',
    productDescription({
      title: p.title,
      subtitle: p.subtitle,
      sports: p.sports,
      from,
    })
  );
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

      <JsonLd
        data={productLd({
          handle: product.handle,
          title: product.title,
          // The same sentence the search result shows, so the rich result and
          // the snippet under it do not describe different things.
          description: productMeta(product, settings.siteName, settings.showPrices !== false),
          images: product.images.map((i) => i.url),
          sku: product.sku,
          categoryLabel: product.categoryLabel,
          sports: product.sports,
          sizes: product.sizes,
          colorways: product.colorways,
          siteName: settings.siteName,
          // A hidden price stays hidden here too: left in, the figure would
          // surface in Google's result for a page that says "Request a quote".
          price: priced ? priceRange : null,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/collections' },
          // The collection it belongs to, when it has one: the trail a
          // shopper walked, rather than a jump from the index.
          ...(home ? [{ name: home.title.trim(), path: `/collections/${home.handle}` }] : []),
          { name: product.title.trim(), path: `/products/${product.handle}` },
        ])}
      />
    </>
  );
}
