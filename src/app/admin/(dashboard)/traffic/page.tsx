import Link from 'next/link';
import { AdminPage, Card, Table, Td, Th } from '@/components/admin/ui';
import { LiveVisitors } from '@/components/admin/LiveVisitors';
import { readTraffic } from '@/lib/traffic-read';
import { CHANNEL_LABEL, type Channel } from '@/lib/traffic';
import { PERIOD_LABEL, type Period, type Report } from '@/lib/traffic-report';

export const dynamic = 'force-dynamic';

const PERIODS: Period[] = ['today', 'yesterday', 'last7', 'last30'];

/** A tint per channel, so the same colour means the same thing everywhere. */
const CHANNEL_COLOR: Record<Channel, string> = {
  organic: '#1F7A4D',
  ai: '#7A3FD4',
  ads: '#C2410C',
  social: '#1D5FD1',
  referral: '#8A7300',
  search: '#0E7490',
  direct: '#6B6D74',
};

export default async function TrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period = PERIODS.includes(sp.period as Period) ? (sp.period as Period) : 'last7';

  let data;
  try {
    data = await readTraffic();
  } catch (err) {
    return (
      <AdminPage title="Traffic" description="Where visitors come from, counted by the shop itself.">
        <Card title="Not reading yet">
          <p className="text-[14px] text-[#6B6D74]">
            The visits table could not be read. If the site has just been updated, the table may
            not exist yet: run <code className="bg-[#F4F4F1] px-1.5 py-0.5">npm run db:push</code>{' '}
            on the server once and this screen will fill itself in.
          </p>
          <p className="mt-3 text-[12px] text-[#8A8C93]">{String(err).slice(0, 200)}</p>
        </Card>
      </AdminPage>
    );
  }

  const chosen = data.periods[period];
  const people = data.visitors[period];

  return (
    <AdminPage
      width="wide"
      title="Traffic"
      description="Counted by the shop itself, so a visit from ChatGPT or Claude is reported as one, rather than filed among every other site on the internet."
      actions={
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/traffic?period=${p}`}
              className={
                p === period
                  ? 'border border-ink bg-ink px-3 py-2 text-[12px] font-semibold text-white'
                  : 'border border-[#E3E3DF] bg-white px-3 py-2 text-[12px] font-semibold hover:border-ink'
              }
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </div>
      }
    >
      <Card className="mb-5" title="Right now">
        <LiveVisitors initial={data.live} />
        {data.live.pages.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-[#EFEFEC] pt-3">
            {data.live.pages.map((p) => (
              <li key={p.path} className="flex justify-between gap-4 text-[13px]">
                <span className="min-w-0 flex-1 truncate">{p.path}</span>
                <span className="font-semibold">{p.visitors}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data.empty ? (
        <Card title="Nothing recorded yet">
          <p className="max-w-[640px] text-[14px] text-[#6B6D74]">
            Counting starts the moment this version of the site is live. Nothing was tracked before
            it, so this screen fills up from today forward rather than showing a history that was
            never collected. Open the shop in another browser and the first visit will appear here
            within a minute.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PERIODS.map((p) => {
              const r = data.periods[p];
              const v = data.visitors[p];
              return (
                <Link
                  key={p}
                  href={`/admin/traffic?period=${p}`}
                  className={
                    p === period
                      ? 'border border-ink bg-white p-5'
                      : 'border border-[#E3E3DF] bg-white p-5 transition-colors hover:border-ink'
                  }
                >
                  <div className="font-display text-[30px] font-black leading-none">{v.now}</div>
                  <div className="mt-2 text-[12px] font-semibold uppercase tracking-[.1em] text-[#8A8C93]">
                    Visitors — {PERIOD_LABEL[p].toLowerCase()}
                  </div>
                  <div className="mt-1.5 text-[12px] text-[#6B6D74]">
                    {r.totals.sessions} {r.totals.sessions === 1 ? 'visit' : 'visits'},{' '}
                    {r.totals.views} {r.totals.views === 1 ? 'page' : 'pages'}
                  </div>
                  <div className="mt-1 text-[12px] text-[#6B6D74]">{compare(v.now, v.before)}</div>
                </Link>
              );
            })}
          </div>

          <Card
            className="mb-5"
            title={`${chosen.label} by day`}
            description={`${people.now} ${people.now === 1 ? 'visitor' : 'visitors'}, ${chosen.totals.sessions} ${chosen.totals.sessions === 1 ? 'visit' : 'visits'}, ${chosen.totals.views} pages. ${compare(chosen.totals.sessions, chosen.previous.sessions, 'visits')}`}
          >
            <Bars report={chosen} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="min-w-0 space-y-5">
              <Card
                title="Where they came from"
                description="Visits, and the change against the same length of time before it."
                className="!p-0"
              >
                <Table>
                  <thead>
                    <tr>
                      <Th>Channel</Th>
                      <Th>Visits</Th>
                      <Th>Pages</Th>
                      <Th>Share</Th>
                      <Th>Change</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {chosen.channels.map((c) => (
                      <tr key={c.channel}>
                        <Td>
                          <span className="flex items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className="inline-block h-2.5 w-2.5 shrink-0"
                              style={{ background: CHANNEL_COLOR[c.channel] }}
                            />
                            <span className="font-semibold">{CHANNEL_LABEL[c.channel]}</span>
                          </span>
                        </Td>
                        <Td className="text-[13px] font-semibold">{c.sessions}</Td>
                        <Td className="text-[13px]">{c.views}</Td>
                        <Td className="text-[13px]">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-[70px] bg-[#EFEFEC]">
                              <span
                                className="block h-full"
                                style={{
                                  width: `${c.share}%`,
                                  background: CHANNEL_COLOR[c.channel],
                                }}
                              />
                            </span>
                            {c.share}%
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-[13px]">{delta(c.change)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>

              <Card title="Top sources" className="!p-0">
                {chosen.sources.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-[#8A8C93]">
                    Nothing in this period.
                  </p>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Source</Th>
                        <Th>Channel</Th>
                        <Th>Visits</Th>
                        <Th>Pages</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {chosen.sources.map((s) => (
                        <tr key={`${s.channel}-${s.source}`}>
                          <Td className="font-semibold">{s.source}</Td>
                          <Td className="text-[13px] text-[#6B6D74]">{CHANNEL_LABEL[s.channel]}</Td>
                          <Td className="text-[13px] font-semibold">{s.sessions}</Td>
                          <Td className="text-[13px]">{s.views}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>

              <Card title="Most read pages" description="Across the last 30 days." className="!p-0">
                {data.pages.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-[#8A8C93]">Nothing yet.</p>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Page</Th>
                        <Th>Views</Th>
                        <Th>Visits</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pages.map((p) => (
                        <tr key={p.path}>
                          <Td className="max-w-[420px] truncate text-[13px]">
                            <Link href={p.path} target="_blank" className="hover:underline">
                              {p.path}
                            </Link>
                          </Td>
                          <Td className="text-[13px] font-semibold">{p.views}</Td>
                          <Td className="text-[13px]">{p.sessions}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </div>

            <div className="min-w-0 space-y-5">
              <Card title="Paid against unpaid">
                <dl className="space-y-3 text-[14px]">
                  <Split
                    label="Unpaid search"
                    hint="Google and the other engines"
                    value={chosen.organic.sessions}
                    total={chosen.totals.sessions}
                    color={CHANNEL_COLOR.organic}
                  />
                  <Split
                    label="Paid search"
                    hint="Google Ads and Microsoft Ads"
                    value={chosen.paid.sessions}
                    total={chosen.totals.sessions}
                    color={CHANNEL_COLOR.ads}
                  />
                  <Split
                    label="AI assistants"
                    hint="ChatGPT, Claude, Perplexity and the rest"
                    value={chosen.ai.sessions}
                    total={chosen.totals.sessions}
                    color={CHANNEL_COLOR.ai}
                  />
                </dl>
              </Card>

              <Card
                title="AI assistants"
                description="Visits from people following a link inside an answer."
              >
                <AiBreakdown report={chosen} />
              </Card>

              <Card
                title="AI crawlers"
                description="Robots reading the shop over the last 30 days. Not visitors, and never counted as any — but this is how the pages get into an answer at all."
              >
                {data.crawlers.length === 0 ? (
                  <p className="text-[13px] text-[#8A8C93]">
                    None have been through yet. They find a site in their own time.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.crawlers.map((c) => (
                      <li key={c.crawler} className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-semibold">{c.crawler}</span>
                        <span className="text-[13px] text-[#6B6D74]">
                          {c.hits} {c.hits === 1 ? 'page' : 'pages'} · last{' '}
                          {c.last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="How this is counted">
                <ul className="space-y-2 text-[13px] leading-relaxed text-[#6B6D74]">
                  <li>
                    A visit is credited to whatever sent it. Click through from a ChatGPT answer and
                    read four pages, and that is one AI visit, not one AI visit and three direct.
                  </li>
                  <li>
                    A link carrying a Google Ads click id is counted as paid even when the referrer
                    says google.com, which is the case that otherwise makes ad spend look free.
                  </li>
                  <li>
                    Nobody is identified. Visitors are counted with a hash that changes at midnight,
                    no cookie is set, and your own browsing is never recorded.
                  </li>
                  <li>Robots are told apart from people and left out of every figure above.</li>
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </AdminPage>
  );
}

// ------------------------------------------------------------------ pieces

function Split({
  label,
  hint,
  value,
  total,
  color,
}: {
  label: string;
  hint: string;
  value: number;
  total: number;
  color: string;
}) {
  const share = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="font-semibold">{label}</dt>
        <dd className="whitespace-nowrap text-[13px]">
          <span className="font-semibold">{value}</span>
          <span className="ml-1.5 text-[#8A8C93]">{share}%</span>
        </dd>
      </div>
      <div className="mt-1 h-1.5 w-full bg-[#EFEFEC]">
        <div className="h-full" style={{ width: `${share}%`, background: color }} />
      </div>
      <p className="mt-1 text-[12px] text-[#8A8C93]">{hint}</p>
    </div>
  );
}

function AiBreakdown({ report }: { report: Report }) {
  const rows = report.sources.filter((s) => s.channel === 'ai');
  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-[#8A8C93]">
        No visits from an assistant in this period. The crawlers below have to read the shop before
        it can be quoted in an answer.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {rows.map((s) => (
        <li key={s.source} className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-semibold capitalize">{s.source}</span>
          <span className="text-[13px] text-[#6B6D74]">
            <span className="font-semibold text-ink">{s.sessions}</span>{' '}
            {s.sessions === 1 ? 'visit' : 'visits'} · {s.views} pages
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One bar a day. Not a charting library, for the same reason as the
 * dashboard: this is two numbers a day and sixty rectangles.
 */
function Bars({ report }: { report: Report }) {
  const peak = Math.max(1, ...report.daily.map((d) => d.views));
  const single = report.daily.length === 1;

  return (
    <div>
      <div className="flex h-[150px] items-end gap-[3px] border-b border-[#E3E3DF]">
        {report.daily.map((d) => (
          <div
            key={d.day}
            className={single ? 'flex h-full w-[90px] items-end' : 'flex h-full flex-1 items-end'}
            title={`${d.day} — ${d.views} ${d.views === 1 ? 'page' : 'pages'}, ${d.sessions} ${d.sessions === 1 ? 'visit' : 'visits'}`}
          >
            <span
              className="w-full bg-ink"
              style={{ height: d.views === 0 ? '0' : `max(5px, ${(d.views / peak) * 100}%)` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-[#8A8C93]">
        <span>{short(report.daily[0]?.day)}</span>
        <span>busiest day: {peak} {peak === 1 ? 'page' : 'pages'}</span>
        <span>{short(report.daily[report.daily.length - 1]?.day)}</span>
      </div>
    </div>
  );
}

const short = (day?: string) => (day ? day.slice(5).replace('-', '/') : '');

/** "up 40% on 15 before", or the plain figure when there is nothing to compare. */
function compare(now: number, before: number, noun = 'visitors'): string {
  if (!before) return before === 0 && now === 0 ? `no ${noun} before` : `${before} before`;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return `level with the ${before} before`;
  return `${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% on ${before} before`;
}

function delta(pct: number | null) {
  if (pct === null) return <span className="text-[#8A8C93]">—</span>;
  if (pct === 0) return <span className="text-[#6B6D74]">level</span>;
  return (
    <span className={pct > 0 ? 'font-semibold text-[#16803C]' : 'font-semibold text-[#B91C1C]'}>
      {pct > 0 ? '+' : ''}
      {pct}%
    </span>
  );
}
