import { describe, expect, it } from 'vitest';
import {
  change,
  dayBefore,
  dayKey,
  report,
  sum,
  windowOf,
  type Grain,
} from '@/lib/traffic-report';

const NOW = new Date(2026, 10, 5, 14, 0, 0); // 5 November 2026
const g = (day: string, channel: string, source: string, views: number, sessions = views): Grain => ({
  day,
  channel,
  source,
  views,
  sessions,
});

describe('the days a period covers', () => {
  it('today is one day, compared with yesterday', () => {
    expect(windowOf('today', NOW)).toEqual({ days: ['2026-11-05'], before: ['2026-11-04'] });
  });

  it('yesterday is compared with the day before it', () => {
    expect(windowOf('yesterday', NOW)).toEqual({ days: ['2026-11-04'], before: ['2026-11-03'] });
  });

  it('seven days includes today and reaches back six', () => {
    const { days, before } = windowOf('last7', NOW);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-10-30');
    expect(days[6]).toBe('2026-11-05');
    expect(before).toHaveLength(7);
    expect(before[6]).toBe('2026-10-29');
  });

  it('never counts a day in both the window and its comparison', () => {
    for (const p of ['today', 'yesterday', 'last7', 'last30'] as const) {
      const { days, before } = windowOf(p, NOW);
      expect(days.filter((d) => before.includes(d))).toEqual([]);
    }
  });

  it('crosses a month end without dropping a day', () => {
    expect(dayBefore(new Date(2026, 2, 1), 1)).toBe('2026-02-28');
    expect(dayKey(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31');
  });
});

describe('a change against the period before', () => {
  it('reports the direction and the size', () => {
    expect(change(140, 100)).toBe(40);
    expect(change(80, 100)).toBe(-20);
  });

  it('refuses to divide by a period with nothing in it', () => {
    expect(change(12, 0)).toBeNull();
  });
});

describe('a period report', () => {
  const grid: Grain[] = [
    // Today
    g('2026-11-05', 'organic', 'google', 40, 30),
    g('2026-11-05', 'ai', 'chatgpt', 12, 10),
    g('2026-11-05', 'ai', 'claude', 6, 5),
    g('2026-11-05', 'ads', 'google', 9, 8),
    g('2026-11-05', 'direct', 'direct', 10, 7),
    // Yesterday
    g('2026-11-04', 'organic', 'google', 20, 20),
    g('2026-11-04', 'ai', 'chatgpt', 4, 4),
    // Older, inside 7 days
    g('2026-11-01', 'social', 'facebook', 5, 5),
  ];

  it('adds up what is inside the window and ignores the rest', () => {
    const r = report(grid, 'today', NOW);
    expect(r.totals).toEqual({ views: 77, sessions: 60 });
  });

  it('compares against the period before', () => {
    const r = report(grid, 'today', NOW);
    expect(r.previous).toEqual({ views: 24, sessions: 24 });
    expect(r.sessionsChange).toBe(150);
  });

  it('lists every channel, even the ones with nothing in them', () => {
    const r = report(grid, 'today', NOW);
    expect(r.channels).toHaveLength(7);
    expect(r.channels.find((c) => c.channel === 'referral')?.sessions).toBe(0);
  });

  it('adds the assistants together, whichever one sent them', () => {
    // The whole point of the exercise: ChatGPT and Claude are one answer.
    const r = report(grid, 'today', NOW);
    expect(r.ai).toEqual({ views: 18, sessions: 15 });
  });

  it('separates paid search from unpaid', () => {
    const r = report(grid, 'today', NOW);
    expect(r.paid).toEqual({ views: 9, sessions: 8 });
    expect(r.organic).toEqual({ views: 40, sessions: 30 });
  });

  it('counts other search engines as unpaid search too', () => {
    const withBing = [...grid, g('2026-11-05', 'search', 'bing', 3, 3)];
    expect(report(withBing, 'today', NOW).organic).toEqual({ views: 43, sessions: 33 });
  });

  it('works out each channel’s share of the sessions', () => {
    const r = report(grid, 'today', NOW);
    const organic = r.channels.find((c) => c.channel === 'organic');
    expect(organic?.share).toBe(50); // 30 of 60
  });

  it('ranks the sources by sessions', () => {
    const r = report(grid, 'today', NOW);
    expect(r.sources[0]).toMatchObject({ source: 'google', channel: 'organic', sessions: 30 });
    expect(r.sources.map((s) => s.source)).toContain('chatgpt');
  });

  it('keeps google ads apart from google organic in the source list', () => {
    // Same source name, two channels: they must not be merged into one row.
    const r = report(grid, 'today', NOW);
    const googles = r.sources.filter((s) => s.source === 'google');
    expect(googles).toHaveLength(2);
    expect(googles.map((s) => s.channel).sort()).toEqual(['ads', 'organic']);
  });

  it('gives a row for every day of the window, including the quiet ones', () => {
    const r = report(grid, 'last7', NOW);
    expect(r.daily).toHaveLength(7);
    expect(r.daily.map((d) => d.day)).toEqual([
      '2026-10-30', '2026-10-31', '2026-11-01',
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
    ]);
    expect(r.daily.find((d) => d.day === '2026-10-31')?.views).toBe(0);
    expect(r.daily.find((d) => d.day === '2026-11-01')?.views).toBe(5);
  });

  it('holds up with nothing recorded at all', () => {
    const r = report([], 'last30', NOW);
    expect(r.totals).toEqual({ views: 0, sessions: 0 });
    expect(r.sessionsChange).toBeNull();
    expect(r.channels.every((c) => c.share === 0)).toBe(true);
    expect(r.daily).toHaveLength(30);
  });

  it('ignores a channel name it does not recognise rather than crashing', () => {
    const odd = [...grid, g('2026-11-05', 'telepathy', 'unknown', 99, 99)];
    const r = report(odd, 'today', NOW);
    expect(r.channels.reduce((a, c) => a + c.sessions, 0)).toBe(60);
  });
});

describe('adding rows up', () => {
  it('totals views and sessions separately', () => {
    expect(sum([g('d', 'organic', 'google', 10, 6), g('d', 'ai', 'claude', 4, 3)])).toEqual({
      views: 14,
      sessions: 9,
    });
  });

  it('is zero for nothing', () => {
    expect(sum([])).toEqual({ views: 0, sessions: 0 });
  });
});
