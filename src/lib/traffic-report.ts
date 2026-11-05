import { CHANNEL_ORDER, type Channel } from '@/lib/traffic';

/**
 * Turning rows of counts into the report the shop reads.
 *
 * The database does the grouping, because it can count distinct sessions
 * and this cannot. Everything after that is arithmetic, and it lives here
 * where it can be checked: a traffic report nobody can verify is worse than
 * no traffic report, because somebody will make a decision on it.
 */

/** One day, one channel, one source, as the database groups them. */
export type Grain = {
  /** YYYY-MM-DD, in the server's own clock. */
  day: string;
  channel: string;
  source: string;
  views: number;
  sessions: number;
};

export type Period = 'today' | 'yesterday' | 'last7' | 'last30';

export const PERIOD_LABEL: Record<Period, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
};

/** A day, from the server's clock, as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** n days before the given day, as a key. */
export function dayBefore(now: Date, n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

/** The days a period covers, oldest first, and the days it is compared against. */
export function windowOf(period: Period, now: Date): { days: string[]; before: string[] } {
  const back = (n: number) => dayBefore(now, n);
  switch (period) {
    case 'today':
      return { days: [back(0)], before: [back(1)] };
    case 'yesterday':
      return { days: [back(1)], before: [back(2)] };
    case 'last7':
      return {
        days: Array.from({ length: 7 }, (_, i) => back(6 - i)),
        before: Array.from({ length: 7 }, (_, i) => back(13 - i)),
      };
    case 'last30':
      return {
        days: Array.from({ length: 30 }, (_, i) => back(29 - i)),
        before: Array.from({ length: 30 }, (_, i) => back(59 - i)),
      };
  }
}

export type Totals = { views: number; sessions: number };

export function sum(rows: Grain[]): Totals {
  return rows.reduce(
    (a, r) => ({ views: a.views + r.views, sessions: a.sessions + r.sessions }),
    { views: 0, sessions: 0 }
  );
}

/**
 * The change from one period to the one before it.
 *
 * Null when there is nothing to compare against. A percentage of zero is
 * not a fact, and "up 100%" from a standing start tells nobody anything.
 */
export function change(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

export type ChannelRow = {
  channel: Channel;
  views: number;
  sessions: number;
  /** Share of the period's sessions, 0 to 100. */
  share: number;
  /** Change in sessions against the period before. */
  change: number | null;
};

export type SourceRow = {
  source: string;
  channel: Channel;
  views: number;
  sessions: number;
};

export type DayRow = { day: string; views: number; sessions: number };

export type Report = {
  period: Period;
  label: string;
  totals: Totals;
  /** The same figures for the period before, for comparison. */
  previous: Totals;
  viewsChange: number | null;
  sessionsChange: number | null;
  channels: ChannelRow[];
  sources: SourceRow[];
  daily: DayRow[];
  /** Paid against unpaid search, which is the question money rides on. */
  organic: Totals;
  paid: Totals;
  /** Everything an assistant sent, across all of them. */
  ai: Totals;
};

const isChannel = (s: string): s is Channel => (CHANNEL_ORDER as string[]).includes(s);

/** One period's report, built from the whole grid. */
export function report(grid: Grain[], period: Period, now: Date): Report {
  const { days, before } = windowOf(period, now);
  const inDays = new Set(days);
  const inBefore = new Set(before);

  const rows = grid.filter((r) => inDays.has(r.day));
  const prevRows = grid.filter((r) => inBefore.has(r.day));

  const totals = sum(rows);
  const previous = sum(prevRows);

  const byChannel = new Map<Channel, Totals>();
  const prevByChannel = new Map<Channel, Totals>();
  const add = (map: Map<Channel, Totals>, c: Channel, r: Grain) => {
    const at = map.get(c) ?? { views: 0, sessions: 0 };
    map.set(c, { views: at.views + r.views, sessions: at.sessions + r.sessions });
  };
  for (const r of rows) if (isChannel(r.channel)) add(byChannel, r.channel, r);
  for (const r of prevRows) if (isChannel(r.channel)) add(prevByChannel, r.channel, r);

  const channels: ChannelRow[] = CHANNEL_ORDER.map((c) => {
    const t = byChannel.get(c) ?? { views: 0, sessions: 0 };
    const p = prevByChannel.get(c) ?? { views: 0, sessions: 0 };
    return {
      channel: c,
      views: t.views,
      sessions: t.sessions,
      share: totals.sessions ? Math.round((t.sessions / totals.sessions) * 100) : 0,
      change: change(t.sessions, p.sessions),
    };
  });

  const bySource = new Map<string, SourceRow>();
  for (const r of rows) {
    if (!isChannel(r.channel)) continue;
    const key = `${r.channel}|${r.source}`;
    const at = bySource.get(key) ?? {
      source: r.source,
      channel: r.channel,
      views: 0,
      sessions: 0,
    };
    at.views += r.views;
    at.sessions += r.sessions;
    bySource.set(key, at);
  }
  const sources = [...bySource.values()]
    .sort((a, b) => b.sessions - a.sessions || b.views - a.views)
    .slice(0, 12);

  const perDay = new Map<string, DayRow>();
  for (const day of days) perDay.set(day, { day, views: 0, sessions: 0 });
  for (const r of rows) {
    const at = perDay.get(r.day);
    if (!at) continue;
    at.views += r.views;
    at.sessions += r.sessions;
  }

  const pick = (c: Channel) => byChannel.get(c) ?? { views: 0, sessions: 0 };
  const organic = pick('organic');
  const other = pick('search');

  return {
    period,
    label: PERIOD_LABEL[period],
    totals,
    previous,
    viewsChange: change(totals.views, previous.views),
    sessionsChange: change(totals.sessions, previous.sessions),
    channels,
    sources,
    daily: [...perDay.values()],
    // Unpaid search of every kind against paid search of every kind.
    organic: {
      views: organic.views + other.views,
      sessions: organic.sessions + other.sessions,
    },
    paid: pick('ads'),
    ai: pick('ai'),
  };
}
