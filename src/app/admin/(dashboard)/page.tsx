import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Card, LinkButton, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime, money } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  NEW: 'yellow',
  IN_PROGRESS: 'blue',
  QUOTED: 'blue',
  WON: 'green',
  LOST: 'red',
} as const;

export default async function Dashboard() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [
    products,
    collections,
    pages,
    newQuotes,
    quotes30,
    newContacts,
    pipeline,
    recent,
    recentContacts,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.collection.count(),
    prisma.page.count(),
    prisma.quoteRequest.count({ where: { status: 'NEW' } }),
    prisma.quoteRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.quoteRequest.aggregate({
      where: { status: { in: ['NEW', 'IN_PROGRESS', 'QUOTED'] } },
      _sum: { estTotal: true },
    }),
    prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const stats = [
    { label: 'New quote requests', value: newQuotes, href: '/admin/quotes', accent: newQuotes > 0 },
    { label: 'Quotes — last 30 days', value: quotes30, href: '/admin/quotes' },
    {
      label: 'Open pipeline',
      value: money(Number(pipeline._sum.estTotal ?? 0)),
      href: '/admin/quotes',
    },
    { label: 'Unread messages', value: newContacts, href: '/admin/contacts', accent: newContacts > 0 },
  ];

  return (
    <AdminPage
      title="Dashboard"
      description="Leads first — everything else is one click away."
      actions={
        <>
          <LinkButton href="/admin/pages/home/edit" variant="yellow">
            Edit the home page
          </LinkButton>
          <LinkButton href="/admin/products/new">New product</LinkButton>
        </>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="border border-[#E3E3DF] bg-white p-5 transition-colors hover:border-ink"
            style={s.accent ? { background: '#FFF6CC', borderColor: '#FFE066' } : undefined}
          >
            <div className="font-display text-[30px] font-black leading-none">{s.value}</div>
            <div className="mt-2 text-[12px] font-semibold uppercase tracking-[.1em] text-[#8A8C93]">
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card
          title="Latest quote requests"
          actions={
            <Link href="/admin/quotes" className="text-[12px] font-semibold hover:text-brand-text">
              View all →
            </Link>
          }
          className="!p-0"
        >
          {recent.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#8A8C93]">No requests yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Team</Th>
                  <Th>Subject</Th>
                  <Th>Estimate</Th>
                  <Th>Status</Th>
                  <Th>Received</Th>
                </tr>
              </thead>
              <tbody>
                {plain(recent).map((q) => (
                  <tr key={q.id}>
                    <Td>
                      <Link href={`/admin/quotes/${q.id}`} className="font-semibold hover:underline">
                        {q.team}
                      </Link>
                      <span className="block text-[12px] text-[#8A8C93]">{q.name}</span>
                    </Td>
                    <Td className="max-w-[220px] truncate text-[13px]">{q.subject}</Td>
                    <Td className="whitespace-nowrap text-[13px]">
                      {q.estTotal ? money(Number(q.estTotal)) : '—'}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[q.status as keyof typeof STATUS_TONE] ?? 'neutral'}>
                        {q.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                      {formatDateTime(q.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Catalog">
            <ul className="space-y-2.5 text-[14px]">
              <li className="flex justify-between">
                <Link href="/admin/products" className="hover:underline">
                  Products
                </Link>
                <span className="font-semibold">{products}</span>
              </li>
              <li className="flex justify-between">
                <Link href="/admin/collections" className="hover:underline">
                  Collections
                </Link>
                <span className="font-semibold">{collections}</span>
              </li>
              <li className="flex justify-between">
                <Link href="/admin/pages" className="hover:underline">
                  Pages
                </Link>
                <span className="font-semibold">{pages}</span>
              </li>
            </ul>
          </Card>

          <Card title="Recent messages">
            {recentContacts.length === 0 ? (
              <p className="text-[13px] text-[#8A8C93]">Nothing yet.</p>
            ) : (
              <ul className="space-y-3">
                {plain(recentContacts).map((c) => (
                  <li key={c.id} className="border-b border-[#EFEFEC] pb-3 last:border-0 last:pb-0">
                    <Link href="/admin/contacts" className="block">
                      <span className="block text-[13px] font-semibold">{c.name}</span>
                      <span className="block truncate text-[12px] text-[#8A8C93]">
                        {c.subject || c.message}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
