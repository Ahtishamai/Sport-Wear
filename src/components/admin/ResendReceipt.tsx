'use client';

import { useState } from 'react';
import { useToast } from './ui';

/**
 * Sends the receipt for an invoice payment again.
 *
 * A payment can be taken without an email address — PayPal supplies one on
 * capture, but the customer may have paid from an account they do not read.
 * The prompt lets the shop put the receipt somewhere it will be seen.
 */
export function ResendReceipt({ paymentId, email }: { paymentId: string; email: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function send() {
    const to = window.prompt('Send the receipt to:', email ?? '');
    if (to === null) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, to: to.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      toast(
        json.message || (json.ok ? 'Receipt sent' : 'Could not send the receipt'),
        json.ok ? 'ok' : 'error'
      );
    } catch {
      toast('Could not reach the server', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={busy}
      className="text-[12px] font-semibold text-ink hover:underline disabled:opacity-50"
    >
      {busy ? 'Sending…' : 'Receipt'}
    </button>
  );
}
