import { prisma } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { priceShopCart, nextShopReference, ShopError, type ShopLineInput } from '@/lib/shop';
import { createPayPalOrder, getPayPalConfig, PayPalError } from '@/lib/paypal';
import { getCustomerSession, rememberOrder } from '@/lib/customer';

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

    // The code is judged again here, with the email this time, so a code
    // that expired, ran out or hit its per-customer limit between the cart
    // and this moment is not honoured because the browser still had it.
    const cart = await priceShopCart((body?.lines ?? []) as ShopLineInput[], cfg.currency, {
      code: body?.code,
      email,
    });
    if (cart.discountError) return badRequest(cart.discountError);
    const reference = await nextShopReference();

    /*
     * Tie the order to the account, when there is one.
     *
     * Only ever from the session cookie — never from the email typed into the
     * form. Matching by address here would let anyone attach an order to
     * somebody else's account simply by typing their address at checkout.
     */
    const session = await getCustomerSession();

    const paypalOrderId = await createPayPalOrder({
      reference,
      total: cart.total,
      currency: cart.currency,
      description: 'Design Sportswear order',
    });

    const order = await prisma.shopOrder.create({
      data: {
        reference,
        customerId: session?.id ?? null,
        customerName,
        email,
        phone: phone || null,
        shipTo,
        notes: notes || null,
        subtotal: cart.subtotal,
        discountCode: cart.discount?.code ?? null,
        discount: cart.discount?.amount ?? 0,
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

    // So the thank-you page can offer to keep this order in a new account.
    // Only this browser is told, and only for the next couple of hours.
    if (!session) await rememberOrder(order.id);

    // The address this order is going to becomes the one the next checkout
    // starts from. Never fails the order: it is a convenience, not a record.
    if (session) {
      await prisma.customer
        .update({ where: { id: session.id }, data: { phone: phone || undefined, shipTo } })
        .catch((err) => console.error('[shop/checkout] could not save the address:', err));
    }

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
    const cart = await priceShopCart((body?.lines ?? []) as ShopLineInput[], 'USD', {
      code: body?.code,
    });
    return json({ ok: true, ...cart });
  } catch (err) {
    if (err instanceof ShopError) return json({ error: err.message }, err.status);
    console.error('[shop/price]', err);
    return serverError(err);
  }
}
