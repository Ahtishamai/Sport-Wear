'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useQuote } from './QuoteProvider';

export type Facet = { handle: string; title: string; count: number };

export function CatalogSidebar({
  facets,
  total,
  activeCollection,
  priceBounds,
}: {
  facets: Facet[];
  total: number;
  activeCollection: string;
  priceBounds: { min: number; max: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const { open } = useQuote();

  const maxParam = Number(params.get('max')) || priceBounds.max;
  const [price, setPrice] = useState(maxParam);
  useEffect(() => setPrice(maxParam), [maxParam]);

  const fabric = params.getAll('fabric');

  function push(mutate: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(params.toString());
    mutate(sp);
    startTransition(() => {
      router.push(`${pathname}${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
    });
  }

  const hasFilters = fabric.length > 0 || maxParam !== priceBounds.max || activeCollection !== 'all';

  return (
    <aside className="flex flex-col gap-7 lg:sticky lg:top-[110px] lg:self-start">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[12px] font-extrabold uppercase tracking-[.16em]">
            Collections
          </h2>
          {hasFilters && (
            <Link
              href="/collections"
              className="text-[12px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
            >
              Clear
            </Link>
          )}
        </div>
        <ul>
          <FacetRow
            href="/collections"
            label="All products"
            count={total}
            active={activeCollection === 'all'}
          />
          {facets.map((f) => (
            <FacetRow
              key={f.handle}
              href={`/collections/${f.handle}`}
              label={f.title}
              count={f.count}
              active={activeCollection === f.handle}
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-[12px] font-extrabold uppercase tracking-[.16em]">
          Custom &amp; stock
        </h2>
        <div className="space-y-2.5">
          {[
            { value: 'full-sub', label: 'Full sublimation' },
            { value: 'stock', label: 'Stock / blank' },
          ].map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2.5 text-[14px]">
              <input
                type="checkbox"
                checked={fabric.includes(o.value)}
                onChange={(e) =>
                  push((sp) => {
                    const current = sp.getAll('fabric').filter((v) => v !== o.value);
                    sp.delete('fabric');
                    current.forEach((v) => sp.append('fabric', v));
                    if (e.target.checked) sp.append('fabric', o.value);
                  })
                }
                style={{ accentColor: '#101114' }}
                className="h-4 w-4"
              />
              {o.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-[12px] font-extrabold uppercase tracking-[.16em]">
          Max price
        </h2>
        <input
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          step={5}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          onMouseUp={() => push((sp) => sp.set('max', String(price)))}
          onTouchEnd={() => push((sp) => sp.set('max', String(price)))}
          onKeyUp={() => push((sp) => sp.set('max', String(price)))}
          aria-label="Maximum price"
          style={{ accentColor: '#101114' }}
          className="w-full"
        />
        <div className="mt-2 flex justify-between text-[13px] font-medium text-muted">
          <span>${priceBounds.min}</span>
          <span className="font-semibold text-ink">${price}</span>
        </div>
      </section>

      <section className="border border-brand-border bg-brand-tint p-[22px]">
        <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[.04em]">
          Not sure what you need?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-brand-deep">
          Tell us the sport and roster size — we will recommend a kit and price it in 24 hours.
        </p>
        <button
          type="button"
          onClick={() => open('Help choosing a kit')}
          className="btn btn-ink btn-md mt-4 w-full"
        >
          Ask an expert
        </button>
      </section>
    </aside>
  );
}

function FacetRow({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'flex items-center justify-between border-l-2 px-3 py-[11px] text-[14px] transition-colors',
          active
            ? 'border-brand bg-brand-tint font-semibold text-ink'
            : 'border-transparent text-body hover:text-ink'
        )}
      >
        {label}
        <span className="text-[13px] text-muted">{count}</span>
      </Link>
    </li>
  );
}

export function CatalogToolbar({ shown, total }: { shown: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get('sort') ?? 'featured';

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
      <p className="text-[14px] text-body">
        Showing <strong className="font-semibold text-ink">{shown}</strong> of {total} products
      </p>
      <label className="flex items-center gap-2.5 text-[13px] font-medium text-muted">
        Sort
        <select
          value={sort}
          onChange={(e) => {
            const sp = new URLSearchParams(params.toString());
            if (e.target.value === 'featured') sp.delete('sort');
            else sp.set('sort', e.target.value);
            router.push(`${pathname}${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
          }}
          className="border border-field bg-white px-3 py-2 text-[14px] text-ink"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name-asc">Name A–Z</option>
          <option value="newest">Newest</option>
        </select>
      </label>
    </div>
  );
}
