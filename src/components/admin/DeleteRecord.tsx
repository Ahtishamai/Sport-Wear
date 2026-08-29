'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { useToast } from './ui';

/**
 * Deletes one record through the admin API.
 *
 * Used from server-rendered tables and detail pages, which cannot carry a click
 * handler themselves. `redirectTo` is for detail pages, where staying on the
 * page of a deleted record makes no sense.
 */
export function DeleteRecord({
  resource,
  id,
  name,
  redirectTo,
  variant = 'link',
}: {
  resource: string;
  id: string;
  name: string;
  redirectTo?: string;
  variant?: 'link' | 'button';
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function destroy() {
    if (!window.confirm(`Delete ${name} permanently? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.remove(resource, id);
      toast('Deleted');
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
      setBusy(false);
    }
  }

  const className =
    variant === 'button'
      ? 'rounded-[2px] border border-[#F3C6C8] px-4 py-2.5 text-[13px] font-semibold text-[#C42027] transition-colors hover:border-[#C42027] disabled:opacity-50'
      : 'text-[12px] font-semibold text-[#C42027] hover:underline disabled:opacity-50';

  return (
    <button type="button" onClick={destroy} disabled={busy} className={className}>
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}
