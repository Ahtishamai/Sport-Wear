import 'server-only';
import { prisma } from '@/lib/db';
import { report, type Grain, type Period, type Report } from '@/lib/traffic-report';
import { CHANNEL_ORDER, type Channel } from '@/lib/traffic';

/**
 * Reading the traffic figures back out.
 *
 * Six queries, no more, and every one of them groups in the database. The
 * alternative was pulling sixty days of rows and counting them here, which
 * works on a quiet month and falls over on a good one. Counting distinct
 * visitors is something only SQL can do anyway.
 */

/** Everything the traffic screen shows, from one read. */
export type TrafficData = {
  now: Date;
  periods: Record<Period, Report>;
  live: {
    /** People on the site in the last five minutes. */
    visitors: number;
    views: number;
    pages: { path: string; visitors: number }[];
  };
  /** Unique people, counted properly over each whole window. */
  visitors: Record<Period, { now: number; before: number }>;
  pages: { path: string; views: number; sessions: number }[];
  crawlers: { crawler: string; hits: number; last: Date }[];
  /** True until the first page view is recorded. */
  empty: boolean;
};

const n = (v: unknown) => Number(v ?? 0);

/** Midnight, n days back. */
function midnight(now: Date, daysBack: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function readTraffic(now = new Date()): Promise<TrafficData> {
  const from60 = midnight(now, 59);
  const from30 = midnight(now, 29);
  const today0 = midnight(now, 0);
  const yest0 = midnight(now, 1);
  const from7 = midnight(now, 6);
  const prev7 = midnight(now, 13);
  const dayBefore = midnight(now, 2);
  const live0 = new Date(now.getTime() - 5 * 60_000);

  const [grid, uniques, liveRow, livePages, pages, crawlers] = await Promise.all([
    // The whole grid: one row per day, channel and source. A quiet month is
    // a few hundred rows, a busy one a couple of thousand.
    prisma.$queryRaw<
      { day: string; channel: string; source: string; views: bigint; sessions: bigint }[]
    >`
      SELECT DATE_FORMAT(at, '%Y-%m-%d') AS day,
             channel,
             source,
             COUNT(*) AS views,
             COUNT(DISTINCT session) AS sessions
      FROM visits
      WHERE bot = 0 AND at >= ${from60}
      GROUP BY day, channel, source
    `,

    /*
     * Unique people per window, in one query.
     *
     * Summing a daily distinct count would count somebody who visited on
     * Monday and Thursday twice, so each window is counted over its own
     * whole range instead.
     */
    prisma.$queryRaw<Record<string, bigint>[]>`
      SELECT
        COUNT(DISTINCT CASE WHEN at >= ${today0} THEN visitor END) AS today_now,
        COUNT(DISTINCT CASE WHEN at >= ${yest0} AND at < ${today0} THEN visitor END) AS today_before,
        COUNT(DISTINCT CASE WHEN at >= ${dayBefore} AND at < ${yest0} THEN visitor END) AS yesterday_before,
        COUNT(DISTINCT CASE WHEN at >= ${from7} THEN visitor END) AS last7_now,
        COUNT(DISTINCT CASE WHEN at >= ${prev7} AND at < ${from7} THEN visitor END) AS last7_before,
        COUNT(DISTINCT CASE WHEN at >= ${from30} THEN visitor END) AS last30_now,
        COUNT(DISTINCT CASE WHEN at >= ${from60} AND at < ${from30} THEN visitor END) AS last30_before
      FROM visits
      WHERE bot = 0 AND at >= ${from60}
    `,

    prisma.$queryRaw<{ visitors: bigint; views: bigint }[]>`
      SELECT COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views
      FROM visits
      WHERE bot = 0 AND at >= ${live0}
    `,

    prisma.$queryRaw<{ path: string; visitors: bigint }[]>`
      SELECT path, COUNT(DISTINCT visitor) AS visitors
      FROM visits
      WHERE bot = 0 AND at >= ${live0}
      GROUP BY path
      ORDER BY visitors DESC, path ASC
      LIMIT 8
    `,

    prisma.$queryRaw<{ path: string; views: bigint; sessions: bigint }[]>`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT session) AS sessions
      FROM visits
      WHERE bot = 0 AND at >= ${from30}
      GROUP BY path
      ORDER BY views DESC
      LIMIT 12
    `,

    // Not visitors, and never counted as any. An assistant reading the shop
    // is how its pages end up quoted in an answer, so it is worth seeing.
    prisma.$queryRaw<{ crawler: string; hits: bigint; last: Date }[]>`
      SELECT crawler, COUNT(*) AS hits, MAX(at) AS last
      FROM visits
      WHERE bot = 1 AND crawler IS NOT NULL AND at >= ${from30}
      GROUP BY crawler
      ORDER BY hits DESC
    `,
  ]);

  const rows: Grain[] = grid.map((r) => ({
    day: String(r.day),
    channel: r.channel,
    source: r.source,
    views: n(r.views),
    sessions: n(r.sessions),
  }));

  const u = uniques[0] ?? {};
  const visitors = {
    today: { now: n(u.today_now), before: n(u.today_before) },
    yesterday: { now: n(u.today_before), before: n(u.yesterday_before) },
    last7: { now: n(u.last7_now), before: n(u.last7_before) },
    last30: { now: n(u.last30_now), before: n(u.last30_before) },
  };

  return {
    now,
    periods: {
      today: report(rows, 'today', now),
      yesterday: report(rows, 'yesterday', now),
      last7: report(rows, 'last7', now),
      last30: report(rows, 'last30', now),
    },
    live: {
      visitors: n(liveRow[0]?.visitors),
      views: n(liveRow[0]?.views),
      pages: livePages.map((p) => ({ path: p.path, visitors: n(p.visitors) })),
    },
    visitors,
    pages: pages.map((p) => ({ path: p.path, views: n(p.views), sessions: n(p.sessions) })),
    crawlers: crawlers.map((c) => ({ crawler: c.crawler, hits: n(c.hits), last: new Date(c.last) })),
    empty: rows.length === 0 && n(liveRow[0]?.views) === 0,
  };
}

/**
 * Who is here now, and where today's visitors came from.
 *
 * Two queries, for the dashboard and for the number that keeps refreshing.
 * The full report is six; this is the cheap version that can be asked for
 * every half minute without spending the connection allowance.
 */
export type LiveSnapshot = {
  visitors: number;
  views: number;
  today: { visitors: number; sessions: number; views: number };
  channels: { channel: Channel; sessions: number; views: number }[];
  /** False when the visits table has not been created yet. */
  available: boolean;
};

const NOTHING: LiveSnapshot = {
  visitors: 0,
  views: 0,
  today: { visitors: 0, sessions: 0, views: 0 },
  channels: [],
  available: false,
};

export async function readLiveSnapshot(now = new Date()): Promise<LiveSnapshot> {
  const live0 = new Date(now.getTime() - 5 * 60_000);
  const today0 = midnight(now, 0);

  try {
    const [counts, byChannel] = await Promise.all([
      // Live and today in one pass, because both read the same rows.
      prisma.$queryRaw<Record<string, bigint>[]>`
        SELECT
          COUNT(DISTINCT CASE WHEN at >= ${live0} THEN visitor END) AS live_visitors,
          SUM(CASE WHEN at >= ${live0} THEN 1 ELSE 0 END) AS live_views,
          COUNT(DISTINCT visitor) AS today_visitors,
          COUNT(DISTINCT session) AS today_sessions,
          COUNT(*) AS today_views
        FROM visits
        WHERE bot = 0 AND at >= ${today0}
      `,
      prisma.$queryRaw<{ channel: string; sessions: bigint; views: bigint }[]>`
        SELECT channel, COUNT(DISTINCT session) AS sessions, COUNT(*) AS views
        FROM visits
        WHERE bot = 0 AND at >= ${today0}
        GROUP BY channel
      `,
    ]);

    const c = counts[0] ?? {};
    const known = new Set<string>(CHANNEL_ORDER);
    return {
      visitors: n(c.live_visitors),
      views: n(c.live_views),
      today: {
        visitors: n(c.today_visitors),
        sessions: n(c.today_sessions),
        views: n(c.today_views),
      },
      channels: CHANNEL_ORDER.map((channel) => {
        const row = byChannel.find((r) => r.channel === channel);
        return { channel, sessions: n(row?.sessions), views: n(row?.views) };
      }).filter((r) => r.views > 0 || known.has(r.channel)),
      available: true,
    };
  } catch {
    // The table does not exist yet, or the database is refusing. Either way
    // the dashboard carries on without a traffic panel.
    return NOTHING;
  }
}

/** Just the live number, for the dashboard tile. */
export async function readLive(): Promise<{ visitors: number; views: number }> {
  const snap = await readLiveSnapshot();
  return { visitors: snap.visitors, views: snap.views };
}
