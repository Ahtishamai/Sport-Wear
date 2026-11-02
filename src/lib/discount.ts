/**
 * Working out what a discount code takes off.
 *
 * Everything in this file is a plain function over plain values: no database,
 * no request. The server calls it twice — once to show the cart, and again
 * when the order is placed — and both times it must reach the same answer
 * from the same facts. Nothing here trusts a figure sent by a browser.
 */

export type DiscountKind = 'PERCENT' | 'FIXED';
export type DiscountScope = 'ALL' | 'COLLECTIONS' | 'PRODUCTS';

/** A code as the database holds it, with the decimals already numbers. */
export type DiscountRule = {
  id: string;
  code: string;
  label: string | null;
  kind: DiscountKind;
  value: number;
  scope: DiscountScope;
  /** Collection or product handles, when the scope is not ALL. */
  targets: string[];
  minSubtotal: number | null;
  usageLimit: number | null;
  perEmailLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

/** What a priced line needs to carry for a code to be judged against it. */
export type DiscountableLine = {
  productHandle: string;
  lineTotal: number;
  collectionHandles: string[];
};

export type AppliedDiscount = {
  code: string;
  label: string;
  kind: DiscountKind;
  value: number;
  amount: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Codes are typed by people: case and stray spaces must not matter. */
export function normalizeCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 40);
}

/** The part of the cart a code is allowed to touch. */
export function eligibleTotal(rule: DiscountRule, lines: DiscountableLine[]): number {
  if (rule.scope === 'ALL') return round(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const targets = new Set(rule.targets.map((t) => t.trim().toLowerCase()).filter(Boolean));
  if (targets.size === 0) return 0;

  const matching = lines.filter((l) =>
    rule.scope === 'PRODUCTS'
      ? targets.has(l.productHandle.toLowerCase())
      : l.collectionHandles.some((h) => targets.has(h.toLowerCase()))
  );
  return round(matching.reduce((sum, l) => sum + l.lineTotal, 0));
}

/**
 * Why this code cannot be used, in words a customer can act on — or null
 * when it can. The reason is deliberately specific: "that code has expired"
 * sends someone looking for a current one, where "invalid" sends them away.
 */
export function discountProblem(
  rule: DiscountRule | null,
  cart: { subtotal: number; lines: DiscountableLine[]; now?: Date; usesByEmail?: number }
): string | null {
  if (!rule) return 'That code is not one of ours. Check the spelling and try again.';
  if (!rule.active) return 'That code is no longer available.';

  const now = cart.now ?? new Date();
  if (rule.startsAt && now < rule.startsAt) return 'That code is not live yet.';
  if (rule.endsAt && now > rule.endsAt) return 'That code has expired.';

  if (rule.usageLimit !== null && rule.usedCount >= rule.usageLimit) {
    return 'That code has been used up.';
  }
  if (
    rule.perEmailLimit !== null &&
    cart.usesByEmail !== undefined &&
    cart.usesByEmail >= rule.perEmailLimit
  ) {
    return `That code can only be used ${rule.perEmailLimit === 1 ? 'once' : rule.perEmailLimit + ' times'} per customer.`;
  }

  if (rule.minSubtotal !== null && cart.subtotal < rule.minSubtotal) {
    const short = round(rule.minSubtotal - cart.subtotal);
    return `That code needs an order of $${rule.minSubtotal.toFixed(2)} — you are $${short.toFixed(2)} short.`;
  }

  if (eligibleTotal(rule, cart.lines) <= 0) {
    return 'That code does not apply to anything in your cart.';
  }

  return null;
}

/**
 * How much comes off. Never more than the part of the cart the code covers,
 * so a $50 code on a $30 shirt takes off $30 and not a cent more — an order
 * can be free, never negative.
 */
export function discountAmount(rule: DiscountRule, lines: DiscountableLine[]): number {
  const eligible = eligibleTotal(rule, lines);
  if (eligible <= 0 || rule.value <= 0) return 0;

  const raw = rule.kind === 'PERCENT' ? (eligible * rule.value) / 100 : rule.value;
  return round(Math.max(0, Math.min(eligible, raw)));
}

/** The whole answer: the amount, with the label the cart and invoice show. */
export function applyDiscount(rule: DiscountRule, lines: DiscountableLine[]): AppliedDiscount {
  const amount = discountAmount(rule, lines);
  const fallback = rule.kind === 'PERCENT' ? `${rule.value}% off` : `$${rule.value.toFixed(2)} off`;
  return {
    code: rule.code,
    label: rule.label?.trim() || fallback,
    kind: rule.kind,
    value: rule.value,
    amount,
  };
}
