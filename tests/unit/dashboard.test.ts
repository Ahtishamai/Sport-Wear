import { describe, expect, it } from 'vitest';
import {
  bars,
  createdBetween,
  dayKey,
  isPaid,
  isPlaceholderSocial,
  lastDays,
  pending,
  searchGaps,
  specsUnanswered,
  takings,
  trend,
  windowStart,
  type DatedAmount,
} from '@/lib/dashboard';

/** A local date, so the test means the same thing wherever it runs. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);
const NOW = at(2026, 11, 3, 10);

const order = (
  day: Date,
  amount: number,
  status = 'PAID',
  paidAt: Date | null = day
): DatedAmount => ({ createdAt: day, paidAt, amount, status });

describe('a day on the chart', () => {
  it('is the day the shop had, not the day UTC had', () => {
    // Eight in the evening belongs to that evening, not to tomorrow.
    expect(dayKey(at(2026, 10, 19, 20))).toBe('2026-10-19');
    expect(dayKey(at(2026, 1, 5, 23))).toBe('2026-01-05');
  });

  it('counts out the last n days, oldest first, ending today', () => {
    const days = lastDays(3, NOW);
    expect(days).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('crosses a month boundary without losing a day', () => {
    expect(lastDays(4, at(2026, 3, 2))).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });
});

describe('the near edge of a window', () => {
  it('is midnight, so today counts in full', () => {
    const start = windowStart(30, NOW);
    expect(dayKey(start)).toBe('2026-10-05');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('is today itself for a window of one', () => {
    expect(dayKey(windowStart(1, NOW))).toBe('2026-11-03');
  });
});

describe('what counts as money in', () => {
  it('is paid or fulfilled, and nothing else', () => {
    expect(isPaid('PAID')).toBe(true);
    expect(isPaid('FULFILLED')).toBe(true);
    expect(isPaid('PENDING')).toBe(false);
    expect(isPaid('CANCELLED')).toBe(false);
    expect(isPaid('REFUNDED')).toBe(false);
  });
});

describe('takings over a window', () => {
  const rows = [
    order(at(2026, 10, 19), 42.5),
    order(at(2026, 10, 15), 77.5),
    order(at(2026, 9, 20), 100), // outside thirty days
    order(at(2026, 10, 18), 15, 'PENDING', null), // never paid
    order(at(2026, 10, 10), 30, 'REFUNDED'),
    order(at(2026, 10, 12), 60, 'FULFILLED'),
  ];

  it('adds up only what was actually paid', () => {
    expect(takings(rows, windowStart(30, NOW))).toEqual({ count: 3, total: 180 });
  });

  it('leaves a refund out rather than counting it as income', () => {
    expect(takings([order(at(2026, 10, 11), 30, 'REFUNDED')], windowStart(30, NOW))).toEqual({
      count: 0,
      total: 0,
    });
  });

  it('counts an order on the day it was paid, not the day it was started', () => {
    // A basket left on the 1st and paid on the 30th is money that arrived
    // on the 30th.
    const late = order(at(2026, 9, 1), 50, 'PAID', at(2026, 10, 30));
    expect(takings([late], windowStart(30, NOW)).total).toBe(50);
  });

  it('can be asked for the window before, so one month faces another', () => {
    const previous = takings(rows, windowStart(60, NOW), windowStart(30, NOW));
    expect(previous).toEqual({ count: 1, total: 100 });
  });
});

describe('rows created in a window', () => {
  const leads = [
    { createdAt: at(2026, 10, 27) },
    { createdAt: at(2026, 10, 5) },
    { createdAt: at(2026, 9, 28) },
  ];

  it('takes what falls inside it', () => {
    expect(createdBetween(leads, windowStart(30, NOW))).toHaveLength(2);
  });

  it('does not count the same row in both windows', () => {
    const from = windowStart(30, NOW);
    const now = createdBetween(leads, from).length;
    const before = createdBetween(leads, windowStart(60, NOW), from).length;
    expect(now + before).toBe(3);
  });
});

describe('one bar a day', () => {
  it('puts each lead and each paid order on its own day', () => {
    const series = bars(
      3,
      NOW,
      [{ createdAt: at(2026, 11, 2) }, { createdAt: at(2026, 11, 2) }],
      [order(at(2026, 11, 3), 40), order(at(2026, 11, 1), 10, 'PENDING', null)]
    );
    expect(series).toHaveLength(3);
    expect(series.map((b) => b.leads)).toEqual([0, 2, 0]);
    expect(series.map((b) => b.orders)).toEqual([0, 0, 1]);
    expect(series.map((b) => b.taken)).toEqual([0, 0, 40]);
  });

  it('ignores anything older than the window rather than piling it on day one', () => {
    const series = bars(2, NOW, [{ createdAt: at(2026, 1, 1) }], [order(at(2026, 1, 1), 999)]);
    expect(series.map((b) => b.leads + b.orders)).toEqual([0, 0]);
  });

  it('labels a day the way a person reads one', () => {
    expect(bars(1, NOW, [], [])[0].label).toBe('11/03');
  });
});

describe('this month against last', () => {
  it('gives the direction and the size of the change', () => {
    expect(trend(14, 10)).toEqual({ pct: 40, up: true });
    expect(trend(8, 10)).toEqual({ pct: -20, up: false });
    expect(trend(10, 10)).toEqual({ pct: 0, up: true });
  });

  it('refuses to make a percentage out of nothing', () => {
    // "Up 100%" from a standing start says nothing true.
    expect(trend(5, 0)).toEqual({ pct: null, up: true });
    expect(trend(0, 0)).toEqual({ pct: null, up: false });
  });
});

describe('the list of things waiting', () => {
  it('leaves out everything with nothing in it', () => {
    const list = pending([
      { label: 'a', count: 0, href: '/a', hint: '' },
      { label: 'b', count: 3, href: '/b', hint: '' },
    ]);
    expect(list.map((i) => i.label)).toEqual(['b']);
  });

  it('puts what is urgent first, then whatever is largest', () => {
    const list = pending([
      { label: 'orders', count: 74, href: '/o', hint: '' },
      { label: 'leads', count: 13, href: '/l', hint: '', urgent: true },
      { label: 'dead ends', count: 3, href: '/d', hint: '' },
    ]);
    expect(list.map((i) => i.label)).toEqual(['leads', 'orders', 'dead ends']);
  });
});

describe('spec answers', () => {
  it('spots the five headings nobody filled in', () => {
    expect(
      specsUnanswered([
        { q: 'Fabric & construction', a: '' },
        { q: 'Sizing & fit', a: '' },
      ])
    ).toBe(true);
  });

  it('says nothing is missing once one is answered', () => {
    expect(
      specsUnanswered([
        { q: 'Fabric & construction', a: '100% polyester, sublimated.' },
        { q: 'Sizing & fit', a: '' },
      ])
    ).toBe(false);
  });

  it('treats a product with no spec list as nothing to report', () => {
    expect(specsUnanswered([])).toBe(false);
    expect(specsUnanswered(null)).toBe(false);
  });
});

describe('a social link nobody filled in', () => {
  it('knows the network from the shop’s page on it', () => {
    expect(isPlaceholderSocial('https://facebook.com')).toBe(true);
    expect(isPlaceholderSocial('https://www.instagram.com/')).toBe(true);
    expect(isPlaceholderSocial('https://facebook.com/designsportswear')).toBe(false);
    expect(isPlaceholderSocial('https://instagram.com/design.sportswear')).toBe(false);
  });

  it('counts an empty field as unfilled', () => {
    expect(isPlaceholderSocial('')).toBe(true);
  });
});

describe('what the shop has left for the site to write', () => {
  const live = (over: Partial<Parameters<typeof searchGaps>[0][number]> = {}) => ({
    sku: 'DS-1',
    seoTitle: 'A title',
    seoDescription: 'A sentence long enough to be a sentence.',
    status: 'PUBLISHED',
    specs: [{ q: 'Fabric', a: 'Polyester' }],
    images: 2,
    ...over,
  });

  it('reports a blank field and says what fills in for it', () => {
    const gaps = searchGaps([live({ sku: null }), live()], [], 0);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ label: 'Products with no SKU', count: 1 });
  });

  it('puts a product with no photograph above the rest', () => {
    const gaps = searchGaps(
      [live({ images: 0 }), live({ sku: null }), live({ sku: null }), live({ sku: null })],
      [],
      0
    );
    expect(gaps[0].label).toBe('Products with no photo');
  });

  it('ignores drafts, which are not in a search result anyway', () => {
    const gaps = searchGaps([live({ status: 'DRAFT', sku: null, images: 0 })], [], 0);
    expect(gaps).toEqual([]);
  });

  it('counts an unpublished collection out too', () => {
    const shelf = { seoTitle: 'T', seoDescription: null, status: 'DRAFT', products: 0 };
    expect(searchGaps([], [shelf], 0)).toEqual([]);
  });

  it('says nothing at all when everything is written', () => {
    expect(searchGaps([live(), live()], [], 0)).toEqual([]);
  });

  it('mentions placeholder social links, because markup cannot claim them', () => {
    const gaps = searchGaps([live()], [], 3);
    expect(gaps[0]).toMatchObject({ label: 'Social links still placeholders', count: 3 });
  });
});
