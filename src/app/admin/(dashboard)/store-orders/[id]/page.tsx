import { notFound } from 'next/navigation';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Card } from '@/components/admin/ui';
import { formatDateTime, money } from '@/lib/utils';
import { OrderStatusPicker } from '@/components/admin/OrderStatusPicker';
import { DeleteRecord } from '@/components/admin/DeleteRecord';

export const dynamic = 'force-dynamic';

const TONE = {
  PENDING: 'yellow',
  PAID: 'green',
  FULFILLED: 'blue',
  CANCELLED: 'neutral',
  REFUNDED: 'red',
} as const;

export default async function StoreOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.storeOrder.findUnique({
    where: { id },
    include: { store: true, items: true },
  });
  if (!order) notFound();

  const o = plain(order);

  return (
    <AdminPage
      title={o.reference}
      back={{ href: '/admin/store-orders', label: 'All store orders' }}
      description={`${o.store.name} · placed ${formatDateTime(o.createdAt)}`}
      actions={
        <>
          <OrderStatusPicker id={o.id} status={o.status} />
          <DeleteRecord
            resource="storeOrders"
            id={o.id}
            name={`order ${o.reference}`}
            redirectTo="/admin/store-orders"
            variant="button"
          />
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card title="What was ordered">
            <ul className="divide-y divide-[#EFEFEC]">
              {o.items.map((it: any) => (
                <li key={it.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-0">
                  <div>
                    <span className="block font-semibold">{it.itemName}</span>
                    <span className="mt-0.5 block text-[13px] text-[#6B6D74]">
                      {[
                        it.size && `Size ${it.size}`,
                        it.nameOnItem && `Name: ${it.nameOnItem}`,
                        it.numberOnItem && `Number: ${it.numberOnItem}`,
                        ...Object.entries((it.options ?? {}) as Record<string, string>).map(
                          ([k, v]) => `${k}: ${v}`
                        ),
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No personalisation'}
                    </span>
                  </div>
                  <div className="whitespace-nowrap text-right">
                    <span className="block text-[13px] text-[#6B6D74]">
                      {it.quantity} × {money(Number(it.unitPrice))}
                    </span>
                    <span className="block font-semibold">{money(Number(it.lineTotal))}</span>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-4 border-t border-[#EFEFEC] pt-4 text-[14px]">
              <div className="flex justify-between py-1">
                <dt className="text-[#6B6D74]">Subtotal</dt>
                <dd>{money(Number(o.subtotal))}</dd>
              </div>
              {Number(o.shipping) > 0 && (
                <div className="flex justify-between py-1">
                  <dt className="text-[#6B6D74]">Shipping</dt>
                  <dd>{money(Number(o.shipping))}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[#EFEFEC] pt-3 text-[16px] font-bold">
                <dt>Total</dt>
                <dd>
                  {money(Number(o.total))} {o.currency}
                </dd>
              </div>
            </dl>
          </Card>

          {o.notes && (
            <Card title="Customer notes">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{o.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Payment">
            <dl className="space-y-3 text-[14px]">
              <Row label="Status">
                <Badge tone={TONE[o.status as keyof typeof TONE] ?? 'neutral'}>{o.status}</Badge>
              </Row>
              <Row label="Paid">{o.paidAt ? formatDateTime(o.paidAt) : 'Not yet'}</Row>
              <Row label="PayPal order">
                <code className="text-[12px]">{o.paypalOrderId ?? '—'}</code>
              </Row>
              <Row label="PayPal capture">
                <code className="text-[12px]">{o.paypalCaptureId ?? '—'}</code>
              </Row>
            </dl>
          </Card>

          <Card title="Customer">
            <dl className="space-y-3 text-[14px]">
              <Row label="Name">{o.customerName}</Row>
              <Row label="Email">
                <a href={`mailto:${o.email}`} className="underline decoration-brand decoration-2">
                  {o.email}
                </a>
              </Row>
              <Row label="Phone">{o.phone || '—'}</Row>
              <Row label="Invoice #">
                {o.invoiceNumber ? (
                  <code className="text-[13px] font-semibold">{o.invoiceNumber}</code>
                ) : (
                  '—'
                )}
              </Row>
            </dl>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#6B6D74]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
