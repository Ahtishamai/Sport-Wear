'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { useToast } from './ui';

const STATUSES = ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED'];

/** Moves a store order through fulfilment. Payment fields are never editable. */
export function OrderStatusPicker({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const previous = value;
    setValue(next);
    setBusy(true);
    try {
      await api.update('storeOrders', id, { status: next });
      toast('Order updated');
      router.refresh();
    } catch (e) {
      setValue(previous);
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-[13px] font-semibold">
      Status
      <select
        className="field !w-auto !py-2 text-[13px]"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
