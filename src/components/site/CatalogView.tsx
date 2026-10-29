import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCatalog, getCatalogFacets, getPriceBounds } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
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

  const [facets, bounds, settings] = await Promise.all([
    getCatalogFacets(),
    getPriceBounds(),
    getSettings(),
  ]);
  const showPrice = settings.showPrices !== false;
  const maxPrice = Number(searchParams.max) || bounds.max;

  // Where this collection sits in the tree: the facets already carry it, so
  // the breadcrumb and the sub-collection links cost no extra query.
  const self = handle === 'all' ? null : facets.collections.find((c) => c.handle === handle);
  const parent = self?.parentId ? facets.collections.find((c) => c.id === self.parentId) : null;
  const subs = self ? facets.collections.filter((c) => c.parentId === self.id) : [];

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
            {parent && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/collections/${parent.handle}`} className="hover:text-ink">
                    {parent.title}
                  </Link>
                </li>
              </>
            )}
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
        {subs.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2.5 font-display text-[12px] font-extrabold uppercase tracking-[.16em] text-muted">
              Shop by category
            </h2>
            <ul className="flex flex-wrap gap-2.5">
              {subs.map((c) => (
                <li key={c.handle}>
                  <Link
                    href={`/collections/${c.handle}`}
                    className="flex items-center gap-2 border border-field bg-white px-3.5 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-ink"
                  >
                    {c.title}
                    <span className="text-[12px] font-medium text-muted">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
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
            showPriceFilter={showPrice && bounds.usable}
          />
        </Suspense>

        <div data-reveal-root>
          <Suspense fallback={<div />}>
            <CatalogToolbar
              shown={products.length}
              total={facets.total}
              showPriceSort={showPrice && bounds.usable}
            />
          </Suspense>

          {products.length === 0 ? (
            <div className="border border-hairline bg-surface px-8 py-16 text-center">
              {/* A collection that holds nothing of its own but has
                  sub-collections is not an empty shelf — it is a signpost, and
                  "nothing matches those filters" is not what it should say. */}
              <h2 className="h-display text-[22px]">
                {subs.length > 0 ? 'Pick a style to see' : 'Nothing matches those filters'}
              </h2>
              <p className="mx-auto mt-3 max-w-[420px] text-[15px] text-body">
                {subs.length > 0
                  ? `${title} is split into ${subs.length === 2 ? 'two' : subs.length}. Choose one — or tell us what you are after and we will quote it directly.`
                  : 'Widen the price range or clear the filters — or tell us what you are after and we will quote it directly.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {subs.length > 0 ? (
                  subs.map((c) => (
                    <Link
                      key={c.handle}
                      href={`/collections/${c.handle}`}
                      className="btn btn-outline btn-md"
                    >
                      {c.title}
                    </Link>
                  ))
                ) : (
                  <Link href="/collections" className="btn btn-outline btn-md">
                    Clear filters
                  </Link>
                )}
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
                <ProductCatalogCard key={p.id} p={p} showPrice={showPrice} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
