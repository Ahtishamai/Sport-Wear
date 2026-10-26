'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { money } from '@/lib/utils';
import { useShopCart } from './CartProvider';
import { PayPalButtons } from '@/components/pay/PayPalButtons';

/**
 * Checkout: where it is going, then payment.
 *
 * The totals shown here come back from the server, not from the cart in this
 * browser — a cart can sit for days while a price changes, and a bigger order
 * may have earned a better price each than the lines were added at. The figure
 * on screen is the figure that will be charged.
 */

type Priced = {
  lines: { title: string; size: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
};

export function ShopCheckout({
  paypalClientId,
  paymentsReady,
  currency,
}: {
  paypalClientId: string;
  paymentsReady: boolean;
  currency: string;
}) {
  const { lines, count, clear, ready } = useShopCart();
  const [form, setForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    notes: '',
  });
  const [priced, setPriced] = useState<Priced | null>(null);
  const [priceError, setPriceError] = useState('');
  const [error, setError] = useState('');
  const [paid, setPaid] = useState<{ reference: string } | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Ask the server what this costs, and ask again whenever the cart changes.
  const cartKey = JSON.stringify(lines.map((l) => [l.productId, l.size, l.quantity, l.orderType]));
  const repriceNow = useCallback(async () => {
    if (!lines.length) return;
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: lines.map(toServerLine) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPriceError(data?.error ?? 'We could not price this cart.');
        setPriced(null);
        return;
      }
      setPriceError('');
      setPriced(data);
    } catch {
      setPriceError('We could not reach the server to price this cart.');
    }
  }, [lines]);

  useEffect(() => {
    void repriceNow();
    // cartKey stands in for the lines themselves: it changes only when a
    // choice does, not on every render.
  }, [cartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <p className="py-16 text-center text-[15px] text-muted">Loading…</p>;

  if (paid) {
    return (
      <div className="mx-auto max-w-[560px] border border-hairline bg-white px-8 py-12 text-center">
        <h2 className="h-display text-[26px]">Order placed</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-body">
          Thank you — your order is confirmed and a receipt is on its way to your email. Your art
          team will send a free mockup before anything is printed.
        </p>
        <p className="mt-5 inline-block border border-hairline bg-surface px-5 py-3 font-display text-[20px] font-black">
          {paid.reference}
        </p>
        <p className="mt-3 text-[13px] text-muted">Keep this number — it is how we find your order.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/track-order" className="btn btn-outline btn-md">
            Track this order
          </Link>
          <Link href="/collections" className="btn btn-yellow btn-md">
            Keep shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="border border-hairline bg-surface px-8 py-16 text-center">
        <h2 className="h-display text-[22px]">Nothing to check out</h2>
        <p className="mx-auto mt-3 max-w-[420px] text-[15px] text-body">Your cart is empty.</p>
        <Link href="/collections" className="btn btn-yellow btn-md mt-6">
          Browse the catalogue
        </Link>
      </div>
    );
  }

  const filledIn =
    form.customerName.trim().length > 1 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()) &&
    form.address1.trim().length > 2 &&
    form.city.trim().length > 1;
  const canPay = filledIn && !!priced && !priceError;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="border border-hairline bg-white p-6 md:p-7">
        <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[.14em]">
          Where is it going?
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Your name *" value={form.customerName} onChange={(v) => set('customerName', v)} placeholder="Coach name" span />
          <Field label="Email *" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="coach@team.com" />
          <Field label="Phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} placeholder="(959) 000-0000" />
          <Field label="Address *" value={form.address1} onChange={(v) => set('address1', v)} placeholder="1601 Main St" span />
          <Field label="Apartment, suite (optional)" value={form.address2} onChange={(v) => set('address2', v)} span />
          <Field label="City *" value={form.city} onChange={(v) => set('city', v)} placeholder="Springfield" />
          <Field label="State" value={form.state} onChange={(v) => set('state', v)} placeholder="MA" />
          <Field label="ZIP" value={form.postcode} onChange={(v) => set('postcode', v)} placeholder="01103" />
          <label className="block sm:col-span-2">
            <span className="field-label">Anything we should know?</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Deadline, colour notes, roster details…"
              className="w-full border border-hairline px-4 py-3 text-[15px] outline-none focus:border-ink"
            />
          </label>
        </div>
      </div>

      <div className="border border-hairline bg-surface p-6 lg:sticky lg:top-[110px]">
        <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[.14em]">
          {count} shirt{count === 1 ? '' : 's'}
        </h2>

        <ul className="mt-4 space-y-2.5 text-[13.5px]">
          {(priced?.lines ?? []).map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0 text-body">
                {l.quantity} × {l.title}
                {l.size ? ` · ${l.size}` : ''}
              </span>
              <span className="shrink-0 font-semibold">{money(l.lineTotal)}</span>
            </li>
          ))}
        </ul>

        {priceError && (
          <p role="alert" className="mt-4 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]">
            {priceError}
          </p>
        )}

        {priced && (
          <dl className="mt-4 space-y-2 border-t border-hairline pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-body">Subtotal</dt>
              <dd className="font-semibold">{money(priced.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Shipping</dt>
              <dd className="font-semibold text-success">Free</dd>
            </div>
            <div className="flex justify-between border-t border-hairline pt-3">
              <dt className="font-display text-[15px] font-extrabold uppercase">Total</dt>
              <dd className="font-display text-[22px] font-black">{money(priced.total)}</dd>
            </div>
          </dl>
        )}

        {error && (
          <p role="alert" className="mt-4 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]">
            {error}
          </p>
        )}

        {!paymentsReady ? (
          <p className="mt-5 border border-hairline bg-white px-4 py-3 text-[13px] text-body">
            Online payment is not switched on yet. Ask us for a quote and we will take it from there.
          </p>
        ) : (
          <>
            {!filledIn && (
              <p className="mt-5 text-[13px] text-muted">Fill in your name, email and address to pay.</p>
            )}
            <div className={canPay ? 'mt-5' : 'pointer-events-none mt-5 opacity-40'}>
              <PayPalButtons
                clientId={paypalClientId}
                currency={priced?.currency ?? currency}
                disabled={!canPay}
                onError={setError}
                createUrl="/api/shop/checkout"
                captureUrl="/api/shop/capture"
                buildBody={() => ({ ...form, lines: lines.map(toServerLine) })}
                onPaid={(result) => {
                  clear();
                  setPaid({ reference: result.reference });
                }}
                label="checkout"
              />
            </div>
          </>
        )}

        <Link href="/cart" className="mt-4 block text-center text-[13px] font-semibold underline underline-offset-2">
          Back to cart
        </Link>
      </div>
    </div>
  );
}

/** Only the choices travel; prices are the server's business. */
function toServerLine(l: {
  productId: string;
  size: string;
  sport: string;
  colorway: string;
  teamName: string;
  number: string;
  orderType: string;
  quantity: number;
}) {
  return {
    productId: l.productId,
    size: l.size,
    sport: l.sport,
    colorway: l.colorway,
    teamName: l.teamName,
    number: l.number,
    orderType: l.orderType,
    quantity: l.quantity,
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  span?: boolean;
}) {
  return (
    <label className={span ? 'block sm:col-span-2' : 'block'}>
      <span className="field-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-hairline px-4 py-3 text-[15px] outline-none focus:border-ink"
      />
    </label>
  );
}
