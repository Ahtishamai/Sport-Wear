import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime, money } from '@/lib/utils';
import { DeleteRecord } from '@/components/admin/DeleteRecord';

export const dynamic = 'force-dynamic';

const TONE = {
  PENDING: 'yellow',
  PAID: 'green',
  FULFILLED: 'blue',
  CANCELLED: 'neutral',
  REFUNDED: 'red',
} as const;

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Fulfilled', value: 'FULFILLED' },
  { label: 'Unpaid', value: 'PENDING' },
  { label: 'Refunded', value: 'REFUNDED' },
];

/**
 * Orders placed from the catalogue, as opposed to a team store.
 *
 * PENDING rows are people who opened PayPal and did not finish. They are
 * normal and worth seeing: a run of them usually means something on the
 * checkout is in the way, not that everyone changed their mind.
 */
export default async function ShopOrdersIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const where: Prisma.ShopOrderWhereInput = {
    ...(status ? { status: status as 'PAID' } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { customerName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const orders = await prisma.shopOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true },
    take: 200,
  });

  const paidTotal = orders
    .filter((o) => o.status === 'PAID' || o.status === 'FULFILLED')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <AdminPage
      title="Shop orders"
      description="Orders paid through the catalogue checkout. Team store orders stay on their own page."
      actions={
        <form className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search reference, name, email…"
            className="field !py-2 text-[13px]"
          />
        </form>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const active = (status ?? '') === f.value;
          const params = new URLSearchParams();
          if (f.value) params.set('status', f.value);
          if (q) params.set('q', q);
          const qs = params.toString();
          return (
            <Link
              key={f.label}
              href={qs ? `/admin/shop-orders?${qs}` : '/admin/shop-orders'}
              className={
                'rounded-[2px] border px-3 py-1.5 text-[12px] font-semibold transition-colors ' +
                (active
                  ? 'border-ink bg-ink text-white'
                  : 'border-[#E3E3DF] bg-white text-[#6B6D74] hover:border-ink')
              }
            >
              {f.label}
            </Link>
          );
        })}
        <span className="ml-auto text-[13px] text-[#6B6D74]">
          Paid on this page: <strong className="text-ink">{money(paidTotal)}</strong>
        </span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Reference</Th>
            <Th>Customer</Th>
            <Th>Items</Th>
            <Th>Ships to</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th>Placed</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plain(orders).map((o) => {
            const ship = (o.shipTo ?? {}) as Record<string, string>;
            return (
              <tr key={o.id}>
                <Td className="whitespace-nowrap">
                  <Link href={`/admin/shop-orders/${o.id}`} className="font-semibold hover:underline">
                    {o.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block font-medium">{o.customerName}</span>
                  <span className="block text-[12px] text-[#8A8C93]">{o.email}</span>
                </Td>
                <Td className="text-[13px]">{o.items.reduce((n: number, i: { quantity: number }) => n + i.quantity, 0)}</Td>
                <Td className="text-[13px]">{[ship.city, ship.state].filter(Boolean).join(', ') || '—'}</Td>
                <Td className="whitespace-nowrap font-semibold">{money(Number(o.total))}</Td>
                <Td>
                  <Badge tone={TONE[o.status as keyof typeof TONE] ?? 'neutral'}>{o.status}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">{formatDateTime(o.createdAt)}</Td>
                <Td className="text-right">
                  <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[12px] font-semibold">
                    <Link href={`/admin/shop-orders/${o.id}`} className="text-ink hover:underline">
                      Open
                    </Link>
                    <DeleteRecord resource="shopOrders" id={o.id} name={`order ${o.reference}`} />
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {orders.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[#8A8C93]">
          No orders yet. They appear here as soon as someone checks out from the catalogue.
        </p>
      )}
    </AdminPage>
  );
}
