import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime, money } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TONE = {
  NEW: 'yellow',
  IN_PROGRESS: 'blue',
  QUOTED: 'blue',
  WON: 'green',
  LOST: 'red',
} as const;

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'NEW' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Quoted', value: 'QUOTED' },
  { label: 'Won', value: 'WON' },
  { label: 'Lost', value: 'LOST' },
];

export default async function QuotesIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const quotes = await prisma.quoteRequest.findMany({
    where: {
      ...(status ? { status: status as 'NEW' } : {}),
      ...(q
        ? {
            OR: [
              { team: { contains: q } },
              { name: { contains: q } },
              { email: { contains: q } },
              { reference: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <AdminPage
      title="Quote requests"
      description="Every request from the site — the drawer, product pages and package cards all land here."
      actions={
        <form className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search team, name, email, ref…"
            className="field !py-2 text-[13px]"
          />
        </form>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = (status ?? '') === f.value;
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/quotes?status=${f.value}` : '/admin/quotes'}
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
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Reference</Th>
            <Th>Team</Th>
            <Th>Subject</Th>
            <Th>Units</Th>
            <Th>Estimate</Th>
            <Th>Status</Th>
            <Th>Received</Th>
          </tr>
        </thead>
        <tbody>
          {plain(quotes).map((qr) => (
            <tr key={qr.id}>
              <Td className="whitespace-nowrap">
                <Link href={`/admin/quotes/${qr.id}`} className="font-semibold hover:underline">
                  {qr.reference}
                </Link>
              </Td>
              <Td>
                <span className="block font-medium">{qr.team}</span>
                <span className="block text-[12px] text-[#8A8C93]">
                  {qr.name} · {qr.email}
                </span>
              </Td>
              <Td className="max-w-[240px] truncate text-[13px]">{qr.subject}</Td>
              <Td className="text-[13px]">{qr.totalUnits ?? qr.rosterSize ?? '—'}</Td>
              <Td className="whitespace-nowrap text-[13px]">
                {qr.estTotal ? money(Number(qr.estTotal)) : '—'}
              </Td>
              <Td>
                <Badge tone={TONE[qr.status as keyof typeof TONE] ?? 'neutral'}>
                  {qr.status.replace('_', ' ')}
                </Badge>
              </Td>
              <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                {formatDateTime(qr.createdAt)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {quotes.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[#8A8C93]">No requests match that filter.</p>
      )}
    </AdminPage>
  );
}
