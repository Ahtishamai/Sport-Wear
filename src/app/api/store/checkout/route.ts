import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { priceCart, nextOrderReference, StoreError, type CartLineInput } from '@/lib/store';
import { createPayPalOrder, getPayPalConfig, PayPalError } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Starts a team-store checkout.
 *
 * Prices come from the database, never the request, so the amount handed to
 * PayPal is the amount this server calculated. The order is written as PENDING
 * and only becomes PAID once /api/store/capture confirms the money arrived.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  // Generous on purpose: a whole team often orders from one school or
  // workplace network, so they share an IP. Still bounded, because each
  // attempt creates a pending order and a PayPal order.
  if (!rateLimit(`store-checkout:${ip}`, 30, 10 * 60_000).ok) {
    return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request.');
  }

  const slug = String(body?.store ?? '').trim();
  const customerName = String(body?.customerName ?? '').trim().slice(0, 120);
  const email = String(body?.email ?? '').trim().slice(0, 160);
  const phone = String(body?.phone ?? '').trim().slice(0, 40);
  const notes = String(body?.notes ?? '').trim().slice(0, 800);

  if (!slug) return badRequest('Missing store.');
  if (!customerName) return badRequest('Enter your name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('Enter a valid email address.');

  try {
    const cfg = await getPayPalConfig();
    if (!cfg.enabled) {
      return json({ error: 'Online payment is not available right now.' }, 503);
    }

    const cart = await priceCart(slug, (body?.lines ?? []) as CartLineInput[], cfg.currency);
    const reference = await nextOrderReference();

    const paypalOrderId = await createPayPalOrder({
      reference,
      total: cart.total,
      currency: cart.currency,
      description: `${cart.storeName} team store order`,
    });

    await prisma.storeOrder.create({
      data: {
        reference,
        storeId: cart.storeId,
        customerName,
        email,
        phone: phone || null,
        notes: notes || null,
        subtotal: cart.subtotal,
        shipping: cart.shipping,
        total: cart.total,
        currency: cart.currency,
        status: 'PENDING',
        paypalOrderId,
        items: {
          create: cart.lines.map((l) => ({
            itemId: l.itemId,
            itemName: l.itemName,
            size: l.size,
            nameOnItem: l.nameOnItem,
            numberOnItem: l.numberOnItem,
            options: l.options ?? undefined,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    return json({ ok: true, reference, paypalOrderId, total: cart.total, currency: cart.currency });
  } catch (err) {
    if (err instanceof StoreError) return json({ error: err.message }, err.status);
    if (err instanceof PayPalError) {
      console.error('[store/checkout] paypal:', err.message, err.detail ?? '');
      return json({ error: 'We could not start the payment. Please try again.' }, 502);
    }
    console.error('[store/checkout]', err);
    return serverError(err);
  }
}
