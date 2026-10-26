'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShopCart } from './CartProvider';
import { money } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';

/**
 * The cart.
 *
 * Quantities change here, so the totals are worked out again as they do. They
 * are an estimate until checkout prices the order on the server — which is
 * also where a larger quantity may earn a better price than the one a line was
 * added at.
 */
export function CartView() {
  const { lines, count, subtotal, setQuantity, remove, ready } = useShopCart();
  const router = useRouter();

  if (!ready) {
    return <p className="py-16 text-center text-[15px] text-muted">Loading your cart…</p>;
  }

  if (!lines.length) {
    return (
      <div className="border border-hairline bg-surface px-8 py-16 text-center">
        <h2 className="h-display text-[22px]">Your cart is empty</h2>
        <p className="mx-auto mt-3 max-w-[420px] text-[15px] text-body">
          Pick a design and add the sizes your team needs — the more you order, the lower the price
          each.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/collections/baseball-shirts" className="btn btn-yellow btn-md">
            Baseball shirts
          </Link>
          <Link href="/collections/softball-shirts" className="btn btn-outline btn-md">
            Softball shirts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <ul className="border border-hairline bg-white">
        {lines.map((line) => (
          <li key={line.key} className="flex gap-4 border-b border-hairline p-4 last:border-0 sm:p-5">
            <Link
              href={`/products/${line.handle}`}
              className="relative h-[92px] w-[92px] shrink-0 overflow-hidden border border-hairline bg-plate"
            >
              {line.image ? (
                <Image src={line.image} alt={line.title} fill sizes="92px" className="object-contain p-1.5" />
              ) : null}
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/products/${line.handle}`} className="font-display text-[15px] font-extrabold uppercase hover:underline">
                  {line.title}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(line.key)}
                  aria-label={`Remove ${line.title}`}
                  className="text-muted transition-colors hover:text-[#C42027]"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>

              <p className="mt-1 text-[13px] text-muted">
                {[
                  line.size && `Size ${line.size}`,
                  line.sport,
                  line.colorway,
                  line.teamName && `Team ${line.teamName}`,
                  line.number && `No. ${line.number}`,
                  line.orderType === 'team' ? 'Team order' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center border border-hairline">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.key, line.quantity - 1)}
                    aria-label={`One fewer ${line.title}`}
                    className="px-3 py-1.5 text-[16px] font-bold text-muted hover:text-ink"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => setQuantity(line.key, Math.max(1, Number(e.target.value) || 1))}
                    aria-label={`How many ${line.title}`}
                    className="no-spin w-[52px] border-x border-hairline py-1.5 text-center font-display text-[15px] font-black outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(line.key, line.quantity + 1)}
                    aria-label={`One more ${line.title}`}
                    className="px-3 py-1.5 text-[16px] font-bold text-muted hover:text-ink"
                  >
                    +
                  </button>
                </span>
                <span className="text-[14px] text-muted">
                  {money(line.unitPrice)} each ·{' '}
                  <strong className="font-display text-[16px] text-ink">
                    {money(line.unitPrice * line.quantity)}
                  </strong>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="border border-hairline bg-surface p-6 lg:sticky lg:top-[110px]">
        <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[.14em]">Summary</h2>
        <dl className="mt-4 space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-body">
              {count} shirt{count === 1 ? '' : 's'}
            </dt>
            <dd className="font-semibold">{money(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-body">Shipping</dt>
            <dd className="font-semibold text-success">Free</dd>
          </div>
          <div className="flex justify-between border-t border-hairline pt-3">
            <dt className="font-display text-[15px] font-extrabold uppercase">Estimated total</dt>
            <dd className="font-display text-[22px] font-black">{money(subtotal)}</dd>
          </div>
        </dl>

        <button type="button" onClick={() => router.push('/checkout')} className="btn btn-yellow btn-lg mt-5 w-full">
          Checkout
        </button>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Prices are confirmed at checkout, where a larger order may earn a better price each than
          the one shown here. Free mockup before anything is printed.
        </p>
        <Link href="/collections" className="mt-4 block text-center text-[13px] font-semibold underline underline-offset-2">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
