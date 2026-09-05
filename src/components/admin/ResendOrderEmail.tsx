'use client';

import { useState } from 'react';
import { Button, Input } from './ui';

/**
 * Sends an order's confirmation again.
 *
 * The address box starts on the order's own email and is editable, because the
 * two reasons to press this are "it never arrived" and "they gave us the wrong
 * address" — and the second one cannot be fixed by sending to the same place.
 */
export function ResendOrderEmail({
  orderId,
  reference,
  email,
}: {
  orderId: string;
  reference: string;
  email: string;
}) {
  const [to, setTo] = useState(email ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string; detail?: string }>(
    null
  );

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, to: to.trim() }),
      });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, message: 'Could not reach the server.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="field-label">Send the confirmation to</span>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            placeholder="customer@example.com"
          />
        </div>
        <Button variant="outline" onClick={send} disabled={busy} className="shrink-0">
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </div>

      {result && (
        <div
          className={
            'mt-3 border px-3 py-2 text-[13px] ' +
            (result.ok
              ? 'border-[#BFE3CC] bg-[#E4F4EA] text-[#1F8A4C]'
              : 'border-[#F3C6C8] bg-[#FBE7E8] text-[#C42027]')
          }
        >
          <p className="font-semibold">{result.message}</p>
          {result.detail && <p className="mt-1">{result.detail}</p>}
        </div>
      )}

      <p className="mt-2 text-[12px] text-[#8A8C93]">
        <a
          href={`/api/admin/order-email/preview?ref=${encodeURIComponent(reference)}`}
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Preview what they get
        </a>
      </p>
    </div>
  );
}
