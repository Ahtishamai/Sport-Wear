'use client';

import { useMemo, useState } from 'react';
import { checkAddresses } from '@/lib/utils';
import { Button, Textarea } from './ui';

/**
 * Sends an order's confirmation to whoever needs it.
 *
 * The box starts on the order's own email and takes a list, because the three
 * reasons to press this are "it never arrived", "they gave us the wrong
 * address" and "the parent and the coach need it too" — and only the first is
 * answered by sending to the same single place again.
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

  const { valid, invalid } = useMemo(() => checkAddresses(to), [to]);
  const customerMissing =
    Boolean(email) && !valid.some((a) => a.toLowerCase() === email.toLowerCase());

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, to }),
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

      <Textarea
        rows={2}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="customer@example.com, parent@example.com, coach@example.com"
      />

      <p className="mt-1.5 text-[12px] text-[#8A8C93]">
        One address or several. Separate them with commas, or paste a column of them. Everyone
        listed gets the same order details and can see who else was sent it.
      </p>

      {/* The parsed list, so it is obvious what will actually go out before
          the button is pressed rather than after. */}
      {(valid.length > 0 || invalid.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {valid.map((address) => (
            <span
              key={address}
              className="border border-[#E6E6E2] bg-[#F7F7F5] px-2 py-1 text-[12px] text-[#3A3C42]"
            >
              {address}
            </span>
          ))}
          {invalid.map((address) => (
            <span
              key={address}
              title="This does not look like an email address"
              className="border border-[#F3C6C8] bg-[#FBE7E8] px-2 py-1 text-[12px] text-[#C42027]"
            >
              {address}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={send}
          disabled={busy || valid.length === 0 || invalid.length > 0}
        >
          {busy
            ? 'Sending…'
            : valid.length > 1
              ? `Send to ${valid.length} people`
              : 'Send'}
        </Button>

        {customerMissing && (
          <button
            type="button"
            onClick={() => setTo((v) => (v.trim() ? `${v.trim()}, ${email}` : email))}
            className="text-[12px] text-[#6B6D74] underline"
          >
            Add the customer ({email})
          </button>
        )}
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
