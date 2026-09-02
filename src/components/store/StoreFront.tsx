'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { cn, money } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { CartProvider, useCart } from './CartProvider';

export type StoreItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  images: { url: string; alt?: string }[];
  sizes: string[];
  options: { name: string; values: string[] }[];
  allowName: boolean;
  namePrice: number;
  allowNumber: boolean;
  numberPrice: number;
};

export type StoreHeader = {
  slug: string;
  name: string;
  intro: string | null;
  logoUrl: string | null;
  heroUrl: string | null;
  shipNote: string | null;
  closesAt: string | null;
  closedReason: string | null;
};

export function StoreFront({
  store,
  items,
  sections,
}: {
  store: StoreHeader;
  items: StoreItem[];
  sections: string[];
}) {
  return (
    <CartProvider slug={store.slug}>
      <StoreBody store={store} items={items} sections={sections} />
    </CartProvider>
  );
}

function StoreBody({
  store,
  items,
  sections,
}: {
  store: StoreHeader;
  items: StoreItem[];
  sections: string[];
}) {
  const { count } = useCart();
  const open = !store.closedReason;
  const groups = groupByCategory(items, sections);

  return (
    <>
      <StoreHero store={store} count={count} open={open} />

      <div className="gutter pb-[88px] pt-10">
        {!open && (
          <p
            role="status"
            className="mx-auto mb-9 max-w-[720px] border border-hairline bg-surface px-6 py-5 text-center text-[15px]"
          >
            {store.closedReason}
          </p>
        )}

        {items.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-muted">
            Designs for this team are being added. Check back shortly.
          </p>
        ) : (
          groups.map(([category, list]) => (
            <section key={category} className="mb-12 last:mb-0">
              <h2 className="h-section mb-6 text-[22px]">{category}</h2>
              <div
                className="grid gap-[18px]"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))' }}
              >
                {list.map((item) => (
                  <ItemCard key={item.id} item={item} canBuy={open} />
                ))}
              </div>
            </section>
          ))
        )}

        {store.shipNote && (
          <p className="mt-10 border-t border-hairline pt-6 text-[13px] leading-relaxed text-muted">
            {store.shipNote}
          </p>
        )}
      </div>
    </>
  );
}

/**
 * Groups the designs into the stacked sections of the page.
 *
 * `sections` is the category order set in the admin, so Shirts sits above
 * Pants and Hoodies because that is how the categories are ordered — not
 * because of which design happens to come first. Anything whose category was
 * deleted still gets shown, after the named sections.
 */
function groupByCategory(items: StoreItem[], sections: string[]): [string, StoreItem[]][] {
  const map = new Map<string, StoreItem[]>();
  for (const name of sections) map.set(name, []);
  for (const i of items) {
    const key = i.category || 'Other';
    map.set(key, [...(map.get(key) ?? []), i]);
  }
  return [...map.entries()].filter(([, list]) => list.length > 0);
}

function StoreHero({
  store,
  count,
  open,
}: {
  store: StoreHeader;
  count: number;
  open: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b border-hairline bg-ink text-white">
      {store.heroUrl && (
        <>
          <Image
            src={store.heroUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-40"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/45"
          />
        </>
      )}
      <div className="gutter relative flex flex-wrap items-center justify-between gap-6 py-12 md:py-16">
        <div className="flex items-center gap-5">
          {store.logoUrl && (
            <span className="relative block h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-white/10">
              <Image src={store.logoUrl} alt="" fill sizes="76px" className="object-contain" />
            </span>
          )}
          <div>
            <span className="block text-[12px] font-bold uppercase tracking-[.16em] text-brand">
              Team store
            </span>
            <h1 className="h-display mt-1 text-white" style={{ fontSize: 'clamp(28px,4.4vw,52px)' }}>
              {store.name}
            </h1>
            {store.intro && (
              <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-ondark">
                {store.intro}
              </p>
            )}
            {store.closesAt && open && (
              <p className="mt-3 text-[13px] font-semibold uppercase tracking-[.08em] text-brand">
                Ordering closes {store.closesAt}
              </p>
            )}
          </div>
        </div>

        {count > 0 && (
          <Link href={`/${store.slug}/checkout`} className="btn btn-yellow btn-lg shrink-0">
            <Icon name="check" size={16} />
            Checkout · {count} {count === 1 ? 'item' : 'items'}
          </Link>
        )}
      </div>
    </section>
  );
}

function ItemCard({ item, canBuy }: { item: StoreItem; canBuy: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const image = item.images[0]?.url ?? null;

  function addToCart() {
    add({
      itemId: item.id,
      name: item.name,
      image,
      price: item.price,
      namePrice: item.namePrice,
      numberPrice: item.numberPrice,
      allowName: item.allowName,
      allowNumber: item.allowNumber,
      sizes: item.sizes,
      options: item.options,
      chosenOptions: {},
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article className="flex flex-col border border-hairline bg-white">
      <div className="relative aspect-[4/3] bg-plate">
        {image ? (
          <Image
            src={image}
            alt={item.name}
            fill
            sizes="(max-width:768px) 100vw, 320px"
            className="object-contain p-2"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[16px] font-extrabold uppercase tracking-[.04em]">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-body">{item.description}</p>
        )}

        <div className="mt-auto pt-5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[24px] font-black leading-none">
              {money(item.price)}
            </span>
            {(item.allowName || item.allowNumber) && (
              <span className="text-[12px] text-muted">+ personalisation</span>
            )}
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!canBuy}
            className={cn(
              'mt-3.5 flex w-full items-center justify-center gap-2 rounded-[3px] px-5 py-3.5',
              'font-display text-[13px] font-extrabold uppercase tracking-[.1em]',
              'transition-colors duration-150',
              added
                ? 'bg-[#1F8A4C] text-white'
                : canBuy
                  ? 'bg-ink text-white hover:bg-brand hover:text-ink'
                  : 'cursor-not-allowed bg-plate text-faint'
            )}
          >
            {added ? (
              <>
                <Icon name="check" size={15} strokeWidth={3} />
                Added
              </>
            ) : canBuy ? (
              'Add to cart'
            ) : (
              'Ordering closed'
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
