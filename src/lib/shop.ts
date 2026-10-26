import 'server-only';
import { prisma } from './db';
import { activeTier, unitPriceFor, type VolumeTier } from './utils';
import { DEFAULT_TIERS } from './utils';

/**
 * Pricing a catalogue order.
 *
 * The browser sends what is in the cart; every figure is worked out again
 * here, from the database, because the only price worth charging is the one
 * this server calculates.
 *
 * Quantity discounts are counted per product across the whole cart. Someone
 * buying six of one shirt in three sizes has bought six shirts, and gets the
 * six-shirt price — splitting the run by size would quietly overcharge them.
 */

export class ShopError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export type ShopLineInput = {
  productId?: unknown;
  size?: unknown;
  sport?: unknown;
  colorway?: unknown;
  teamName?: unknown;
  number?: unknown;
  orderType?: unknown;
  quantity?: unknown;
};

export type PricedShopLine = {
  productId: string;
  title: string;
  handle: string;
  image: string | null;
  size: string | null;
  sport: string | null;
  colorway: string | null;
  teamName: string | null;
  number: string | null;
  orderType: 'individual' | 'team';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PricedShopCart = {
  currency: string;
  lines: PricedShopLine[];
  subtotal: number;
  shipping: number;
  total: number;
};

/** Team orders are made as a run, so they start at ten of that product. */
export const TEAM_MINIMUM = 10;

const money = (n: number) => Math.round(n * 100) / 100;
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function priceShopCart(lines: ShopLineInput[], currency = 'USD'): Promise<PricedShopCart> {
  if (!Array.isArray(lines) || lines.length === 0) throw new ShopError('Your cart is empty.');
  if (lines.length > 50) throw new ShopError('That is too many different items for one order.');

  const ids = [...new Set(lines.map((l) => clean(l.productId, 191)).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'PUBLISHED' },
    include: { images: { orderBy: { position: 'asc' }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // How many of each product are in the cart altogether — that is what the
  // quantity price is read from.
  const totalPer = new Map<string, number>();
  for (const raw of lines) {
    const id = clean(raw.productId, 191);
    const qty = Math.floor(Number(raw.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) throw new ShopError('Choose a quantity between 1 and 999.');
    totalPer.set(id, (totalPer.get(id) ?? 0) + qty);
  }

  const priced: PricedShopLine[] = [];
  for (const raw of lines) {
    const id = clean(raw.productId, 191);
    const product = byId.get(id);
    if (!product) throw new ShopError('One of the items is no longer available.');

    const orderType = clean(raw.orderType, 16) === 'team' ? 'team' : 'individual';
    const runForProduct = totalPer.get(id) ?? 0;
    if (orderType === 'team' && runForProduct < TEAM_MINIMUM) {
      throw new ShopError(`Team orders of ${product.title} start at ${TEAM_MINIMUM} shirts.`);
    }

    const offersSizes = ((product.sizes as string[] | null) ?? []).some(Boolean);
    const size = offersSizes ? clean(raw.size, 32) : '';
    if (offersSizes && !size) throw new ShopError(`Choose a size for ${product.title}.`);

    const teamName = product.askTeamName ? clean(raw.teamName, 64) : '';
    const number = product.askNumber && orderType === 'individual' ? clean(raw.number, 8) : '';
    if (number && !/^[0-9]{1,3}$/.test(number)) throw new ShopError('A number must be 1 to 3 digits.');

    const tiers = (product.volumeTiers as VolumeTier[] | null) ?? DEFAULT_TIERS;
    const base = Number(product.basePrice);
    const unitPrice = money(unitPriceFor(base, tiers, runForProduct));
    if (!(unitPrice > 0)) {
      // A product nobody has priced yet must not be sold for nothing.
      throw new ShopError(`${product.title} is quoted rather than sold online. Ask us for a price.`, 409);
    }

    const quantity = Math.floor(Number(raw.quantity));
    priced.push({
      productId: product.id,
      title: product.title,
      handle: product.handle,
      image: product.images[0]?.url ?? null,
      size: size || null,
      sport: clean(raw.sport, 32) || null,
      colorway: clean(raw.colorway, 60) || null,
      teamName: teamName || null,
      number: number || null,
      orderType,
      quantity,
      unitPrice,
      lineTotal: money(unitPrice * quantity),
    });
  }

  const subtotal = money(priced.reduce((sum, l) => sum + l.lineTotal, 0));
  // Shipping is included — the banner on every page promises it.
  const shipping = 0;
  return { currency, lines: priced, subtotal, shipping, total: money(subtotal + shipping) };
}

/** Which tier a quantity falls in, for showing the saving on the cart page. */
export function tierLabelFor(tiers: VolumeTier[], units: number) {
  return tiers[activeTier(tiers, units)]?.label ?? '';
}

/** A reference in the same shape as the store ones, kept unique across both. */
export async function nextShopReference(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const ref = 'DS' + String(Math.floor(Math.random() * 90000) + 10000);
    const [shop, store] = await Promise.all([
      prisma.shopOrder.findUnique({ where: { reference: ref }, select: { id: true } }),
      prisma.storeOrder.findUnique({ where: { reference: ref }, select: { id: true } }),
    ]);
    if (!shop && !store) return ref;
  }
  return 'DS' + Date.now().toString().slice(-8);
}
