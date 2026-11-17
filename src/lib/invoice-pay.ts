import 'server-only';
import { prisma } from './db';
import { getSettings } from './settings';
import { parsePayAmount } from './utils';

/**
 * Paying an invoice the shop has already sent.
 *
 * A team-store checkout prices itself from the database and ignores whatever
 * the browser claims. This cannot: the amount owed lives on a paper invoice, so
 * the customer types it. That makes the bounds the only real guard, and they
 * matter — an unbounded field is a way to send a stranger's card a $50,000
 * charge, or to test stolen cards a cent at a time. Both ends are set in site
 * settings and enforced here, not in the form.
 */

export class PayError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export type PaymentInput = {
  invoiceNumber?: unknown;
  amount?: unknown;
  customerName?: unknown;
  email?: unknown;
  phone?: unknown;
  note?: unknown;
  shipTo?: unknown;
};

/** Where the order goes, in the shape the two order tables already use. */
export type ShipTo = {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
};

export type CheckedPayment = {
  invoiceNumber: string;
  amount: number;
  customerName: string;
  email: string;
  phone: string | null;
  note: string | null;
  shipTo: ShipTo | null;
};

/**
 * The address, if enough of one was given to post something to.
 *
 * Partly filled in is treated as not filled in. A street with no town is not
 * an address anybody can pack against, and keeping it would put a half
 * written one in front of whoever is packing as though it were usable.
 */
function checkShipTo(raw: unknown): ShipTo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const line1 = clean(r.line1, 120);
  const city = clean(r.city, 80);
  const region = clean(r.region, 80);
  const postcode = clean(r.postcode, 20);
  if (!line1 || !city || !postcode) return null;

  return {
    line1,
    line2: clean(r.line2, 120) || undefined,
    city,
    region,
    postcode,
    country: clean(r.country, 60) || 'United States',
  };
}

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function checkPayment(raw: PaymentInput): Promise<CheckedPayment> {
  const s = await getSettings();
  if (!s.payEnabled) throw new PayError('Invoice payments are switched off.', 503);

  const invoiceNumber = clean(raw.invoiceNumber, 64);
  if (!invoiceNumber) throw new PayError('Enter the invoice number from your invoice.');

  const min = Number(s.payMin) > 0 ? Number(s.payMin) : 1;
  const max = Number(s.payMax) > 0 ? Number(s.payMax) : 10000;

  // The same parser the form uses, so the figure a customer is shown and the
  // figure they are charged can never disagree.
  const { amount, problem } = parsePayAmount(raw.amount, min, max);
  if (problem || amount === null) throw new PayError(problem || 'Enter the amount to pay.');

  const email = clean(raw.email, 160);
  if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    throw new PayError('That email address does not look right.');
  }

  return {
    invoiceNumber,
    amount,
    customerName: clean(raw.customerName, 120),
    email,
    phone: clean(raw.phone, 40) || null,
    note: clean(raw.note, 800) || null,
    shipTo: checkShipTo(raw.shipTo),
  };
}

/** The address on one line, for an email or a note. */
export function formatShipTo(a: ShipTo): string {
  return [a.line1, a.line2, a.city, a.region, a.postcode, a.country]
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** `PY` + five digits, so it cannot be mistaken for a DS order number. */
export async function nextPaymentReference(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const ref = 'PY' + String(Math.floor(Math.random() * 90000) + 10000);
    const clash = await prisma.invoicePayment.findUnique({ where: { reference: ref } });
    if (!clash) return ref;
  }
  return 'PY' + Date.now().toString().slice(-8);
}
