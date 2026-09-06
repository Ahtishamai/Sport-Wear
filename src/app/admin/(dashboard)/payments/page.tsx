import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime, money } from '@/lib/utils';
import { DeleteRecord } from '@/components/admin/DeleteRecord';
import { OrderStatusPicker } from '@/components/admin/OrderStatusPicker';
import { ResendReceipt } from '@/components/admin/ResendReceipt';

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
  { label: 'Started, not paid', value: 'PENDING' },
  { label: 'Refunded', value: 'REFUNDED' },
];

// A payment is either taken or it is not, so it never enters fulfilment.
const STATUSES = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];

/**
 * Payments made against invoices through /pay.
 *
 * PENDING rows are people who opened PayPal and did not finish — normal, and
 * worth seeing, because a run of them usually means something on the page is
 * wrong rather than that customers changed their minds.
 */
export default async function PaymentsIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const payments = await prisma.invoicePayment.findMany({
    where: {
      ...(status ? { status: status as 'PAID' } : {}),
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
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const rows = plain(payments);
  const takenCents = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0);

  return (
    <AdminPage
      title="Invoice payments"
      description="Payments customers made at /pay against an invoice you had already sent them."
    >
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <form className="flex gap-2" action="/admin/payments">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Reference, invoice, name or email"
            className="field !w-[280px] !py-2 text-[13px]"
          />
          <button type="submit" className="btn btn-ink !py-2 text-[13px]">
            Search
          </button>
        </form>

        <span className="flex flex-wrap gap-2 text-[12px] font-semibold">
          {FILTERS.map((f) => (
            <a
              key={f.value}
              href={`/admin/payments${f.value ? `?status=${f.value}` : ''}`}
              className={
                'rounded-[2px] border px-2.5 py-1.5 ' +
                ((status ?? '') === f.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-[#D6D6D1] bg-white text-[#6B6D74] hover:border-ink hover:text-ink')
              }
            >
              {f.label}
            </a>
          ))}
        </span>

        <span className="ml-auto text-[13px] text-[#6B6D74]">
          {rows.length} shown · <b className="text-ink">{money(takenCents / 100)}</b> taken
        </span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Reference</Th>
            <Th>Invoice</Th>
            <Th>Paid by</Th>
            <Th>Amount</Th>
            <Th>When</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((p: any) => (
            <tr key={p.id}>
              <Td>
                <span className="font-display font-bold">{p.reference}</span>
                {p.note && (
                  <span className="mt-1 block max-w-[280px] text-[12px] leading-relaxed text-[#8A8C93]">
                    {p.note}
                  </span>
                )}
              </Td>
              <Td className="font-semibold">{p.invoiceNumber}</Td>
              <Td className="text-[13px]">
                {p.customerName || '—'}
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    className="mt-0.5 block text-[12px] text-[#6B6D74] hover:underline"
                  >
                    {p.email}
                  </a>
                )}
                {p.phone && <span className="block text-[12px] text-[#8A8C93]">{p.phone}</span>}
              </Td>
              <Td className="whitespace-nowrap font-display font-bold">
                {money(Number(p.amount))}
                {p.currency !== 'USD' && (
                  <span className="ml-1 text-[12px] font-normal text-[#8A8C93]">{p.currency}</span>
                )}
              </Td>
              <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                {formatDateTime(p.paidAt ?? p.createdAt)}
              </Td>
              <Td>
                <Badge tone={TONE[p.status as keyof typeof TONE] ?? 'neutral'}>{p.status}</Badge>
              </Td>
              <Td className="text-right">
                <span className="flex items-center justify-end gap-3 whitespace-nowrap">
                  <OrderStatusPicker
                    id={p.id}
                    status={p.status}
                    resource="invoicePayments"
                    statuses={STATUSES}
                  />
                  {p.status === 'PAID' && <ResendReceipt paymentId={p.id} email={p.email} />}
                  <DeleteRecord
                    resource="invoicePayments"
                    id={p.id}
                    name={`payment ${p.reference}`}
                  />
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {rows.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[#8A8C93]">
          {q || status
            ? 'Nothing matches that.'
            : 'No invoice payments yet. Send a customer to /pay with their invoice number.'}
        </p>
      )}
    </AdminPage>
  );
}
