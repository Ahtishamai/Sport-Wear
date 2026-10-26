import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { capturePayPalOrder, PayPalError } from '@/lib/paypal';
import { sendShopOrderEmailQuietly } from '@/lib/emails/send-shop-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirms a catalogue payment.
 *
 * What PayPal says was captured is checked against the total this server
 * stored before the order is marked paid, so an altered or part payment
 * cannot complete an order. Capturing twice answers the same way instead of
 * charging again, because a refresh or a double-click must not cost anyone a
 * second payment.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`shop-capture:${ip}`, 60, 10 * 60_000).ok) {
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
    const order = await prisma.shopOrder.findUnique({ where: { paypalOrderId } });
    if (!order) return json({ error: 'That order was not found.' }, 404);

    if (order.status !== 'PENDING') {
      return json({ ok: true, reference: order.reference, alreadyPaid: true });
    }

    const capture = await capturePayPalOrder(paypalOrderId);

    const expected = Number(order.total);
    const paid = Number(capture.amount);
    const settled = capture.status.toUpperCase() === 'COMPLETED';

    if (!settled || Math.abs(paid - expected) > 0.009 || capture.currency !== order.currency) {
      console.error(
        `[shop/capture] mismatch on ${order.reference}: status=${capture.status} ` +
          `paid=${paid}${capture.currency} expected=${expected}${order.currency}`
      );
      return json(
        {
          error:
            'The payment did not complete correctly. You have not been charged in full — please contact us.',
        },
        409
      );
    }

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paypalCaptureId: capture.captureId,
        customerName: order.customerName || capture.payerName || 'PayPal customer',
        email: order.email || capture.payerEmail || '',
      },
    });

    // The money is taken and the order is paid; a mail server that is down is
    // something to fix later, not a failed checkout for someone just charged.
    await sendShopOrderEmailQuietly(order.id);

    return json({ ok: true, reference: order.reference });
  } catch (err) {
    if (err instanceof PayPalError) {
      console.error('[shop/capture] paypal:', err.message, err.detail ?? '');
      return json({ error: 'PayPal could not complete that payment.' }, 502);
    }
    console.error('[shop/capture]', err);
    return serverError(err);
  }
}
