import { describe, expect, it } from 'vitest';
import {
  applyDiscount,
  discountAmount,
  discountProblem,
  eligibleTotal,
  normalizeCode,
  type DiscountableLine,
  type DiscountRule,
} from '@/lib/discount';

const rule = (over: Partial<DiscountRule> = {}): DiscountRule => ({
  id: 'd1',
  code: 'SAVE',
  label: null,
  kind: 'PERCENT',
  value: 10,
  scope: 'ALL',
  targets: [],
  minSubtotal: null,
  usageLimit: null,
  perEmailLimit: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  active: true,
  ...over,
});

const line = (handle: string, total: number, collections: string[] = []): DiscountableLine => ({
  productHandle: handle,
  lineTotal: total,
  collectionHandles: collections,
});

/** A $150 cart: a $100 jersey in shirts, a $50 bag in bags. */
const cart = [line('jersey', 100, ['shirts']), line('bag', 50, ['bags'])];

describe('reading a code', () => {
  it('does not care about spaces or case', () => {
    expect(normalizeCode('  spring 25 ')).toBe('SPRING25');
  });

  it('reads nothing as nothing', () => {
    expect(normalizeCode(null)).toBe('');
    expect(normalizeCode(undefined)).toBe('');
  });

  it('will not store a code longer than the column', () => {
    expect(normalizeCode('x'.repeat(80))).toHaveLength(40);
  });
});

describe('the part of the cart a code covers', () => {
  it('is the whole cart for a code with no scope', () => {
    expect(eligibleTotal(rule(), cart)).toBe(150);
  });

  it('is the matching collection', () => {
    expect(eligibleTotal(rule({ scope: 'COLLECTIONS', targets: ['bags'] }), cart)).toBe(50);
  });

  it('is the matching product', () => {
    expect(eligibleTotal(rule({ scope: 'PRODUCTS', targets: ['jersey'] }), cart)).toBe(100);
  });

  it('is nothing when a scoped code names nothing', () => {
    expect(eligibleTotal(rule({ scope: 'PRODUCTS', targets: [] }), cart)).toBe(0);
  });
});

describe('what it takes off', () => {
  it('takes a tenth off the whole order', () => {
    expect(discountAmount(rule(), cart)).toBe(15);
  });

  it('takes a flat amount off the whole order', () => {
    expect(discountAmount(rule({ kind: 'FIXED', value: 20 }), cart)).toBe(20);
  });

  it('takes a tenth off one collection', () => {
    expect(discountAmount(rule({ scope: 'COLLECTIONS', targets: ['bags'] }), cart)).toBe(5);
  });

  it('takes a tenth off one product', () => {
    expect(discountAmount(rule({ scope: 'PRODUCTS', targets: ['jersey'] }), cart)).toBe(10);
  });

  it('matches a handle typed in the wrong case', () => {
    expect(discountAmount(rule({ scope: 'PRODUCTS', targets: ['JERSEY'] }), cart)).toBe(10);
  });

  it('takes nothing off when nothing matches', () => {
    expect(discountAmount(rule({ scope: 'PRODUCTS', targets: ['socks'] }), cart)).toBe(0);
  });

  it('takes nothing off for a code worth nothing', () => {
    expect(discountAmount(rule({ value: 0 }), cart)).toBe(0);
    expect(discountAmount(rule({ kind: 'FIXED', value: -5 }), cart)).toBe(0);
  });
});

describe('it can never pay the customer', () => {
  it('stops $500 off at the size of the cart', () => {
    expect(discountAmount(rule({ kind: 'FIXED', value: 500 }), cart)).toBe(150);
  });

  it('stops $80 off a $50 collection at the collection', () => {
    const over = rule({ kind: 'FIXED', value: 80, scope: 'COLLECTIONS', targets: ['bags'] });
    expect(discountAmount(over, cart)).toBe(50);
  });

  it('makes a hundred per cent free, not negative', () => {
    expect(discountAmount(rule({ value: 100 }), cart)).toBe(150);
  });

  it('caps a percentage somebody typed wrong', () => {
    expect(discountAmount(rule({ value: 400 }), cart)).toBe(150);
  });
});

describe('rounding', () => {
  it('rounds a third of a dollar to the cent', () => {
    expect(discountAmount(rule({ value: 33.333 }), [line('a', 10)])).toBe(3.33);
  });

  it('leaves no floating-point dust', () => {
    expect(discountAmount(rule({ value: 10 }), [line('a', 0.1), line('b', 0.2)])).toBe(0.03);
  });
});

describe('when a code may be used', () => {
  const base = { subtotal: 150, lines: cart };

  it('has nothing to say about a good code', () => {
    expect(discountProblem(rule(), base)).toBeNull();
  });

  it('says so when there is no such code', () => {
    expect(discountProblem(null, base)).toBe(
      'That code is not one of ours. Check the spelling and try again.'
    );
  });

  it('says so when it has been switched off', () => {
    expect(discountProblem(rule({ active: false }), base)).toBe('That code is no longer available.');
  });

  it('says so before it starts', () => {
    expect(discountProblem(rule({ startsAt: new Date('2099-01-01') }), base)).toBe(
      'That code is not live yet.'
    );
  });

  it('says so after it ends', () => {
    expect(discountProblem(rule({ endsAt: new Date('2020-01-01') }), base)).toBe(
      'That code has expired.'
    );
  });

  it('judges the dates against the moment it is given, not the clock', () => {
    const summer = rule({ startsAt: new Date('2026-06-01'), endsAt: new Date('2026-08-31') });
    expect(discountProblem(summer, { ...base, now: new Date('2026-07-04') })).toBeNull();
    expect(discountProblem(summer, { ...base, now: new Date('2026-09-04') })).toBe(
      'That code has expired.'
    );
  });

  it('says so when it has been used up', () => {
    expect(discountProblem(rule({ usageLimit: 5, usedCount: 5 }), base)).toBe(
      'That code has been used up.'
    );
  });

  it('says so when this customer has had their turn', () => {
    expect(discountProblem(rule({ perEmailLimit: 1 }), { ...base, usesByEmail: 1 })).toBe(
      'That code can only be used once per customer.'
    );
    expect(discountProblem(rule({ perEmailLimit: 3 }), { ...base, usesByEmail: 3 })).toBe(
      'That code can only be used 3 times per customer.'
    );
  });

  it('names the shortfall under a minimum', () => {
    expect(discountProblem(rule({ minSubtotal: 200 }), base)).toBe(
      'That code needs an order of $200.00 — you are $50.00 short.'
    );
  });

  it('counts exactly the minimum as enough', () => {
    expect(discountProblem(rule({ minSubtotal: 150 }), base)).toBeNull();
  });

  it('says so when the cart holds nothing the code applies to', () => {
    expect(discountProblem(rule({ scope: 'PRODUCTS', targets: ['socks'] }), base)).toBe(
      'That code does not apply to anything in your cart.'
    );
  });
});

describe('what the cart is shown', () => {
  it('uses the label the shop typed', () => {
    expect(applyDiscount(rule({ label: '  Spring sale  ' }), cart)).toEqual({
      code: 'SAVE',
      label: 'Spring sale',
      kind: 'PERCENT',
      value: 10,
      amount: 15,
    });
  });

  it('writes its own label when none was typed', () => {
    expect(applyDiscount(rule(), cart).label).toBe('10% off');
    expect(applyDiscount(rule({ kind: 'FIXED', value: 20 }), cart).label).toBe('$20.00 off');
  });
});
