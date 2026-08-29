import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCatalog, getCatalogFacets, getPriceBounds } from '@/lib/queries';
import { ProductCatalogCard } from '@/components/blocks/primitives';
import { CatalogSidebar, CatalogToolbar } from './CatalogSidebar';
import { QuoteButton } from './QuoteButton';

export type CatalogSearchParams = {
  max?: string;
  sort?: string;
  fabric?: string | string[];
  q?: string;
};

export async function CatalogView({
  handle,
  title,
  intro,
  banner,
  searchParams,
}: {
  handle: string; // 'all' or a collection handle
  title: string;
  intro?: string | null;
  banner?: string | null;
  searchParams: CatalogSearchParams;
}) {
  const fabric = searchParams.fabric
    ? Array.isArray(searchParams.fabric)
      ? searchParams.fabric
      : [searchParams.fabric]
    : [];

  const [facets, bounds] = await Promise.all([getCatalogFacets(), getPriceBounds()]);
  const maxPrice = Number(searchParams.max) || bounds.max;

  const products = await getCatalog({
    collection: handle,
    maxPrice,
    sort: searchParams.sort,
    fabric,
    q: searchParams.q,
  });

  return (
    <>
      <section data-reveal-root className="gutter border-b border-hairline bg-surface pb-11 pt-9">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-muted">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              {handle === 'all' ? (
                <span>Collections</span>
              ) : (
                <Link href="/collections" className="hover:text-ink">
                  Collections
                </Link>
              )}
            </li>
            {handle !== 'all' && (
              <>
                <li aria-hidden="true">/</li>
                <li>{title}</li>
              </>
            )}
          </ol>
        </nav>
        <h1 className="h-display" style={{ fontSize: 'clamp(34px,4.6vw,62px)', lineHeight: 0.98 }}>
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-[760px] text-[17px] leading-relaxed text-body">{intro}</p>}
        {banner && (
          <div
            className="relative mt-8 w-full bg-plate"
            style={{ height: 'clamp(200px,22vw,280px)' }}
          >
            <Image src={banner} alt="" fill sizes="100vw" className="object-cover" priority />
          </div>
        )}
      </section>

      <div className="gutter grid gap-10 pb-[88px] pt-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[340px_1fr]">
        <Suspense fallback={<div />}>
          <CatalogSidebar
            facets={facets.collections}
            total={facets.total}
            activeCollection={handle}
            priceBounds={bounds}
          />
        </Suspense>

        <div data-reveal-root>
          <Suspense fallback={<div />}>
            <CatalogToolbar shown={products.length} total={facets.total} />
          </Suspense>

          {products.length === 0 ? (
            <div className="border border-hairline bg-surface px-8 py-16 text-center">
              <h2 className="h-display text-[22px]">Nothing matches those filters</h2>
              <p className="mx-auto mt-3 max-w-[420px] text-[15px] text-body">
                Widen the price range or clear the filters — or tell us what you are after and we
                will quote it directly.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/collections" className="btn btn-outline btn-md">
                  Clear filters
                </Link>
                <QuoteButton subject="Custom request" className="btn btn-yellow btn-md">
                  Request a quote
                </QuoteButton>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-[18px]"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))' }}
            >
              {products.map((p) => (
                <ProductCatalogCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
