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
};

export type CheckedPayment = {
  invoiceNumber: string;
  amount: number;
  customerName: string;
  email: string;
  phone: string | null;
  note: string | null;
};

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
  };
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
