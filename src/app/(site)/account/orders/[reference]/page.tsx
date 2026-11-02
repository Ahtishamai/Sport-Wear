import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCustomer, ordersWhere } from '@/lib/customer';
import { DEFAULT_TIERS, money, unitPriceFor, type VolumeTier } from '@/lib/utils';
import { PageHeaderBlock } from '@/components/blocks/sections';
import { ReorderButton } from '@/components/account/AccountPanels';
import type { NewShopLine } from '@/components/shop/CartProvider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

const STATUS: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Awaiting payment',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const me = await getCustomer();
  if (!me) redirect(`/account/sign-in?next=/account/orders/${encodeURIComponent(reference)}`);

  // The ownership test is part of the query, not a check afterwards: there is
  // no path here that loads somebody else's order first and then decides.
  const order = await prisma.shopOrder.findFirst({
    where: { AND: [{ reference }, ordersWhere(me)] },
    include: { items: { include: { product: { select: { status: true, sellOnline: true } } } } },
  });
  if (!order) notFound();

  const ship = (order.shipTo ?? {}) as Record<string, string>;
  const address = [ship.line1, ship.line2, ship.city, ship.state, ship.postcode]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);

  /*
   * What can go back in the cart.
   *
   * Only lines whose product is still sold online, and at today's price — the
   * figure below is for showing a total, and the server prices the cart again
   * at checkout, so an old order can never buy at an old price.
   */
  const live = await prisma.product.findMany({
    where: {
      id: { in: order.items.map((i) => i.productId).filter((v): v is string => Boolean(v)) },
      status: 'PUBLISHED',
      sellOnline: true,
    },
    select: { id: true, handle: true, title: true, basePrice: true, volumeTiers: true, images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 } },
  });
  const byId = new Map(live.map((p) => [p.id, p]));

  const reorder: NewShopLine[] = [];
  const missing: string[] = [];
  for (const li of order.items) {
    const p = li.productId ? byId.get(li.productId) : undefined;
    if (!p) {
      missing.push(li.title);
      continue;
    }
    // Today's price at this quantity, worked out the same way the cart and
    // the checkout work it out.
    const tiers = (p.volumeTiers as VolumeTier[] | null) ?? DEFAULT_TIERS;
    const unit = unitPriceFor(Number(p.basePrice), tiers, li.quantity);
    reorder.push({
      productId: p.id,
      handle: p.handle,
      title: p.title,
      image: p.images[0]?.url ?? li.image ?? null,
      size: li.size ?? '',
      sport: li.sport ?? '',
      colorway: li.colorway ?? '',
      teamName: li.teamName ?? '',
      number: li.number ?? '',
      orderType: li.orderType === 'team' ? 'team' : 'individual',
      unitPrice: unit,
      quantity: li.quantity,
    });
  }

  return (
    <>
      <PageHeaderBlock
        p={{
          eyebrow: STATUS[order.status] ?? order.status,
          heading: `Order ${order.reference}`,
          body: '',
          showBreadcrumb: true,
        }}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'My account', href: '/account' },
          { label: order.reference },
        ]}
      />

      <section className="gutter py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-14">
          <div>
            <ul className="divide-y divide-hairline border border-hairline bg-white">
              {order.items.map((li) => (
                <li key={li.id} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                  <div className="relative h-[88px] w-[72px] shrink-0 overflow-hidden bg-plate">
                    {li.image && (
                      <Image src={li.image} alt="" fill sizes="72px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-extrabold uppercase leading-snug">
                      {li.handle ? (
                        <Link href={`/products/${li.handle}`} className="hover:text-brand-text">
                          {li.title}
                        </Link>
                      ) : (
                        li.title
                      )}
                    </p>
                    <p className="mt-1 text-[13px] text-body">
                      {[
                        li.size && `Size ${li.size}`,
                        li.colorway,
                        li.sport,
                        li.teamName && `“${li.teamName}”`,
                        li.number && `#${li.number}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      {li.quantity} × {money(Number(li.unitPrice))}
                    </p>
                  </div>
                  <p className="font-display text-[15px] font-extrabold tabular-nums">
                    {money(Number(li.lineTotal))}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <h2 className="h-display text-[18px]">Order it again</h2>
              <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-body">
                The same sizes, names and numbers go straight back in your cart, priced at
                today&rsquo;s rates.
              </p>
              <div className="mt-4">
                <ReorderButton lines={reorder} missing={missing} />
              </div>
            </div>
          </div>

          <div className="space-y-7">
            <div className="border border-hairline bg-white p-6">
              <h2 className="h-display text-[18px]">What it came to</h2>
              <dl className="mt-4 space-y-2 text-[14px]">
                <Row label="Subtotal" value={money(Number(order.subtotal))} />
                {Number(order.discount) > 0 && (
                  <Row
                    label={order.discountCode ? `Discount ${order.discountCode}` : 'Discount'}
                    value={`−${money(Number(order.discount))}`}
                  />
                )}
                <Row
                  label="Shipping"
                  value={Number(order.shipping) > 0 ? money(Number(order.shipping)) : 'Free'}
                />
                <div className="flex items-baseline justify-between border-t border-hairline pt-3">
                  <dt className="font-display text-[13px] font-extrabold uppercase tracking-[.12em]">
                    Total
                  </dt>
                  <dd className="font-display text-[20px] font-black tabular-nums">
                    {money(Number(order.total))}
                  </dd>
                </div>
              </dl>
            </div>

            {address.length > 0 && (
              <div className="border border-hairline bg-white p-6">
                <h2 className="h-display text-[18px]">Shipped to</h2>
                <address className="mt-3 text-[14px] not-italic leading-relaxed text-body">
                  {order.customerName}
                  <br />
                  {address.join(', ')}
                </address>
              </div>
            )}

            <Link href="/account" className="inline-block text-[13.5px] font-semibold text-body underline underline-offset-4 hover:text-ink">
              Back to my orders
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-body">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
