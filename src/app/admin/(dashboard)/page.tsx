import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Card, LinkButton, Table, Td, Th } from '@/components/admin/ui';
import { money } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import {
  bars,
  createdBetween,
  isPaid,
  isPlaceholderSocial,
  pending,
  searchGaps,
  takings,
  trend,
  windowStart,
  type Bar,
  type DatedAmount,
  type Todo,
} from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  NEW: 'yellow',
  IN_PROGRESS: 'blue',
  QUOTED: 'blue',
  WON: 'green',
  LOST: 'red',
} as const;

const ORDER_TONE = {
  PENDING: 'yellow',
  PAID: 'green',
  FULFILLED: 'green',
  CANCELLED: 'neutral',
  REFUNDED: 'red',
} as const;

/** How far back the chart and the comparison reach. */
const WINDOW = 30;

export default async function Dashboard() {
  const now = new Date();
  const from = windowStart(WINDOW, now);
  const before = windowStart(WINDOW * 2, now);

  const [
    leads,
    newQuotes,
    pipeline,
    recent,
    newContacts,
    recentContacts,
    storeOrders,
    shopOrders,
    invoices,
    storeByStatus,
    shopByStatus,
    invoiceByStatus,
    stores,
    storeTakings,
    products,
    collections,
    pages,
    reviews,
    deadEnds,
    bestSellers,
    settings,
  ] = await Promise.all([
    // Leads over both windows, so this month can be put next to last month.
    prisma.quoteRequest.findMany({
      where: { createdAt: { gte: before } },
      select: { createdAt: true },
    }),
    prisma.quoteRequest.count({ where: { status: 'NEW' } }),
    prisma.quoteRequest.aggregate({
      where: { status: { in: ['NEW', 'IN_PROGRESS', 'QUOTED'] } },
      _sum: { estTotal: true },
    }),
    prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    /*
     * Orders as rows rather than as counts.
     *
     * Sixty days of them is a small read, and it answers four questions at
     * once — what came in, what it came to, how it compares with the month
     * before, and which day each order landed on. Four aggregate queries
     * would answer fewer, on a connection pool two wide.
     */
    prisma.storeOrder.findMany({
      where: { createdAt: { gte: before } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        customerName: true,
        createdAt: true,
        paidAt: true,
        total: true,
        status: true,
        store: { select: { name: true, slug: true } },
      },
    }),
    prisma.shopOrder.findMany({
      where: { createdAt: { gte: before } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        customerName: true,
        createdAt: true,
        paidAt: true,
        total: true,
        status: true,
      },
    }),
    prisma.invoicePayment.findMany({
      where: { createdAt: { gte: before } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        customerName: true,
        invoiceNumber: true,
        createdAt: true,
        paidAt: true,
        amount: true,
        status: true,
      },
    }),
    // Lifetime, by status: what is still owed and what was never fulfilled
    // predates any window.
    prisma.storeOrder.groupBy({ by: ['status'], _count: { _all: true }, _sum: { total: true } }),
    prisma.shopOrder.groupBy({ by: ['status'], _count: { _all: true }, _sum: { total: true } }),
    prisma.invoicePayment.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.teamStore.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        closesAt: true,
        _count: { select: { orders: true, items: true } },
      },
    }),
    prisma.storeOrder.groupBy({
      by: ['storeId'],
      where: { status: { in: ['PAID', 'FULFILLED'] } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    // Seventy rows of five small fields: cheaper than six counting queries,
    // and it answers the catalogue count as well.
    prisma.product.findMany({
      select: {
        sku: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        specs: true,
        _count: { select: { images: true } },
      },
    }),
    prisma.collection.findMany({
      select: {
        seoTitle: true,
        seoDescription: true,
        status: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.page.count(),
    prisma.review.groupBy({ by: ['published'], _count: { _all: true } }),
    prisma.notFoundHit.count({ where: { ignored: false } }),
    // What actually sells, which is team-store items rather than catalogue
    // products: the catalogue is quoted, the stores are bought.
    prisma.storeOrderItem.groupBy({
      by: ['itemName'],
      where: { order: { status: { in: ['PAID', 'FULFILLED'] } } },
      _count: { _all: true },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 6,
    }),
    getSettings(),
  ]);

  // ---------------------------------------------------------------- money

  /** Every way money arrives, on one footing. */
  const paidRows: DatedAmount[] = [
    ...storeOrders.map((o) => ({
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      amount: Number(o.total),
      status: o.status,
    })),
    ...shopOrders.map((o) => ({
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      amount: Number(o.total),
      status: o.status,
    })),
    ...invoices.map((p) => ({
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      amount: Number(p.amount),
      status: p.status,
    })),
  ];

  const took = takings(paidRows, from);
  const tookBefore = takings(paidRows, before, from);
  const moneyTrend = trend(took.total, tookBefore.total);

  const leadsNow = createdBetween(leads, from).length;
  const leadsBefore = createdBetween(leads, before, from).length;
  const leadTrend = trend(leadsNow, leadsBefore);

  const series = bars(WINDOW, now, leads, paidRows);

  /** Lifetime, across all three tables. */
  const byStatus = [
    ...storeByStatus.map((r) => ({ status: r.status, count: r._count._all, sum: Number(r._sum.total ?? 0) })),
    ...shopByStatus.map((r) => ({ status: r.status, count: r._count._all, sum: Number(r._sum.total ?? 0) })),
    ...invoiceByStatus.map((r) => ({ status: r.status, count: r._count._all, sum: Number(r._sum.amount ?? 0) })),
  ];
  const countWhere = (match: (s: string) => boolean) =>
    byStatus.filter((r) => match(r.status)).reduce((a, r) => a + r.count, 0);
  const sumWhere = (match: (s: string) => boolean) =>
    byStatus.filter((r) => match(r.status)).reduce((a, r) => a + r.sum, 0);

  const unpaid = countWhere((s) => s === 'PENDING');
  const unpaidValue = sumWhere((s) => s === 'PENDING');
  const unfulfilled = countWhere((s) => s === 'PAID');
  const lifetime = sumWhere(isPaid);
  const lifetimeOrders = countWhere(isPaid);

  // ------------------------------------------------------------- the lists

  const hiddenReviews = reviews.find((r) => r.published === false)?._count._all ?? 0;
  const liveReviews = reviews.find((r) => r.published === true)?._count._all ?? 0;

  const emptyShelves = collections.filter(
    (c) => c.status === 'PUBLISHED' && c._count.products === 0
  ).length;
  const draftProducts = products.filter((p) => p.status === 'DRAFT').length;

  const todo: Todo[] = pending([
    {
      label: 'Quote requests not yet answered',
      count: newQuotes,
      href: '/admin/quotes',
      hint: 'Every one is a team waiting on a price',
      urgent: true,
    },
    {
      label: 'Messages unread',
      count: newContacts,
      href: '/admin/contacts',
      hint: 'From the contact form',
      urgent: true,
    },
    {
      label: 'Orders paid but not marked fulfilled',
      count: unfulfilled,
      href: '/admin/store-orders',
      hint: 'Mark them off as they ship and this list empties',
    },
    {
      label: 'Checkouts started and never paid',
      count: unpaid,
      href: '/admin/store-orders',
      hint: `${money(unpaidValue)} left in unfinished baskets`,
    },
    {
      label: 'Reviews waiting to be published',
      count: hiddenReviews,
      href: '/admin/reviews',
      hint: 'Hidden reviews count towards no rating',
    },
    {
      label: 'Dead ends with no redirect',
      count: deadEnds,
      href: '/admin/not-found',
      hint: 'Addresses visitors asked for and did not get',
    },
    {
      label: 'Published collections holding nothing',
      count: emptyShelves,
      href: '/admin/collections',
      hint: 'Asked not to be indexed until a product is filed there',
    },
    {
      label: 'Products still in draft',
      count: draftProducts,
      href: '/admin/products',
      hint: 'Not on the site yet',
    },
  ]);

  const gaps = searchGaps(
    products.map((p) => ({
      sku: p.sku,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      status: p.status,
      specs: p.specs,
      images: p._count.images,
    })),
    collections.map((c) => ({
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      status: c.status,
      products: c._count.products,
    })),
    (settings.social ?? []).filter((s) => isPlaceholderSocial(s.href)).length
  );

  /** The newest orders of either kind, together. */
  const latestOrders = [
    ...storeOrders.map((o) => ({
      key: `store-${o.id}`,
      href: `/admin/store-orders/${o.id}`,
      reference: o.reference,
      who: o.customerName,
      where: o.store?.name ?? 'Team store',
      total: Number(o.total),
      status: o.status as string,
      at: o.createdAt,
    })),
    ...shopOrders.map((o) => ({
      key: `shop-${o.id}`,
      href: `/admin/shop-orders/${o.id}`,
      reference: o.reference,
      who: o.customerName,
      where: 'Catalogue',
      total: Number(o.total),
      status: o.status as string,
      at: o.createdAt,
    })),
    ...invoices.map((p) => ({
      key: `invoice-${p.id}`,
      href: '/admin/payments',
      reference: p.reference,
      who: p.customerName || p.invoiceNumber,
      where: `Invoice ${p.invoiceNumber}`,
      total: Number(p.amount),
      status: p.status as string,
      at: p.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  const revenueByStore = new Map(
    storeTakings.map((r) => [r.storeId, { total: Number(r._sum.total ?? 0), orders: r._count._all }])
  );
  const storeRows = stores
    .map((s) => ({
      ...s,
      takings: revenueByStore.get(s.id) ?? { total: 0, orders: 0 },
    }))
    .sort((a, b) => b.takings.total - a.takings.total);

  /** Every quote so far has been logged without one; no point in a column of dashes. */
  const showEstimates = recent.some((q) => q.estTotal != null && Number(q.estTotal) > 0);

  const leadTiles = [
    {
      label: 'Quotes to answer',
      value: newQuotes,
      href: '/admin/quotes',
      accent: newQuotes > 0,
      note: newQuotes > 0 ? 'oldest first — none have been opened' : 'all caught up',
    },
    {
      label: `Quotes — last ${WINDOW} days`,
      value: leadsNow,
      href: '/admin/quotes',
      note: comparison(leadTrend.pct, leadsBefore, 'before'),
    },
    {
      label: 'Open pipeline',
      value: money(Number(pipeline._sum.estTotal ?? 0)),
      href: '/admin/quotes',
      note: 'estimates on quotes not yet won or lost',
    },
    {
      label: 'Messages unread',
      value: newContacts,
      href: '/admin/contacts',
      accent: newContacts > 0,
      note: newContacts > 0 ? 'from the contact form' : 'nothing waiting',
    },
  ];

  const moneyTiles = [
    {
      label: `Taken — last ${WINDOW} days`,
      value: money(took.total),
      href: '/admin/store-orders',
      note: comparison(moneyTrend.pct, tookBefore.total, 'before', true),
    },
    {
      label: `Orders paid — last ${WINDOW} days`,
      value: took.count,
      href: '/admin/store-orders',
      note: took.count ? `${money(took.count ? took.total / took.count : 0)} average` : 'none yet',
    },
    {
      label: 'Taken all time',
      value: money(lifetime),
      href: '/admin/store-orders',
      note: `${lifetimeOrders} paid orders`,
    },
    {
      label: 'Unfinished baskets',
      value: unpaid,
      href: '/admin/store-orders',
      accent: unpaid > 0,
      note: unpaid > 0 ? `${money(unpaidValue)} started and not paid` : 'none pending',
    },
  ];

  return (
    <AdminPage
      width="wide"
      title="Dashboard"
      description="Leads and money first. Everything waiting on you is in one list, and everything else is one click away."
      actions={
        <>
          <LinkButton href="/admin/pages/home/edit" variant="yellow">
            Edit the home page
          </LinkButton>
          <LinkButton href="/admin/products/new">New product</LinkButton>
        </>
      }
    >
      <Stats tiles={leadTiles} />
      <Stats tiles={moneyTiles} />

      <Card
        title={`The last ${WINDOW} days`}
        description={`${leadsNow} quote ${leadsNow === 1 ? 'request' : 'requests'} and ${took.count} paid ${took.count === 1 ? 'order' : 'orders'} worth ${money(took.total)}.`}
        className="mb-5"
        actions={
          <div className="flex items-center gap-4 text-[12px] font-semibold text-[#6B6D74]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-ink" /> Quote requests
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-brand" /> Paid orders
            </span>
          </div>
        }
      >
        <Chart series={series} />
      </Card>

      {/*
        min-w-0 on both columns, or the page scrolls sideways on a phone.
        A grid child is min-width:auto by default, so the 640px-wide tables
        inside set the column's width and the whole admin overflows instead
        of the table scrolling within its own card.
      */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] 2xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-5">
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
                    {showEstimates && <Th>Estimate</Th>}
                    <Th>Status</Th>
                    <Th>Received</Th>
                  </tr>
                </thead>
                <tbody>
                  {plain(recent).map((q) => (
                    <tr key={q.id}>
                      <Td className="min-w-[200px]">
                        <Link href={`/admin/quotes/${q.id}`} className="font-semibold hover:underline">
                          {q.team}
                        </Link>
                        <span className="block text-[12px] text-[#8A8C93]">{q.name}</span>
                      </Td>
                      <Td className="max-w-[320px] truncate text-[13px]">{q.subject}</Td>
                      {showEstimates && (
                        <Td className="whitespace-nowrap text-[13px]">
                          {q.estTotal ? money(Number(q.estTotal)) : '—'}
                        </Td>
                      )}
                      <Td>
                        <Badge tone={STATUS_TONE[q.status as keyof typeof STATUS_TONE] ?? 'neutral'}>
                          {q.status.replace('_', ' ')}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                        {when(q.createdAt, now)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card
            title="Latest orders"
            description={`Team stores, the catalogue and invoice payments, newest first — the last ${WINDOW * 2} days.`}
            actions={
              <Link
                href="/admin/store-orders"
                className="text-[12px] font-semibold hover:text-brand-text"
              >
                All orders →
              </Link>
            }
            className="!p-0"
          >
            {latestOrders.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[#8A8C93]">
                No orders in the last {WINDOW * 2} days.
              </p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Where from</Th>
                    <Th>Total</Th>
                    <Th>Status</Th>
                    <Th>Placed</Th>
                  </tr>
                </thead>
                <tbody>
                  {latestOrders.map((o) => (
                    <tr key={o.key}>
                      <Td>
                        <Link href={o.href} className="font-semibold hover:underline">
                          {o.reference}
                        </Link>
                        <span className="block text-[12px] text-[#8A8C93]">{o.who}</span>
                      </Td>
                      <Td className="max-w-[220px] truncate text-[13px]">{o.where}</Td>
                      <Td className="whitespace-nowrap text-[13px] font-semibold">
                        {money(o.total)}
                      </Td>
                      <Td>
                        <Badge tone={ORDER_TONE[o.status as keyof typeof ORDER_TONE] ?? 'neutral'}>
                          {o.status}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                        {when(o.at, now)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card
            title="Best sellers"
            description="Every paid team-store order, by what the item has brought in."
            className="!p-0"
          >
            {bestSellers.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[#8A8C93]">Nothing sold yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Item</Th>
                    <Th>Units</Th>
                    <Th>Orders</Th>
                    <Th>Brought in</Th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((b) => (
                    <tr key={b.itemName}>
                      <Td className="max-w-[320px] truncate text-[13px] font-semibold">
                        {b.itemName}
                      </Td>
                      <Td className="text-[13px]">{b._sum.quantity ?? 0}</Td>
                      <Td className="text-[13px]">{b._count._all}</Td>
                      <Td className="whitespace-nowrap text-[13px] font-semibold">
                        {money(Number(b._sum.lineTotal ?? 0))}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title="Waiting on you">
            {todo.length === 0 ? (
              <p className="text-[13px] text-[#6B6D74]">
                Nothing waiting. Every lead answered, every order marked off.
              </p>
            ) : (
              <TodoList items={todo} />
            )}
          </Card>

          <Card
            title="Team stores"
            description="Where the money comes from."
            actions={
              <Link href="/admin/stores" className="text-[12px] font-semibold hover:text-brand-text">
                All →
              </Link>
            }
          >
            {storeRows.length === 0 ? (
              <p className="text-[13px] text-[#8A8C93]">No stores yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {storeRows.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/admin/stores/${s.slug}`}
                      className="min-w-0 flex-1 truncate text-[14px] font-semibold hover:underline"
                    >
                      {s.name.trim() || s.slug}
                      <span className="ml-2 text-[12px] font-medium text-[#8A8C93]">
                        {s.status === 'OPEN' ? 'open' : s.status.toLowerCase()} ·{' '}
                        {s._count.items} {s._count.items === 1 ? 'item' : 'items'}
                      </span>
                    </Link>
                    <span className="whitespace-nowrap text-[13px] font-semibold">
                      {money(s.takings.total)}
                      <span className="ml-1.5 text-[12px] font-medium text-[#8A8C93]">
                        {s.takings.orders}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Search appearance"
            description="Written by you beats written by the site. Nothing here is broken — the page fills in whatever is blank."
          >
            {gaps.length === 0 ? (
              <p className="text-[13px] text-[#6B6D74]">
                Every product and collection has its own title, sentence and identifier.
              </p>
            ) : (
              <TodoList items={gaps} />
            )}
          </Card>

          <Card title="Catalog">
            <ul className="space-y-2.5 text-[14px]">
              <Count href="/admin/products" label="Products" value={products.length} />
              <Count href="/admin/collections" label="Collections" value={collections.length} />
              <Count href="/admin/pages" label="Pages" value={pages} />
              <Count href="/admin/stores" label="Team stores" value={stores.length} />
              <Count href="/admin/reviews" label="Reviews published" value={liveReviews} />
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

// ------------------------------------------------------------------ pieces

type Tile = {
  label: string;
  value: string | number;
  href: string;
  accent?: boolean;
  note?: string;
};

function Stats({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((s) => (
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
          {s.note && <div className="mt-1.5 text-[12px] text-[#6B6D74]">{s.note}</div>}
        </Link>
      ))}
    </div>
  );
}

function Count({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <li className="flex justify-between">
      <Link href={href} className="hover:underline">
        {label}
      </Link>
      <span className="font-semibold">{value}</span>
    </li>
  );
}

function TodoList({ items }: { items: Todo[] }) {
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label} className="border-b border-[#EFEFEC] pb-3 last:border-0 last:pb-0">
          <Link href={i.href} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold hover:underline">{i.label}</span>
              <span className="block text-[12px] text-[#8A8C93]">{i.hint}</span>
            </span>
            <span
              className="shrink-0 px-2 py-0.5 font-display text-[14px] font-black"
              style={
                i.urgent
                  ? { background: '#FFF6CC', border: '1px solid #FFE066' }
                  : { background: '#F4F4F1' }
              }
            >
              {i.count}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Thirty days, two bars a day.
 *
 * Deliberately not a charting library: this is two numbers a day for a month,
 * and the admin should not pull three hundred kilobytes of JavaScript to draw
 * sixty rectangles. The height is scaled to the busiest day, and an empty day
 * keeps a one-pixel tick so the row reads as a calendar rather than a gap.
 */
function Chart({ series }: { series: Bar[] }) {
  const peak = Math.max(1, ...series.map((b) => Math.max(b.leads, b.orders)));
  /** A day with one of something still has to be visible. */
  const height = (n: number) => (n === 0 ? '0' : `max(5px, ${(n / peak) * 100}%)`);

  return (
    <div>
      <div className="flex h-[132px] items-end gap-[3px] border-b border-[#E3E3DF]">
        {series.map((b) => (
          <div
            key={b.day}
            className="group flex h-full flex-1 items-end justify-center gap-[2px]"
            title={`${b.label} — ${b.leads} ${b.leads === 1 ? 'request' : 'requests'}, ${b.orders} paid${b.taken ? ` (${money(b.taken)})` : ''}`}
          >
            <span className="w-full bg-ink" style={{ height: height(b.leads) }} />
            <span className="w-full bg-brand" style={{ height: height(b.orders) }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-[#8A8C93]">
        <span>{series[0]?.label}</span>
        <span>busiest day: {peak}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}


// ------------------------------------------------------------------ helpers

/**
 * "Nov 5, 12:52 AM" — with the year only when it is not this one.
 *
 * The long form ran to "Nov 5, 2026, 12:52 AM", which on a laptop pushed the
 * last column of every table off the edge of its card. Nobody reading a
 * dashboard needs telling which year this week is in.
 */
function when(value: Date | string, now: Date): string {
  // plain() is typed as returning what it was given, but it round-trips
  // through JSON — so a field the type calls a Date arrives here as a
  // string. Both have to work.
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' as const }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * "up 40% on 15 before" — or just the figure, when there is nothing to
 * compare against. A percentage of nothing is not a fact.
 */
function comparison(pct: number | null, previous: number, word: string, asMoney = false): string {
  const was = asMoney ? money(previous) : String(previous);
  if (pct === null) return previous === 0 ? `none in the ${WINDOW} days ${word}` : `${was} ${word}`;
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'level with';
  if (pct === 0) return `level with the ${WINDOW} days ${word} (${was})`;
  return `${direction} ${Math.abs(pct)}% on ${was} ${word}`;
}
