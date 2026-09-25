'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, Select } from './ui';

/**
 * Filters for the store orders list.
 *
 * Everything lives in the URL, so a filtered view can be bookmarked or sent to
 * someone else, and the back button behaves. Each control applies on change —
 * a separate "Apply" button is one click too many for a list this busy — except
 * the search box, which waits for Enter.
 */
export function StoreOrderFilters({
  stores,
  total,
}: {
  stores: { slug: string; name: string; orders: number }[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.push(qs ? `/admin/store-orders?${qs}` : '/admin/store-orders');
  };

  const store = params.get('store') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sort = params.get('sort') ?? '';
  const anyFilter = Boolean(store || from || to || sort || params.get('status') || params.get('q'));

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 border border-[#E3E3DF] bg-white px-4 py-3">
      <label className="block">
        <span className="field-label">Store</span>
        <Select
          value={store}
          onChange={(e) => go({ store: e.target.value })}
          className="!w-auto !py-2 text-[13px]"
        >
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name} ({s.orders})
            </option>
          ))}
        </Select>
      </label>

      <label className="block">
        <span className="field-label">Placed from</span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => go({ from: e.target.value })}
          className="field !w-auto !py-2 text-[13px]"
        />
      </label>

      <label className="block">
        <span className="field-label">To</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => go({ to: e.target.value })}
          className="field !w-auto !py-2 text-[13px]"
        />
      </label>

      <label className="block">
        <span className="field-label">Sort by</span>
        <Select value={sort} onChange={(e) => go({ sort: e.target.value })} className="!w-auto !py-2 text-[13px]">
          <option value="">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest total</option>
          <option value="lowest">Lowest total</option>
          <option value="customer">Customer name</option>
        </Select>
      </label>

      <form
        className="block"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q });
        }}
      >
        <span className="field-label">Search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Reference, invoice #, name, email…"
          className="field !w-[260px] !py-2 text-[13px]"
        />
      </form>

      <div className="ml-auto flex items-center gap-3 pb-1">
        <span className="text-[13px] text-[#6B6D74]">
          <strong className="text-ink">{total}</strong> {total === 1 ? 'order' : 'orders'}
        </span>
        {anyFilter && (
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/store-orders')}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
