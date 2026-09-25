import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime, money, storeTimeToDate } from '@/lib/utils';
import { DeleteRecord } from '@/components/admin/DeleteRecord';
import { StoreOrderFilters } from '@/components/admin/StoreOrderFilters';

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

const SORTS: Record<string, Prisma.StoreOrderOrderByWithRelationInput> = {
  oldest: { createdAt: 'asc' },
  highest: { total: 'desc' },
  lowest: { total: 'asc' },
  customer: { customerName: 'asc' },
};

export default async function StoreOrdersIndex({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    store?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
}) {
  const { status, q, store, from, to, sort } = await searchParams;

  // A date picked here means that whole day in US Eastern, the timezone the
  // stores and their deadlines already run on.
  const after = from ? storeTimeToDate(`${from}T00:00`) : null;
  const until = to ? storeTimeToDate(`${to}T23:59`) : null;

  const where: Prisma.StoreOrderWhereInput = {
    ...(status ? { status: status as 'PAID' } : {}),
    ...(store ? { store: { slug: store } } : {}),
    ...(after || until
      ? { createdAt: { ...(after ? { gte: after } : {}), ...(until ? { lte: until } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q } },
            { invoiceNumber: { contains: q } },
            { customerName: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };

  const [orders, matching, storeOptions] = await Promise.all([
    prisma.storeOrder.findMany({
      where,
      orderBy: SORTS[sort ?? ''] ?? { createdAt: 'desc' },
      include: { store: { select: { name: true } }, _count: { select: { items: true } } },
      take: 200,
    }),
    prisma.storeOrder.count({ where }),
    // Only stores that have ever taken an order; the rest would filter to nothing.
    prisma.teamStore.findMany({
      where: { orders: { some: {} } },
      select: { slug: true, name: true, _count: { select: { orders: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const paidTotal = orders
    .filter((o) => o.status === 'PAID' || o.status === 'FULFILLED')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <AdminPage
      title="Store orders"
      description="Orders paid through a team store checkout. Quote requests stay on their own page."
    >
      <StoreOrderFilters
        stores={storeOptions.map((s) => ({ slug: s.slug, name: s.name, orders: s._count.orders }))}
        total={matching}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const active = (status ?? '') === f.value;
          // Changing the status keeps whatever else is being filtered on.
          const params = new URLSearchParams();
          if (f.value) params.set('status', f.value);
          for (const [k, v] of Object.entries({ store, from, to, sort, q })) if (v) params.set(k, v);
          const qs = params.toString();
          return (
            <Link
              key={f.label}
              href={qs ? `/admin/store-orders?${qs}` : '/admin/store-orders'}
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
          {matching > orders.length && (
            <span className="ml-2 text-[#8A8C93]">
              (showing the first {orders.length} of {matching} — narrow the filters to see the rest)
            </span>
          )}
        </span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Reference</Th>
            <Th>Store</Th>
            <Th>Customer</Th>
            <Th>Invoice #</Th>
            <Th>Items</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th>Placed</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plain(orders).map((o) => (
            <tr key={o.id}>
              <Td className="whitespace-nowrap">
                <Link href={`/admin/store-orders/${o.id}`} className="font-semibold hover:underline">
                  {o.reference}
                </Link>
              </Td>
              <Td className="text-[13px]">{o.store.name}</Td>
              <Td>
                <span className="block font-medium">{o.customerName}</span>
                <span className="block text-[12px] text-[#8A8C93]">{o.email}</span>
              </Td>
              <Td className="whitespace-nowrap text-[13px]">
                {o.invoiceNumber ? <code>{o.invoiceNumber}</code> : '—'}
              </Td>
              <Td className="text-[13px]">{o._count.items}</Td>
              <Td className="whitespace-nowrap font-semibold">{money(Number(o.total))}</Td>
              <Td>
                <Badge tone={TONE[o.status as keyof typeof TONE] ?? 'neutral'}>{o.status}</Badge>
              </Td>
              <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                {formatDateTime(o.createdAt)}
              </Td>
              <Td className="text-right">
                <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[12px] font-semibold">
                  <Link href={`/admin/store-orders/${o.id}`} className="text-ink hover:underline">
                    Open
                  </Link>
                  <DeleteRecord
                    resource="storeOrders"
                    id={o.id}
                    name={`order ${o.reference}`}
                  />
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {orders.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[#8A8C93]">No orders match that filter.</p>
      )}
    </AdminPage>
  );
}
