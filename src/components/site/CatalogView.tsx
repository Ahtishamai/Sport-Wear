import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCatalog, getCatalogFacets, getPriceBounds } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { ProductCatalogCard } from '@/components/blocks/primitives';
import { CatalogSidebar, CatalogToolbar } from './CatalogSidebar';
import { QuoteButton } from './QuoteButton';
import { JsonLd } from './JsonLd';
import { collectionLd } from '@/lib/schema';
import { faqPairs, leadHeading, parseRichText, type Span } from '@/lib/richtext';

export type CatalogSearchParams = {
  max?: string;
  sort?: string;
  fabric?: string | string[];
  q?: string;
};

/**
 * The collection's own writing, printed after the products.
 *
 * The field is still a plain textarea in the admin, so a shop owner can type
 * into it without learning anything. It now understands a few marks as well
 * (## heading, - list, a table, **bold**, a link), because a page meant to
 * rank needs headings a search engine can read rather than one long run of
 * paragraphs under a heading nobody chose. Nothing typed here can produce
 * markup: see lib/richtext.ts.
 */
function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.href ? (
          <Link key={i} href={s.href} className="underline underline-offset-2 hover:text-ink">
            {s.text}
          </Link>
        ) : s.bold ? (
          <strong key={i} className="font-semibold text-ink">
            {s.text}
          </strong>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </>
  );
}

function CollectionCopy({ text }: { text: string }) {
  const nodes = parseRichText(text);
  if (nodes.length === 0) return null;

  // The shop's own first heading titles the section. Only when it has not
  // written one does the page fall back to a heading of its own.
  const lead = leadHeading(nodes);
  const body = lead && nodes[0]?.kind === 'h2' ? nodes.slice(1) : nodes;
  const faqs = faqPairs(nodes);

  return (
    <section
      aria-labelledby="collection-copy"
      className="gutter border-t border-hairline bg-surface py-12 md:py-16"
      data-reveal-root
    >
      {/*
        The same two columns the catalogue above uses, with the first left
        empty on purpose. The writing then starts where the products start
        rather than under the filters — it is a continuation of the grid, not
        of the sidebar, and starting it at the page edge made it read as a
        separate thing that happened to be below.
      */}
      <div className="grid gap-10 lg:grid-cols-[260px_1fr] xl:grid-cols-[340px_1fr]">
        <div aria-hidden="true" className="hidden lg:block" />
        <div className="min-w-0 max-w-[760px]">
          <h2 id="collection-copy" className="h-display text-[24px] md:text-[30px]">
            {lead ?? 'About this collection'}
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-body md:text-[16px]">
            {body.map((node, i) => {
              switch (node.kind) {
                case 'h2':
                  return (
                    <h2 key={i} className="h-display !mt-9 text-[20px] md:text-[23px]">
                      {node.text}
                    </h2>
                  );
                case 'h3':
                  return (
                    <h3 key={i} className="!mt-7 font-display text-[16px] font-extrabold text-ink md:text-[17px]">
                      {node.text}
                    </h3>
                  );
                case 'list':
                  return node.ordered ? (
                    <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-ink">
                      {node.items.map((item, j) => (
                        <li key={j}>
                          <Spans spans={item} />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand-text">
                      {node.items.map((item, j) => (
                        <li key={j}>
                          <Spans spans={item} />
                        </li>
                      ))}
                    </ul>
                  );
                case 'table':
                  return (
                    <div key={i} className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-[14px]">
                        <thead>
                          <tr>
                            {node.head.map((h, j) => (
                              <th
                                key={j}
                                className="border-b-2 border-ink px-3 py-2 font-display text-[12px] font-extrabold uppercase tracking-[.08em] text-ink"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {node.rows.map((row, j) => (
                            <tr key={j}>
                              {row.map((cell, k) => (
                                <td key={k} className="border-b border-hairline px-3 py-2 align-top">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                default:
                  return (
                    <p key={i}>
                      <Spans spans={node.spans} />
                    </p>
                  );
              }
            })}
          </div>

          {/*
            The questions this page answers, marked up as questions. Built from
            the headings above rather than typed twice, so the markup cannot
            describe an answer the page does not print.
          */}
          {faqs.length >= 2 && (
            <JsonLd
              data={{
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faqs.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export async function CatalogView({
  handle,
  title,
  intro,
  banner,
  bodyCopy,
  createdAt,
  updatedAt,
  searchParams,
}: {
  handle: string; // 'all' or a collection handle
  title: string;
  intro?: string | null;
  banner?: string | null;
  /** The collection's own writing, printed after the grid. */
  bodyCopy?: string | null;
  /**
   * When this shelf was made and last changed. Printed in the page's
   * structured data, and the same two values the meta tags and the sitemap
   * carry, so the page never gives a crawler two answers about its own age.
   */
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
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
  // A breadcrumb can only walk one path, so it follows the first parent even
  // when this collection is filed under several.
  const parent = self?.parentIds.length
    ? (facets.collections.find((c) => c.id === self.parentIds[0]) ?? null)
    : null;
  const subs = self ? facets.collections.filter((c) => c.parentIds.includes(self.id)) : [];

  const products = await getCatalog({
    collection: handle,
    maxPrice,
    sort: searchParams.sort,
    fabric,
    q: searchParams.q,
  });

  return (
    <>
      {/*
        What is on this shelf, in the order it is shown.
        Built from the list just rendered, so the markup and the page can
        never disagree about which products are here or what they cost.
      */}
      <JsonLd
        data={collectionLd({
          path: handle === 'all' ? '/collections' : `/collections/${handle}`,
          name: title,
          description: intro,
          products,
          pricesShown: showPrice,
          createdAt,
          updatedAt,
        })}
      />
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
        <h1 className="h-display" style={{ fontSize: 'clamp(26px,3vw,40px)', lineHeight: 0.98 }}>
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
            <>
              {/* Each card is an h3, so without this the page jumps from its
                  h1 straight to h3 — a gap screen readers and search engines
                  both read as a missing section. The toolbar above says the
                  same thing visually, hence nothing new to look at. */}
              <h2 className="sr-only">{handle === 'all' ? 'All products' : `${title} products`}</h2>
              <div
                className="grid gap-[18px]"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))' }}
              >
                {products.map((p) => (
                  <ProductCatalogCard key={p.id} p={p} showPrice={showPrice} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {bodyCopy ? <CollectionCopy text={bodyCopy} /> : null}
    </>
  );
}
