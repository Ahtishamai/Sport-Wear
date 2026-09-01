import 'server-only';
import { prisma } from './db';

/**
 * Team store pricing and cart validation.
 *
 * Every total is computed here from database prices. The browser only ever
 * sends item ids, sizes and personalisation text — never money — so a tampered
 * cart cannot change what is charged.
 */

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export type CartLineInput = {
  itemId: string;
  size?: string;
  nameOnItem?: string;
  numberOnItem?: string;
  options?: Record<string, string>;
  quantity: number;
};

export type PricedLine = {
  itemId: string;
  itemName: string;
  size: string | null;
  nameOnItem: string | null;
  numberOnItem: string | null;
  options: Record<string, string> | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PricedCart = {
  storeId: string;
  storeName: string;
  currency: string;
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
};

const money = (n: number) => Math.round(n * 100) / 100;

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** A store only accepts orders while it is open and inside its date window. */
export function storeIsOpen(store: {
  status: string;
  opensAt: Date | null;
  closesAt: Date | null;
}): boolean {
  if (store.status !== 'OPEN') return false;
  const now = Date.now();
  if (store.opensAt && now < store.opensAt.getTime()) return false;
  if (store.closesAt && now > store.closesAt.getTime()) return false;
  return true;
}

export function storeClosedReason(store: {
  status: string;
  opensAt: Date | null;
  closesAt: Date | null;
}): string | null {
  if (storeIsOpen(store)) return null;
  const now = Date.now();
  if (store.status === 'DRAFT') return 'This store is not open yet.';
  if (store.opensAt && now < store.opensAt.getTime()) {
    return `This store opens on ${store.opensAt.toLocaleDateString('en-US', { dateStyle: 'long' })}.`;
  }
  if (store.closesAt && now > store.closesAt.getTime()) {
    return `Ordering closed on ${store.closesAt.toLocaleDateString('en-US', { dateStyle: 'long' })}.`;
  }
  return 'This store is closed.';
}

/**
 * Turns a client cart into priced lines using database prices only.
 * Throws StoreError with a message safe to show the shopper.
 */
export async function priceCart(
  storeSlug: string,
  lines: CartLineInput[],
  currency = 'USD'
): Promise<PricedCart> {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new StoreError('Your cart is empty.');
  }
  if (lines.length > 50) {
    throw new StoreError('That is too many different items for one order.');
  }

  const store = await prisma.teamStore.findUnique({
    where: { slug: storeSlug },
    include: { items: { where: { status: 'PUBLISHED' } } },
  });
  if (!store) throw new StoreError('That team store was not found.', 404);
  if (!storeIsOpen(store)) {
    throw new StoreError(storeClosedReason(store) ?? 'This store is closed.', 409);
  }

  const byId = new Map(store.items.map((i) => [i.id, i]));
  const priced: PricedLine[] = [];

  for (const raw of lines) {
    const item = byId.get(String(raw.itemId));
    if (!item) throw new StoreError('One of the items is no longer available.');

    const quantity = Math.floor(Number(raw.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw new StoreError(`Choose a quantity between 1 and 99 for ${item.name}.`);
    }

    // Size must be one the item actually offers.
    const sizes = (item.sizes as string[] | null) ?? [];
    let size: string | null = null;
    if (sizes.length) {
      size = clean(raw.size, 32);
      if (!size) throw new StoreError(`Choose a size for ${item.name}.`);
      if (!sizes.includes(size)) throw new StoreError(`That size is not available for ${item.name}.`);
    }

    // Same for any design / colourway options the item defines.
    const optionDefs = (item.options as { name: string; values: string[] }[] | null) ?? [];
    let options: Record<string, string> | null = null;
    if (optionDefs.length) {
      options = {};
      for (const def of optionDefs) {
        const chosen = clean(raw.options?.[def.name], 64);
        if (!chosen) throw new StoreError(`Choose ${def.name.toLowerCase()} for ${item.name}.`);
        if (!def.values.includes(chosen)) {
          throw new StoreError(`That ${def.name.toLowerCase()} is not available for ${item.name}.`);
        }
        options[def.name] = chosen;
      }
    }

    const nameOnItem = item.allowName ? clean(raw.nameOnItem, 64) : '';
    const numberOnItem = item.allowNumber ? clean(raw.numberOnItem, 8) : '';
    if (numberOnItem && !/^[0-9]{1,3}$/.test(numberOnItem)) {
      throw new StoreError('A number on the item must be 1 to 3 digits.');
    }

    const unitPrice = money(
      Number(item.price) +
        (nameOnItem ? Number(item.namePrice) : 0) +
        (numberOnItem ? Number(item.numberPrice) : 0)
    );

    priced.push({
      itemId: item.id,
      itemName: item.name,
      size,
      nameOnItem: nameOnItem || null,
      numberOnItem: numberOnItem || null,
      options,
      quantity,
      unitPrice,
      lineTotal: money(unitPrice * quantity),
    });
  }

  const subtotal = money(priced.reduce((sum, l) => sum + l.lineTotal, 0));
  const shipping = 0;

  return {
    storeId: store.id,
    storeName: store.name,
    currency,
    lines: priced,
    subtotal,
    shipping,
    total: money(subtotal + shipping),
  };
}

/** DS-style reference, matching the tracking sheet's format. */
export async function nextOrderReference(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const ref =
      'DS' + String(Math.floor(Math.random() * 90000) + 10000);
    const clash = await prisma.storeOrder.findUnique({ where: { reference: ref } });
    if (!clash) return ref;
  }
  return 'DS' + Date.now().toString().slice(-8);
}
