import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { priceShopCart, nextShopReference, ShopError, type ShopLineInput } from '@/lib/shop';
import { createPayPalOrder, getPayPalConfig, PayPalError } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Starts a catalogue checkout.
 *
 * The cart arrives from the browser as a list of choices, never as prices:
 * every figure is worked out here from the database, so the amount handed to
 * PayPal is the amount this server decided. The order is written as PENDING
 * and only becomes PAID once /api/shop/capture sees the money arrive.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`shop-checkout:${ip}`, 40, 10 * 60_000).ok) {
    return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request.');
  }

  const customerName = String(body?.customerName ?? '').trim().slice(0, 120);
  const email = String(body?.email ?? '').trim().slice(0, 160);
  const phone = String(body?.phone ?? '').trim().slice(0, 40);
  const notes = String(body?.notes ?? '').trim().slice(0, 800);
  const shipTo = {
    line1: String(body?.address1 ?? '').trim().slice(0, 160),
    line2: String(body?.address2 ?? '').trim().slice(0, 160),
    city: String(body?.city ?? '').trim().slice(0, 80),
    state: String(body?.state ?? '').trim().slice(0, 80),
    postcode: String(body?.postcode ?? '').trim().slice(0, 24),
  };

  if (!customerName) return badRequest('Tell us who the order is for.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('Check the email address.');
  if (!shipTo.line1 || !shipTo.city) return badRequest('We need an address to ship to.');

  try {
    const cfg = await getPayPalConfig();
    if (!cfg.enabled) {
      return json({ error: 'Online payment is not available right now. Ask us for a quote instead.' }, 503);
    }

    const cart = await priceShopCart((body?.lines ?? []) as ShopLineInput[], cfg.currency);
    const reference = await nextShopReference();

    const paypalOrderId = await createPayPalOrder({
      reference,
      total: cart.total,
      currency: cart.currency,
      description: 'Design Sportswear order',
    });

    await prisma.shopOrder.create({
      data: {
        reference,
        customerName,
        email,
        phone: phone || null,
        shipTo,
        notes: notes || null,
        subtotal: cart.subtotal,
        shipping: cart.shipping,
        total: cart.total,
        currency: cart.currency,
        status: 'PENDING',
        paypalOrderId,
        items: {
          create: cart.lines.map((l) => ({
            productId: l.productId,
            title: l.title,
            handle: l.handle,
            image: l.image,
            size: l.size,
            sport: l.sport,
            colorway: l.colorway,
            teamName: l.teamName,
            number: l.number,
            orderType: l.orderType,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    return json({ ok: true, reference, paypalOrderId, total: cart.total, currency: cart.currency });
  } catch (err) {
    if (err instanceof ShopError) return json({ error: err.message }, err.status);
    if (err instanceof PayPalError) {
      console.error('[shop/checkout] paypal:', err.message, err.detail ?? '');
      return json({ error: 'We could not start the payment. Please try again.' }, 502);
    }
    console.error('[shop/checkout]', err);
    return serverError(err);
  }
}

/**
 * Prices a cart without starting a payment, for the checkout page to show the
 * real total — quantity breaks included — before anyone commits to anything.
 */
export async function PUT(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`shop-price:${ip}`, 120, 10 * 60_000).ok) {
    return json({ error: 'Too many attempts. Please wait a moment.' }, 429);
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid request.');
  }
  try {
    const cart = await priceShopCart((body?.lines ?? []) as ShopLineInput[]);
    return json({ ok: true, ...cart });
  } catch (err) {
    if (err instanceof ShopError) return json({ error: err.message }, err.status);
    console.error('[shop/price]', err);
    return serverError(err);
  }
}
