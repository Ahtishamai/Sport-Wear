'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { money } from '@/lib/utils';
import { CartProvider, linePrice, liveItems, useCart, type CartLine } from './CartProvider';
import type { StoreItem } from './StoreFront';
import { PayPalButtons } from '@/components/pay/PayPalButtons';

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
  /** The store's designs as they are now, to refresh the saved cart against. */
  items: StoreItem[];
};

export function StoreCheckout({ items, ...props }: Props) {
  return (
    <CartProvider slug={props.slug} live={liveItems(items)}>
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
}: Omit<Props, 'items'>) {
  const { lines, update, remove, clear, ready, removed } = useCart();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + linePrice(l), 0);

  const missing = validate(lines);
  const canPay = paymentsReady && lines.length > 0 && missing.length === 0;

  if (!ready) return <div className="gutter py-24" />;

  if (done) {
    return (
      <div className="gutter py-24 text-center">
        <h1 className="h-display text-[34px]">Thank you — order {done} is confirmed</h1>
        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-body">
          A confirmation is on its way to the email on your PayPal account. You can follow
          production at any time using your order number.
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
          {checkoutIntro(lines)}
        </p>

        {removed.length > 0 && (
          // Said out loud: a cart that quietly lost an item reads as a bug.
          <p
            role="status"
            className="mt-5 border border-[#F0DCA8] bg-[#FDF6E3] px-4 py-3 text-[13px] text-[#8A6D1B]"
          >
            {removed.length === 1
              ? `${removed[0]} is no longer available, so it was taken out of your cart.`
              : `${removed.join(', ')} are no longer available, so they were taken out of your cart.`}
          </p>
        )}

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
            Order summary
          </h2>

          <label className="mt-4 block">
            <span className="field-label">Invoice number (optional)</span>
            <input
              className="field !py-2.5 text-[14px] uppercase"
              maxLength={64}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. DS20439"
              autoComplete="off"
            />
            <span className="mt-1.5 block text-[12px] text-muted">
              Paying against an invoice we sent you? Put its number here and we will match your
              payment to it.
            </span>
          </label>

          <dl className="mt-5 border-t border-hairline pt-4 text-[14px]">
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
                createUrl="/api/store/checkout"
                captureUrl="/api/store/capture"
                buildBody={() => ({
                  store: slug,
                  invoiceNumber,
                  lines: lines.map((l) => ({
                    itemId: l.itemId,
                    size: l.size,
                    nameOnItem: l.nameOnItem,
                    numberOnItem: l.numberOnItem,
                    options: l.chosenOptions,
                    quantity: l.quantity,
                  })),
                })}
                onPaid={({ reference }) => {
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

/** What the shopper still has to fill in, worded for what their cart asks. */
function checkoutIntro(lines: CartLine[]): string {
  const sized = lines.some((l) => l.sizes.length > 0);
  const personal = lines.some((l) => l.allowName || l.allowNumber);
  if (sized && personal) {
    return 'Add the size, and a name and number where offered. Every item is personalised separately.';
  }
  if (personal) return 'Add a name and number where offered. Every item is personalised separately.';
  if (sized) return 'Add the size for each piece.';
  return 'Check your items and quantities.';
}

function validate(lines: CartLine[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if (l.sizes.length > 0 && !l.size.trim()) out.push(`Enter a size for ${l.name}.`);
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

          {/* A design with sizes switched off in the admin is one-size, so it
              is never asked for one. */}
          {line.sizes.length > 0 && (
            <label className="block">
              <span className="field-label">Size</span>
              <input
                className="field !py-2 text-[14px] uppercase"
                list={`sizes-${line.key}`}
                maxLength={32}
                value={line.size}
                onChange={(e) => onChange({ size: e.target.value })}
                placeholder={line.sizes.slice(0, 3).join(' / ')}
              />
              <datalist id={`sizes-${line.key}`}>
                {line.sizes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
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

