import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { capturePayPalOrder, PayPalError } from '@/lib/paypal';
import { sendPaymentReceiptQuietly } from '@/lib/emails/send-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirms an invoice payment.
 *
 * The captured amount is checked against the amount recorded when the payment
 * was started, so a tampered capture cannot mark an invoice settled for less.
 * Capturing twice is a no-op rather than an error — a customer who refreshes or
 * double-clicks must not be charged again.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`pay-capture:${ip}`, 40, 10 * 60_000).ok) {
    return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request.');
  }

  const paypalOrderId = String(body?.paypalOrderId ?? '').trim();
  if (!paypalOrderId) return badRequest('Missing payment reference.');

  try {
    const payment = await prisma.invoicePayment.findUnique({ where: { paypalOrderId } });
    if (!payment) return json({ error: 'That payment was not found.' }, 404);

    if (payment.status !== 'PENDING') {
      return json({
        ok: true,
        reference: payment.reference,
        amount: Number(payment.amount),
        currency: payment.currency,
        alreadyPaid: true,
      });
    }

    const capture = await capturePayPalOrder(paypalOrderId);

    const expected = Number(payment.amount);
    const paid = Number(capture.amount);
    const settled = capture.status.toUpperCase() === 'COMPLETED';

    if (!settled || Math.abs(paid - expected) > 0.009 || capture.currency !== payment.currency) {
      console.error(
        `[pay/capture] mismatch on ${payment.reference}: status=${capture.status} ` +
          `paid=${paid}${capture.currency} expected=${expected}${payment.currency}`
      );
      return json(
        {
          error:
            'The payment did not complete correctly. You have not been charged in full — please contact us.',
        },
        409
      );
    }

    await prisma.invoicePayment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paypalCaptureId: capture.captureId,
        // The form does not insist on a name or address, so take PayPal's
        // where the customer left ours blank.
        customerName: payment.customerName || capture.payerName || 'PayPal customer',
        email: payment.email || capture.payerEmail || '',
      },
    });

    // The money is already taken. A mail server that is down must not turn a
    // completed payment into an error for someone who has just been charged.
    await sendPaymentReceiptQuietly(payment.id);

    return json({
      ok: true,
      reference: payment.reference,
      amount: expected,
      currency: payment.currency,
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      console.error('[pay/capture] paypal:', err.message, err.detail ?? '');
      return json({ error: 'PayPal could not complete that payment.' }, 502);
    }
    console.error('[pay/capture]', err);
    return serverError(err);
  }
}
