import { prisma } from '@/lib/db';
import { getAccessor } from '@/lib/auth';
import { forbidden, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import { getSettings } from '@/lib/settings';
import { formatStoreDeadline } from '@/lib/utils';
import { renderOrderEmail, type OrderEmailItem } from '@/lib/emails/order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Renders the confirmation in the browser so the wording and the layout can be
 * checked without placing an order or sending anything.
 *
 * It prefers a real order, because made-up data hides the things that actually
 * go wrong — a design with no photo, a twelve-word team name, a shirt with no
 * personalisation. Only an empty shop falls back to the sample.
 */
export async function GET(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseArea(user, 'settings') && !canUseArea(user, 'orders')) return forbidden();

  const settings = await getSettings();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref')?.trim();

  const order = await prisma.storeOrder.findFirst({
    where: ref ? { reference: ref } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      store: { select: { slug: true, name: true, shipNote: true, closesAt: true } },
      items: { include: { item: { select: { images: true } } } },
    },
  });

  const common = {
    intro: settings.orderEmailIntro,
    footer: settings.orderEmailFooter,
    siteName: settings.siteName,
    siteUrl: base,
    supportEmail: settings.email,
    supportPhone: settings.phone,
    trackUrl: settings.trackingEnabled && base ? `${base}/track-order` : null,
    currency: settings.storeCurrency,
  };

  const html = order
    ? renderOrderEmail({
        ...common,
        reference: order.reference,
        placedAt: order.createdAt,
        paid: order.status === 'PAID',
        invoiceNumber: order.invoiceNumber,
        customerName: order.customerName,
        email: order.email,
        currency: order.currency,
        items: order.items.map((li): OrderEmailItem => {
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
        }),
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        total: Number(order.total),
        storeName: order.store.name,
        storeUrl: base ? `${base}/${order.store.slug}` : '',
        closesAt: order.store.closesAt ? formatStoreDeadline(order.store.closesAt) : null,
        shipNote: order.store.shipNote,
      }).html
    : renderOrderEmail({
        ...common,
        reference: 'DS00000',
        placedAt: new Date(),
        paid: true,
        invoiceNumber: 'INV-1042',
        customerName: 'Sample Customer',
        email: 'customer@example.com',
        items: [
          {
            name: 'Design #1 — Shirt',
            image: null,
            size: 'Youth Large',
            nameOnItem: 'JOHNSON',
            numberOnItem: '24',
            options: [{ name: 'Sleeve', value: 'Short' }],
            quantity: 1,
            unitPrice: 26.5,
            lineTotal: 26.5,
          },
        ],
        subtotal: 26.5,
        shipping: 0,
        total: 26.5,
        storeName: 'Sample Team',
        storeUrl: base,
        closesAt: null,
        shipNote: null,
      }).html;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
