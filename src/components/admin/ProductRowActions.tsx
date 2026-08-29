'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/admin-client';
import { useToast } from './ui';

/**
 * Per-row Edit / View / Delete for the products table.
 *
 * Editing and deleting were previously reachable only by opening the product,
 * which made the list look read-only. Deleting needs a click handler, so the
 * actions live in this client component rather than the server-rendered table.
 */
export function ProductRowActions({
  id,
  handle,
  title,
}: {
  id: string;
  handle: string;
  title: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function destroy() {
    if (!window.confirm(`Delete “${title}” permanently? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.remove('products', id);
      toast('Product deleted');
      router.refresh();
    } catch (e) {
      // The API refuses to delete a product that is still referenced, and says
      // where. Offer the override rather than leaving a dead end.
      const message = e instanceof ApiError ? e.message : 'Delete failed';
      if (e instanceof ApiError && window.confirm(`${message}\n\nDelete it anyway?`)) {
        try {
          await api.remove('products', id, true);
          toast('Product deleted');
          router.refresh();
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Delete failed', 'error');
        }
      } else if (!(e instanceof ApiError)) {
        toast(message, 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[12px] font-semibold">
      <Link href={`/admin/products/${handle}`} className="text-ink hover:underline">
        Edit
      </Link>
      <Link
        href={`/products/${handle}`}
        target="_blank"
        className="text-[#8A8C93] hover:text-ink"
      >
        View
      </Link>
      <button
        type="button"
        onClick={destroy}
        disabled={busy}
        className="text-[#C42027] hover:underline disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </span>
  );
}
