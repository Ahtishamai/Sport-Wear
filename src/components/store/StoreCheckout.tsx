'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { money } from '@/lib/utils';
import { CartProvider, linePrice, useCart, type CartLine } from './CartProvider';

/**
 * Checkout: per-item personalisation, then payment.
 *
 * Prices here are display only. The server re-prices the whole cart from the
 * database when the payment starts, so nothing the browser sends can change
 * what is charged.
 */

type Props = {
  slug: string;
  storeName: string;
  currency: string;
  paypalClientId: string;
  paymentsReady: boolean;
  orderNote: string;
};

export function StoreCheckout(props: Props) {
  return (
    <CartProvider slug={props.slug}>
      <CheckoutBody {...props} />
    </CartProvider>
  );
}

function CheckoutBody({
  slug,
  storeName,
  currency,
  paypalClientId,
  paymentsReady,
  orderNote,
}: Props) {
  const { lines, update, remove, clear, ready } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + linePrice(l), 0);

  const missing = validate(lines, customerName, email);
  const canPay = paymentsReady && lines.length > 0 && missing.length === 0;

  if (!ready) return <div className="gutter py-24" />;

  if (done) {
    return (
      <div className="gutter py-24 text-center">
        <h1 className="h-display text-[34px]">Thank you — order {done} is confirmed</h1>
        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-body">
          A confirmation is on its way to {email}. You can follow production at any time using your
          order number.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/track-order" className="btn btn-yellow btn-lg">
            Track this order
          </Link>
          <Link href={`/${slug}`} className="btn btn-ghost btn-lg">
            Back to the store
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="gutter py-24 text-center">
        <h1 className="h-display text-[30px]">Your cart is empty</h1>
        <p className="mt-3 text-[15px] text-body">Pick your designs and they will show up here.</p>
        <Link href={`/${slug}`} className="btn btn-ink btn-lg mt-7">
          Back to {storeName}
        </Link>
      </div>
    );
  }

  return (
    <div className="gutter grid gap-10 pb-[88px] pt-9 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div>
        <h1 className="h-display text-[30px]">Your items</h1>
        <p className="mt-2 text-[15px] text-body">
          Add the name and number for each piece. Every item is personalised separately.
        </p>

        <ul className="mt-7 space-y-4">
          {lines.map((l) => (
            <LineRow key={l.key} line={l} onChange={(p) => update(l.key, p)} onRemove={() => remove(l.key)} />
          ))}
        </ul>

        <button
          type="button"
          onClick={clear}
          className="mt-5 text-[13px] font-semibold text-[#C42027] hover:underline"
        >
          Empty the cart
        </button>
      </div>

      <aside className="lg:sticky lg:top-[96px]">
        <div className="border border-hairline bg-white p-6">
          <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[.12em]">
            Your details
          </h2>

          <label className="mt-4 block">
            <span className="field-label">Your name</span>
            <input
              className="field"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="mt-3 block">
            <span className="field-label">Email</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="mt-3 block">
            <span className="field-label">Phone (optional)</span>
            <input
              className="field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
          <label className="mt-3 block">
            <span className="field-label">Notes (optional)</span>
            <textarea
              className="field"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <dl className="mt-6 border-t border-hairline pt-4 text-[14px]">
            <div className="flex justify-between py-1">
              <dt className="text-body">Subtotal</dt>
              <dd className="font-semibold">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-hairline pt-3 text-[17px]">
              <dt className="font-display font-extrabold uppercase tracking-[.08em]">Total</dt>
              <dd className="font-display font-black">{money(subtotal)}</dd>
            </div>
          </dl>

          {missing.length > 0 && (
            <ul className="mt-5 space-y-1 border border-hairline bg-surface px-4 py-3 text-[13px] text-body">
              {missing.map((m) => (
                <li key={m}>· {m}</li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="mt-5 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]">
              {error}
            </p>
          )}

          {!paymentsReady ? (
            <p className="mt-5 border border-hairline bg-surface px-4 py-3 text-[13px] text-body">
              Online payment is not switched on yet. Please contact us to place this order.
            </p>
          ) : (
            <div className={canPay ? 'mt-5' : 'mt-5 pointer-events-none opacity-40'}>
              <PayPalButtons
                clientId={paypalClientId}
                currency={currency}
                disabled={!canPay}
                onError={setError}
                buildOrder={() => ({
                  store: slug,
                  customerName,
                  email,
                  phone,
                  notes,
                  lines: lines.map((l) => ({
                    itemId: l.itemId,
                    size: l.size,
                    nameOnItem: l.nameOnItem,
                    numberOnItem: l.numberOnItem,
                    options: l.chosenOptions,
                    quantity: l.quantity,
                  })),
                })}
                onPaid={(reference) => {
                  clear();
                  setDone(reference);
                }}
              />
            </div>
          )}

          {orderNote && <p className="mt-4 text-[12px] leading-relaxed text-muted">{orderNote}</p>}
        </div>
      </aside>
    </div>
  );
}

function validate(lines: CartLine[], name: string, email: string): string[] {
  const out: string[] = [];
  if (!name.trim()) out.push('Enter your name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) out.push('Enter a valid email address.');
  for (const l of lines) {
    if (l.sizes.length && !l.size) out.push(`Choose a size for ${l.name}.`);
    for (const opt of l.options ?? []) {
      if (!l.chosenOptions?.[opt.name]) {
        out.push(`Choose ${opt.name.toLowerCase()} for ${l.name}.`);
      }
    }
    if (l.numberOnItem && !/^[0-9]{1,3}$/.test(l.numberOnItem)) {
      out.push(`The number for ${l.name} must be 1–3 digits.`);
    }
  }
  return [...new Set(out)];
}

function LineRow({
  line,
  onChange,
  onRemove,
}: {
  line: CartLine;
  onChange: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-4 border border-hairline bg-white p-4">
      <span className="relative block h-[92px] w-[92px] shrink-0 bg-plate">
        {line.image && (
          <Image src={line.image} alt="" fill sizes="92px" className="object-cover" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[15px] font-extrabold uppercase tracking-[.04em]">
              {line.name}
            </h3>
            {Object.values(line.chosenOptions ?? {}).some(Boolean) && (
              <p className="mt-0.5 text-[12px] text-muted">
                {Object.entries(line.chosenOptions)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </p>
            )}
          </div>
          <span className="whitespace-nowrap font-semibold">{money(linePrice(line))}</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {line.options.map((opt) => (
            <label key={opt.name} className="block">
              <span className="field-label">{opt.name}</span>
              <select
                className="field !py-2 text-[14px]"
                value={line.chosenOptions?.[opt.name] ?? ''}
                onChange={(e) =>
                  onChange({
                    chosenOptions: { ...(line.chosenOptions ?? {}), [opt.name]: e.target.value },
                  })
                }
              >
                <option value="">Choose…</option>
                {opt.values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {line.sizes.length > 0 && (
            <label className="block">
              <span className="field-label">Size</span>
              <select
                className="field !py-2 text-[14px]"
                value={line.size}
                onChange={(e) => onChange({ size: e.target.value })}
              >
                <option value="">Choose…</option>
                {line.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="field-label">Quantity</span>
            <input
              type="number"
              min={1}
              max={99}
              className="field no-spin !py-2 text-[14px]"
              value={line.quantity}
              onChange={(e) =>
                onChange({ quantity: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
          </label>

          {line.allowName && (
            <label className="block">
              <span className="field-label">
                Name on the item{line.namePrice > 0 ? ` (+${money(line.namePrice)})` : ''}
              </span>
              <input
                className="field !py-2 text-[14px] uppercase"
                maxLength={64}
                value={line.nameOnItem}
                onChange={(e) => onChange({ nameOnItem: e.target.value })}
                placeholder="Leave blank for none"
              />
            </label>
          )}

          {line.allowNumber && (
            <label className="block">
              <span className="field-label">
                Number on the item{line.numberPrice > 0 ? ` (+${money(line.numberPrice)})` : ''}
              </span>
              <input
                className="field no-spin !py-2 text-[14px]"
                inputMode="numeric"
                maxLength={3}
                value={line.numberOnItem}
                onChange={(e) => onChange({ numberOnItem: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="e.g. 24"
              />
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="mt-3 text-[12px] font-semibold text-[#C42027] hover:underline"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

/** Loads the PayPal SDK once and mounts the buttons. */
function PayPalButtons({
  clientId,
  currency,
  disabled,
  buildOrder,
  onPaid,
  onError,
}: {
  clientId: string;
  currency: string;
  disabled: boolean;
  buildOrder: () => unknown;
  onPaid: (reference: string) => void;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  // Read through refs so the buttons always see current form state without
  // being torn down and re-rendered on every keystroke.
  const latest = useRef({ disabled, buildOrder, onPaid, onError });
  latest.current = { disabled, buildOrder, onPaid, onError };

  useEffect(() => {
    const id = 'paypal-sdk';
    if (document.getElementById(id)) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`;
    script.onload = () => setSdkReady(true);
    script.onerror = () => onError('Could not load PayPal. Please refresh and try again.');
    document.body.appendChild(script);
  }, [clientId, currency, onError]);

  useEffect(() => {
    const paypal = (window as any).paypal;
    if (!sdkReady || !paypal || !host.current || host.current.childElementCount > 0) return;

    paypal
      .Buttons({
        style: { layout: 'vertical', shape: 'rect', label: 'pay', height: 46 },
        onClick: (_d: unknown, actions: any) =>
          latest.current.disabled ? actions.reject() : actions.resolve(),
        createOrder: async () => {
          latest.current.onError('');
          const res = await fetch('/api/store/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(latest.current.buildOrder()),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.paypalOrderId) {
            throw new Error(json.error || 'Could not start the payment.');
          }
          return json.paypalOrderId;
        },
        onApprove: async (data: { orderID: string }) => {
          const res = await fetch('/api/store/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paypalOrderId: data.orderID }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            latest.current.onError(json.error || 'The payment did not complete.');
            return;
          }
          latest.current.onPaid(json.reference);
        },
        onError: (err: unknown) => {
          console.error('[paypal]', err);
          latest.current.onError('PayPal reported a problem. Please try again.');
        },
      })
      .render(host.current);
  }, [sdkReady]);

  return <div ref={host} />;
}
