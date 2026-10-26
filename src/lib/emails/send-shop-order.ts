import 'server-only';
import { prisma } from '../db';
import { getSettings } from '../settings';
import { sendMail, type MailResult } from '../mail';
import { checkAddresses, splitAddresses } from '../utils';
import { renderOrderEmail, type OrderEmailItem } from './order';

/**
 * The confirmation for a catalogue order.
 *
 * Same letter as a team store sends — the buyer wants the same things: what
 * they bought, in which sizes, what it cost and where it is going. Only the
 * wording of where it came from differs, and the shipping address, which a
 * team store never collects because the club hands the kit out itself.
 */
export async function sendShopOrderEmail(
  orderId: string,
  opts: { to?: string | string[]; copyOnly?: boolean } = {}
): Promise<MailResult & { skipped?: string; subject?: string; recipients?: string[] }> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: 'Order not found.' };

  const settings = await getSettings();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

  const items: OrderEmailItem[] = order.items.map((li) => ({
    name: li.title,
    image: li.image,
    size: li.size,
    // The team's name is what goes on a catalogue shirt; the number with it.
    nameOnItem: li.teamName,
    numberOnItem: li.number,
    options: [li.sport ? { name: 'Sport', value: li.sport } : null, li.colorway ? { name: 'Colours', value: li.colorway } : null].filter(
      (o): o is { name: string; value: string } => o !== null
    ),
    quantity: li.quantity,
    unitPrice: Number(li.unitPrice),
    lineTotal: Number(li.lineTotal),
  }));

  const ship = (order.shipTo ?? {}) as Record<string, string>;
  const address = [ship.line1, ship.line2, ship.city, ship.state, ship.postcode]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ');

  const { subject, html, text } = renderOrderEmail({
    reference: order.reference,
    placedAt: order.createdAt,
    paid: order.status === 'PAID',
    invoiceNumber: null,
    customerName: order.customerName,
    email: order.email,
    items,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    total: Number(order.total),
    currency: order.currency,
    storeName: settings.siteName,
    storeLabel: 'Bought from',
    storeUrl: base,
    closesAt: null,
    shipNote: address ? `Shipping to ${address}.` : null,
    intro: settings.orderEmailIntro,
    footer: settings.orderEmailFooter,
    siteName: settings.siteName,
    siteUrl: base,
    supportEmail: settings.email,
    supportPhone: settings.phone,
    trackUrl: settings.trackingEnabled && base ? `${base}/track-order` : null,
  });

  const asked = Array.isArray(opts.to) ? opts.to.join(',') : opts.to;
  const to = opts.copyOnly ? [] : checkAddresses(asked ?? order.email ?? '').valid;
  const named = new Set(to.map((a) => a.toLowerCase()));
  const bcc = splitAddresses(settings.orderEmailCopyTo).filter((a) => !named.has(a.toLowerCase()));

  if (!to.length && !bcc.length) {
    return { ok: false, skipped: 'no-recipient', error: 'No address to send to.' };
  }

  const res = await sendMail({ to: to.join(', '), subject, html, text, bcc: bcc.join(', ') });
  return { ...res, subject, recipients: to };
}

/** For the payment path, where a mail failure must never undo a paid order. */
export async function sendShopOrderEmailQuietly(orderId: string) {
  try {
    const settings = await getSettings();
    if (!settings.orderEmailsEnabled) return;
    const res = await sendShopOrderEmail(orderId);
    if (!res.ok && !res.skipped) console.error('[shop-order-email]', orderId, res.error);
  } catch (err) {
    console.error('[shop-order-email] unexpected:', err);
  }
}
