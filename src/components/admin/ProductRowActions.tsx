'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { useMoveToTrash, useToast } from './ui';

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
  const moveToTrash = useMoveToTrash();
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);

  /**
   * Copy this product and open the copy.
   *
   * Landing on the new product's own page is the point: a duplicate is only
   * ever made to be changed, and leaving the admin on a list of two
   * near-identical rows invites editing the wrong one.
   */
  async function duplicate() {
    setCopying(true);
    try {
      const { item } = await api.duplicate<{ handle: string; title: string }>('products', id);
      toast(`Copied — “${item.title}” is a draft`);
      router.push(`/admin/products/${item.handle}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not duplicate', 'error');
      setCopying(false);
    }
  }

  async function destroy() {
    setBusy(true);
    if (await moveToTrash({ resource: 'products', id, name: `“${title}”` })) router.refresh();
    setBusy(false);
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
        onClick={duplicate}
        disabled={copying || busy}
        title={`Make a draft copy of “${title}”`}
        className="text-ink hover:underline disabled:opacity-50"
      >
        {copying ? 'Copying…' : 'Duplicate'}
      </button>
      <button
        type="button"
        onClick={destroy}
        disabled={busy || copying}
        className="text-[#C42027] hover:underline disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </span>
  );
}
