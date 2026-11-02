import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIERS,
  SHIRT_TIERS,
  activeTier,
  checkAddresses,
  dateToStoreInput,
  formatStoreDeadline,
  isEmail,
  money,
  parsePayAmount,
  payMoney,
  slugify,
  splitAddresses,
  storeTimeToDate,
  sumQty,
  tierLabel,
  tierPrice,
  tierSavings,
  unitPriceFor,
} from '@/lib/utils';

describe('writing an amount down', () => {
  it('leaves whole dollars whole', () => {
    expect(money(150)).toBe('$150');
  });

  it('shows cents when there are any', () => {
    expect(money(150.5)).toBe('$150.50');
  });

  it('groups thousands', () => {
    expect(money(1234.5)).toBe('$1,234.50');
    expect(money(1000)).toBe('$1,000');
  });

  it('reads nothing, and nonsense, as nothing', () => {
    expect(money(null)).toBe('$0');
    expect(money(undefined)).toBe('$0');
    expect(money('abc')).toBe('$0');
  });

  it('can be made to show cents on a whole amount', () => {
    expect(money(10, { cents: true })).toBe('$10.00');
  });

  it('writes an invoice amount the same way', () => {
    expect(payMoney(1234.5)).toBe('$1,234.50');
    expect(payMoney(200)).toBe('$200');
    expect(payMoney(0.5)).toBe('$0.50');
  });
});

describe('reading an amount somebody typed', () => {
  it('accepts the way a person writes one', () => {
    expect(parsePayAmount('1,234.50', 1, 10000)).toEqual({ amount: 1234.5, problem: '' });
    expect(parsePayAmount('$149.50', 1, 10000)).toEqual({ amount: 149.5, problem: '' });
  });

  it('refuses anything that is not plainly a number', () => {
    // Number('1e5') is 100000 and Number('0x10') is 16, neither of which is
    // what anyone typed on an invoice.
    const said = 'Enter the amount as a number, like 149.50.';
    expect(parsePayAmount('1e5', 1, 10000).problem).toBe(said);
    expect(parsePayAmount('0x10', 1, 10000).problem).toBe(said);
    expect(parsePayAmount('12.34.56', 1, 10000).problem).toBe(said);
    expect(parsePayAmount('-50', 1, 10000).problem).toBe(said);
  });

  it('asks for an amount when the box is empty', () => {
    expect(parsePayAmount('', 1, 10000).problem).toBe('Enter the amount to pay.');
    expect(parsePayAmount(null, 1, 10000).problem).toBe('Enter the amount to pay.');
  });

  it('refuses nothing, and less than nothing', () => {
    expect(parsePayAmount('0', 1, 10000).problem).toBe('Enter an amount greater than zero.');
  });

  it('names the smallest payment it can take', () => {
    expect(parsePayAmount('0.50', 1, 100).problem).toBe(
      'The smallest payment we can take online is $1.'
    );
  });

  it('sends a payment that is too large to the phone', () => {
    expect(parsePayAmount('500', 1, 100).problem).toBe(
      'That is more than we can take online ($100 maximum). Please call us and we will take it another way.'
    );
  });

  it('rounds to the cent', () => {
    expect(parsePayAmount('10.567', 1, 10000).amount).toBe(10.57);
  });
});

describe('the shirt price list', () => {
  it('charges the price of the ladder at every quantity', () => {
    const at = (n: number) => unitPriceFor(50, SHIRT_TIERS, n);
    expect([1, 2, 3, 4, 5, 6, 10, 11, 20, 21, 100].map(at)).toEqual([
      50, 40, 35, 35, 30, 25, 25, 22, 22, 20, 20,
    ]);
  });

  it('never falls off the bottom of the ladder', () => {
    expect(activeTier(SHIRT_TIERS, 0)).toBe(0);
    expect(unitPriceFor(50, SHIRT_TIERS, 0)).toBe(50);
  });

  it('names a tier from its quantities when nobody typed a label', () => {
    expect(tierLabel(SHIRT_TIERS[0])).toBe('1');
    expect(tierLabel(SHIRT_TIERS[2])).toBe('3–4');
    expect(tierLabel(SHIRT_TIERS[6])).toBe('21+');
    expect(tierLabel({ label: '  Team  ', minQty: 1, maxQty: null, discount: 0, savingsLabel: '' })).toBe(
      'Team'
    );
  });

  it('works out the saving against the price of buying one', () => {
    expect(tierSavings(50, SHIRT_TIERS, 6)).toBe('Save 60%');
    expect(tierSavings(50, SHIRT_TIERS, 0)).toBe('');
  });

  it('falls back to dollars off the base price for a product with no price list', () => {
    expect(unitPriceFor(30, DEFAULT_TIERS, 24)).toBe(27);
    expect(tierSavings(30, DEFAULT_TIERS, 2)).toBe('Save 10%');
  });

  it('never prices anything below nothing', () => {
    expect(tierPrice(1, { label: '', minQty: 1, maxQty: null, discount: 5, savingsLabel: '' })).toBe(0);
  });

  it('adds up a size run', () => {
    expect(sumQty({ S: 2, M: 3, L: 0 })).toBe(5);
    expect(sumQty({})).toBe(0);
  });
});

describe('addresses pasted from somewhere else', () => {
  it('splits on commas, semicolons and new lines alike', () => {
    expect(splitAddresses('a@b.com, c@d.com; e@f.com\ng@h.com')).toEqual([
      'a@b.com',
      'c@d.com',
      'e@f.com',
      'g@h.com',
    ]);
  });

  it('sorts what can be sent to from what cannot, and drops a repeat', () => {
    expect(checkAddresses('a@b.com, A@B.com; bad\nc@d.org')).toEqual({
      valid: ['a@b.com', 'c@d.org'],
      invalid: ['bad'],
    });
  });

  it('knows an address from something that only looks like one', () => {
    expect(isEmail('coach@team.org')).toBe(true);
    expect(isEmail('coach@team')).toBe(false);
    expect(isEmail('coach team.org')).toBe(false);
  });
});

describe('a handle made from a name', () => {
  it('is lower case, hyphenated, and free of punctuation', () => {
    expect(slugify('Baseball Jerseys!')).toBe('baseball-jerseys');
    expect(slugify('--Hello--World--')).toBe('hello-world');
  });

  it('strips the accents off a letter rather than dropping the letter', () => {
    expect(slugify('Crème Brûlée café')).toBe('creme-brulee-cafe');
  });

  it('stops at a length a column can hold', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(80);
  });
});

describe('the clock a team store closes on', () => {
  it('reads noon as noon in Eastern time, in summer', () => {
    expect(storeTimeToDate('2026-09-20T12:00')?.toISOString()).toBe('2026-09-20T16:00:00.000Z');
  });

  it('reads noon as noon in Eastern time, in winter', () => {
    expect(storeTimeToDate('2026-01-15T12:00')?.toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('moves with daylight saving rather than through it', () => {
    // 2026 puts the clocks forward on 8 March: noon is an hour apart either
    // side of it, which is the whole reason this does not just use UTC.
    expect(storeTimeToDate('2026-03-07T12:00')?.toISOString()).toBe('2026-03-07T17:00:00.000Z');
    expect(storeTimeToDate('2026-03-08T12:00')?.toISOString()).toBe('2026-03-08T16:00:00.000Z');
  });

  it('quotes the deadline the same way to every shopper', () => {
    expect(formatStoreDeadline(storeTimeToDate('2026-09-20T12:00')!)).toBe(
      'Sunday, September 20 at 12:00 PM EDT'
    );
  });

  it('reads back into the admin box as it was typed', () => {
    expect(dateToStoreInput(storeTimeToDate('2026-09-20T12:00'))).toBe('2026-09-20T12:00');
  });

  it('refuses something that is not a time', () => {
    expect(storeTimeToDate('nonsense')).toBeNull();
    expect(storeTimeToDate('')).toBeNull();
    expect(dateToStoreInput(null)).toBe('');
    expect(formatStoreDeadline('nonsense')).toBe('');
  });
});
