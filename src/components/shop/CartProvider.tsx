'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * The catalogue cart.
 *
 * Lines live in this browser until checkout, so a shopper can look around and
 * come back. Only what was chosen is kept — product, size, personalisation and
 * how many. The prices here are for display; the server prices the order again
 * when it is paid, so nothing a browser stores can change what is charged.
 */

export type ShopLine = {
  key: string;
  productId: string;
  handle: string;
  title: string;
  image: string | null;
  size: string;
  sport: string;
  colorway: string;
  teamName: string;
  number: string;
  orderType: 'individual' | 'team';
  /** The price each at the moment it was added, for showing a total. */
  unitPrice: number;
  quantity: number;
};

export type NewShopLine = Omit<ShopLine, 'key'>;

type Ctx = {
  lines: ShopLine[];
  /** Total shirts in the cart, not the number of lines. */
  count: number;
  subtotal: number;
  add: (lines: NewShopLine[]) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = 'ds-shop-cart';

export function useShopCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useShopCart must be used inside ShopCartProvider');
  return ctx;
}

/** Two of the same thing, chosen the same way, are one line with a bigger count. */
const sameChoice = (a: NewShopLine, b: ShopLine) =>
  a.productId === b.productId &&
  a.size === b.size &&
  a.sport === b.sport &&
  a.colorway === b.colorway &&
  a.teamName === b.teamName &&
  a.number === b.number &&
  a.orderType === b.orderType;

export function ShopCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<ShopLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved)) setLines(saved.filter((l) => l?.productId && l?.quantity > 0));
    } catch {
      // A cart that cannot be read is not worth failing the page over.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* private browsing, a full disk — the cart still works for this visit */
    }
  }, [lines, ready]);

  const add = useCallback((incoming: NewShopLine[]) => {
    setLines((current) => {
      const next = [...current];
      for (const line of incoming) {
        if (line.quantity < 1) continue;
        const at = next.findIndex((l) => sameChoice(line, l));
        if (at >= 0) next[at] = { ...next[at], quantity: next[at].quantity + line.quantity };
        else next.push({ ...line, key: Math.random().toString(36).slice(2, 10) });
      }
      return next;
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      quantity < 1
        ? current.filter((l) => l.key !== key)
        : current.map((l) => (l.key === key ? { ...l, quantity: Math.min(999, quantity) } : l))
    );
  }, []);

  const remove = useCallback((key: string) => setLines((c) => c.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: Math.round(lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0) * 100) / 100,
      add,
      setQuantity,
      remove,
      clear,
      ready,
    }),
    [lines, add, setQuantity, remove, clear, ready]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
