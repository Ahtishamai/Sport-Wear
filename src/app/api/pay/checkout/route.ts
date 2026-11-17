import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { checkPayment, formatShipTo, nextPaymentReference, PayError } from '@/lib/invoice-pay';
import { createPayPalOrder, getPayPalConfig, PayPalError } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Starts a payment against an invoice the shop has already sent.
 *
 * The amount is the customer's, because only they hold the invoice — so it is
 * bounded by the limits in site settings and written down here before PayPal is
 * told anything. The row stays PENDING until /api/pay/capture confirms the same
 * amount actually arrived.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  // Tighter than the team store: there is no cart to build up, so a burst of
  // attempts from one address is far more likely to be card testing than a
  // parent fumbling a form.
  if (!rateLimit(`pay-checkout:${ip}`, 15, 10 * 60_000).ok) {
    return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request.');
  }

  try {
    const cfg = await getPayPalConfig();
    if (!cfg.enabled) {
      return json({ error: 'Online payment is not available right now.' }, 503);
    }

    const payment = await checkPayment(body as Record<string, unknown>);
    const reference = await nextPaymentReference();

    const paypalOrderId = await createPayPalOrder({
      reference,
      total: payment.amount,
      currency: cfg.currency,
      description: `Invoice ${payment.invoiceNumber}`,
    });

    const row = {
      reference,
      invoiceNumber: payment.invoiceNumber,
      customerName: payment.customerName,
      email: payment.email,
      phone: payment.phone,
      note: payment.note,
      amount: payment.amount,
      currency: cfg.currency,
      status: 'PENDING' as const,
      paypalOrderId,
    };

    try {
      await prisma.invoicePayment.create({ data: { ...row, shipTo: payment.shipTo ?? undefined } });
    } catch (err) {
      /*
       * The address column may not be on the table yet.
       *
       * Adding it is one line of SQL (scripts/sql/add-invoice-shipto.sql) and
       * until somebody runs it, writing the address would fail — which would
       * mean refusing a payment over a delivery address. So the payment is
       * written without the column and the address is kept in the note, where
       * whoever packs the order will still read it. Once the column exists
       * this branch stops being reached and can go.
       */
      const unknownColumn =
        typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2022';
      if (!unknownColumn) throw err;

      const written = payment.shipTo
        ? [payment.note, 'Address: ' + formatShipTo(payment.shipTo)]
            .filter(Boolean)
            .join(String.fromCharCode(10, 10))
        : payment.note;
      await prisma.invoicePayment.create({ data: { ...row, note: written } });
    }

    return json({ ok: true, reference, paypalOrderId, amount: payment.amount, currency: cfg.currency });
  } catch (err) {
    if (err instanceof PayError) return json({ error: err.message }, err.status);
    if (err instanceof PayPalError) {
      console.error('[pay/checkout] paypal:', err.message, err.detail ?? '');
      return json({ error: 'We could not start the payment. Please try again.' }, 502);
    }
    console.error('[pay/checkout]', err);
    return serverError(err);
  }
}
