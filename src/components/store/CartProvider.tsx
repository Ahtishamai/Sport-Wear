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

type Ctx = {
  lines: CartLine[];
  count: number;
  add: (line: NewCartLine) => void;
  update: (key: string, patch: Partial<CartLine>) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartCtx = createContext<Ctx | null>(null);

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

const storageKey = (slug: string) => `ds-store-cart:${slug}`;

export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(slug));
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* private mode or cleared storage — start empty */
    }
    setReady(true);
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
    [lines, ready]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

/** Display-only line price; the server recalculates before charging. */
export function linePrice(l: CartLine): number {
  const extras = (l.nameOnItem ? l.namePrice : 0) + (l.numberOnItem ? l.numberPrice : 0);
  return Math.round((l.price + extras) * l.quantity * 100) / 100;
}
