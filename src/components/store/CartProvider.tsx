'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Team-store cart.
 *
 * Lines are kept per store in localStorage so a shopper can leave and come
 * back. Only ids, sizes and personalisation are stored — prices shown here are
 * for display, and the server prices the order again at checkout.
 */

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  image: string | null;
  price: number;
  namePrice: number;
  numberPrice: number;
  allowName: boolean;
  allowNumber: boolean;
  sizes: string[];
  options: { name: string; values: string[] }[];
  chosenOptions: Record<string, string>;
  size: string;
  nameOnItem: string;
  numberOnItem: string;
  quantity: number;
};

/** What a product card supplies; the cart fills in the rest. */
export type NewCartLine = Omit<
  CartLine,
  'key' | 'size' | 'nameOnItem' | 'numberOnItem' | 'quantity'
>;

/** A design as the store has it right now — what a cart line is refreshed from. */
export type LiveItem = Pick<
  CartLine,
  'name' | 'image' | 'price' | 'namePrice' | 'numberPrice' | 'allowName' | 'allowNumber' | 'sizes' | 'options'
>;

type Ctx = {
  lines: CartLine[];
  count: number;
  add: (line: NewCartLine) => void;
  update: (key: string, patch: Partial<CartLine>) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
  /** Designs taken out of the cart on load because the store no longer sells them. */
  removed: string[];
};

/**
 * Brings saved lines up to date with the store as it is now.
 *
 * A line copies the design's settings at the moment it is added, and a cart
 * can sit in a browser for days. Without this, switching names off on a visor
 * left an old cart still offering "Name on the item" — the shopper typed one,
 * the page added the charge, and the server quietly dropped both, so what they
 * were shown and what they paid disagreed. What the shopper chose (size,
 * name, number, quantity, options) is kept wherever it is still allowed.
 */
function reconcile(lines: CartLine[], live?: Record<string, LiveItem>) {
  if (!live) return { lines, removed: [] as string[] };
  const kept: CartLine[] = [];
  const removed: string[] = [];
  for (const l of lines) {
    const now = live[l.itemId];
    if (!now) {
      removed.push(l.name);
      continue;
    }
    const offered = new Set(now.options.map((o) => o.name));
    kept.push({
      ...l,
      ...now,
      nameOnItem: now.allowName ? l.nameOnItem : '',
      numberOnItem: now.allowNumber ? l.numberOnItem : '',
      chosenOptions: Object.fromEntries(
        Object.entries(l.chosenOptions ?? {}).filter(([k]) => offered.has(k))
      ),
    });
  }
  return { lines: kept, removed };
}

const CartCtx = createContext<Ctx | null>(null);

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

const storageKey = (slug: string) => `ds-store-cart:${slug}`;

export function CartProvider({
  slug,
  live,
  children,
}: {
  slug: string;
  /** The store's designs as they are now, keyed by id. */
  live?: Record<string, LiveItem>;
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(slug));
      if (raw) {
        const fresh = reconcile(JSON.parse(raw) as CartLine[], live);
        setLines(fresh.lines);
        setRemoved(fresh.removed);
      }
    } catch {
      /* private mode or cleared storage — start empty */
    }
    setReady(true);
    // `live` comes from the server with the page and does not change after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey(slug), JSON.stringify(lines));
    } catch {
      /* storage unavailable — the cart still works for this page view */
    }
  }, [lines, slug, ready]);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      ready,
      removed,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add: (line) =>
        setLines((prev) => [
          ...prev,
          {
            ...line,
            size: '',
            nameOnItem: '',
            numberOnItem: '',
            quantity: 1,
            // Each add is its own line: two jerseys need two different names.
            key: `${line.itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          },
        ]),
      update: (key, patch) =>
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l))),
      remove: (key) => setLines((prev) => prev.filter((l) => l.key !== key)),
      clear: () => setLines([]),
    }),
    [lines, ready, removed]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

/** The shape the cart is refreshed from, built from the store's own items. */
export function liveItems(
  items: {
    id: string;
    name: string;
    images: { url: string }[];
    price: number;
    namePrice: number;
    numberPrice: number;
    allowName: boolean;
    allowNumber: boolean;
    sizes: string[];
    options: { name: string; values: string[] }[];
  }[]
): Record<string, LiveItem> {
  return Object.fromEntries(
    items.map((i) => [
      i.id,
      {
        name: i.name,
        image: i.images[0]?.url ?? null,
        price: i.price,
        namePrice: i.namePrice,
        numberPrice: i.numberPrice,
        allowName: i.allowName,
        allowNumber: i.allowNumber,
        sizes: i.sizes,
        options: i.options,
      },
    ])
  );
}

/** Display-only line price; the server recalculates before charging. */
export function linePrice(l: CartLine): number {
  const extras = (l.nameOnItem ? l.namePrice : 0) + (l.numberOnItem ? l.numberPrice : 0);
  return Math.round((l.price + extras) * l.quantity * 100) / 100;
}
