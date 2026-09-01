import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { capturePayPalOrder, PayPalError } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirms a team-store payment.
 *
 * The captured amount is checked against the total this server stored before
 * the order is marked paid, so an underpaid or altered capture cannot mark an
 * order complete. Capturing twice is a no-op rather than an error, because a
 * shopper double-clicking or refreshing must not produce a second charge.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  // Captures are idempotent and a shopper may legitimately retry, so this is
  // looser than checkout — it only exists to stop a hammering loop.
  if (!rateLimit(`store-capture:${ip}`, 60, 10 * 60_000).ok) {
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
    const order = await prisma.storeOrder.findUnique({
      where: { paypalOrderId },
      include: { store: { select: { slug: true, name: true } } },
    });
    if (!order) return json({ error: 'That order was not found.' }, 404);

    // Already settled — return the same answer rather than capturing again.
    if (order.status !== 'PENDING') {
      return json({ ok: true, reference: order.reference, alreadyPaid: true });
    }

    const capture = await capturePayPalOrder(paypalOrderId);

    const expected = Number(order.total);
    const paid = Number(capture.amount);
    const settled = capture.status.toUpperCase() === 'COMPLETED';

    if (!settled || Math.abs(paid - expected) > 0.009 || capture.currency !== order.currency) {
      console.error(
        `[store/capture] mismatch on ${order.reference}: status=${capture.status} ` +
          `paid=${paid}${capture.currency} expected=${expected}${order.currency}`
      );
      return json(
        { error: 'The payment did not complete correctly. You have not been charged in full — please contact us.' },
        409
      );
    }

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paypalCaptureId: capture.captureId,
      },
    });

    return json({ ok: true, reference: order.reference, store: order.store.slug });
  } catch (err) {
    if (err instanceof PayPalError) {
      console.error('[store/capture] paypal:', err.message, err.detail ?? '');
      return json({ error: 'PayPal could not complete that payment.' }, 502);
    }
    console.error('[store/capture]', err);
    return serverError(err);
  }
}
