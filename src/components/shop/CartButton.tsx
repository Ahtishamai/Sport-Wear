'use client';

import Link from 'next/link';
import { useShopCart } from './CartProvider';
import { Icon } from '@/components/site/Icon';

/**
 * The way back to the cart, with what is in it.
 *
 * It stays out of the way until there is something to collect — an empty cart
 * icon in the corner of every page is furniture, not help.
 */
export function CartButton({ className }: { className?: string }) {
  const { count, ready } = useShopCart();
  if (!ready || count === 0) return null;

  return (
    <Link
      href="/cart"
      aria-label={`Cart — ${count} shirt${count === 1 ? '' : 's'}`}
      className={
        'relative flex h-10 w-10 items-center justify-center border border-hairline text-ink transition-colors hover:border-ink ' +
        (className ?? '')
      }
    >
      <Icon name="bag" size={17} />
      <span className="absolute -right-2 -top-2 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-brand">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  );
}
