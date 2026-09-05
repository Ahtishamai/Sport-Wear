import 'server-only';
import { prisma } from '../db';
import { getSettings } from '../settings';
import { addressList, sendMail, type MailResult } from '../mail';
import { formatStoreDeadline } from '../utils';
import { renderOrderEmail, type OrderEmailItem } from './order';

/**
 * Builds and sends the confirmation for one order.
 *
 * The design photograph is read through the item relation at send time rather
 * than copied onto the order line, so the email shows the artwork as it stands.
 * A design deleted since the order was placed simply loses its picture; every
 * other detail — size, name, number, options, price — was written onto the
 * order line at checkout and cannot drift.
 */
export async function sendOrderEmail(
  orderId: string,
  opts: { to?: string; copyOnly?: boolean } = {}
): Promise<MailResult & { skipped?: string; subject?: string }> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: {
      store: { select: { slug: true, name: true, shipNote: true, closesAt: true } },
      items: {
        include: { item: { select: { images: true } } },
      },
    },
  });
  if (!order) return { ok: false, error: 'Order not found.' };

  const settings = await getSettings();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

  const items: OrderEmailItem[] = order.items.map((li) => {
    const images = (li.item?.images as { url?: string }[] | null) ?? [];
    const raw = (li.options as unknown) ?? null;
    const options = Array.isArray(raw)
      ? (raw as { name?: string; value?: string }[])
          .filter((o) => o?.name && o?.value)
          .map((o) => ({ name: String(o.name), value: String(o.value) }))
      : Object.entries((raw as Record<string, unknown>) ?? {})
          .filter(([, v]) => v != null && String(v) !== '')
          .map(([name, value]) => ({ name, value: String(value) }));

    return {
      name: li.itemName,
      image: images.find((i) => i?.url)?.url ?? null,
      size: li.size,
      nameOnItem: li.nameOnItem,
      numberOnItem: li.numberOnItem,
      options,
      quantity: li.quantity,
      unitPrice: Number(li.unitPrice),
      lineTotal: Number(li.lineTotal),
    };
  });

  const { subject, html, text } = renderOrderEmail({
    reference: order.reference,
    placedAt: order.createdAt,
    paid: order.status === 'PAID',
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    email: order.email,
    items,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    total: Number(order.total),
    currency: order.currency,
    storeName: order.store.name,
    storeUrl: base ? `${base}/${order.store.slug}` : '',
    closesAt: order.store.closesAt ? formatStoreDeadline(order.store.closesAt) : null,
    shipNote: order.store.shipNote,
    intro: settings.orderEmailIntro,
    footer: settings.orderEmailFooter,
    siteName: settings.siteName,
    siteUrl: base,
    supportEmail: settings.email,
    supportPhone: settings.phone,
    trackUrl: settings.trackingEnabled && base ? `${base}/track-order` : null,
  });

  const to = opts.copyOnly ? '' : (opts.to ?? order.email ?? '').trim();
  const bcc = addressList(settings.orderEmailCopyTo).join(', ');

  // A store order can be paid through PayPal without the shopper ever typing
  // an address here, so "no customer email" is a normal outcome, not a fault.
  if (!to && !bcc) return { ok: false, skipped: 'no-recipient', error: 'No address to send to.' };

  const res = await sendMail({ to, subject, html, text, bcc });
  return { ...res, subject };
}

/** Fire-and-forget wrapper for paths where the email must never block. */
export async function sendOrderEmailQuietly(orderId: string) {
  try {
    const settings = await getSettings();
    if (!settings.orderEmailsEnabled) return;
    const res = await sendOrderEmail(orderId);
    if (!res.ok && !res.skipped) console.error('[order-email]', orderId, res.error);
  } catch (err) {
    console.error('[order-email] unexpected:', err);
  }
}
