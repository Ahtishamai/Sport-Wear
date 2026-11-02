import { describe, expect, it } from 'vitest';
import { esc, renderOrderEmail, type OrderEmailData } from '@/lib/emails/order';

/**
 * The confirmation letter, rendered on its own.
 *
 * It is the one thing every customer reads, it cannot be edited once sent,
 * and it carries a name and an address somebody typed — so it is checked for
 * what it says, what it does not say, and what it refuses to turn into markup.
 */
const base: OrderEmailData = {
  reference: 'DS12345',
  placedAt: new Date('2026-03-01T12:00:00Z'),
  paid: true,
  invoiceNumber: null,
  customerName: 'Alice Coach',
  email: 'alice@team.test',
  items: [
    {
      name: 'Crew Neck Jersey',
      image: null,
      size: 'L',
      nameOnItem: 'Bandits',
      numberOnItem: '7',
      options: [],
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100,
    },
  ],
  subtotal: 100,
  shipping: 0,
  total: 100,
  currency: 'USD',
  storeName: 'Design Sportswear',
  storeUrl: 'https://example.test',
  closesAt: null,
  shipNote: null,
  intro: 'Thanks for your order.',
  footer: 'Any questions, just reply.',
  siteName: 'Design Sportswear',
  siteUrl: 'https://example.test',
  supportEmail: 'info@example.test',
  supportPhone: '+1 555',
  trackUrl: null,
};

const invited = renderOrderEmail({ ...base, accountUrl: 'https://example.test/account/sign-up' });
const quiet = renderOrderEmail({ ...base, accountUrl: null });

describe('when there is no account yet', () => {
  it('invites them to keep the order', () => {
    expect(invited.html).toMatch(/Keep this order/i);
  });

  it('names the order it is offering to keep', () => {
    expect(invited.html).toContain('DS12345');
  });

  it('links to the sign-up page', () => {
    expect(invited.html).toContain('https://example.test/account/sign-up');
  });

  it('says it in plain text too, for a client that shows no markup', () => {
    expect(invited.text).toMatch(/Keep this order/i);
    expect(invited.text).toContain('/account/sign-up');
  });
});

describe('when they already have one', () => {
  it('does not mention accounts at all', () => {
    expect(quiet.html).not.toMatch(/Keep this order/i);
    expect(quiet.html).not.toMatch(/sign-up/i);
  });

  it('does not mention them in plain text either', () => {
    expect(quiet.text).not.toMatch(/Keep this order/i);
  });

  it('stays quiet when the field is left out entirely', () => {
    expect(renderOrderEmail(base).html).not.toMatch(/Keep this order/i);
  });
});

describe('the rest of the letter is the same either way', () => {
  for (const [name, letter] of [
    ['invited', invited],
    ['quiet', quiet],
  ] as const) {
    it(`${name}: carries the order number, the goods and the total`, () => {
      expect(letter.html).toContain('DS12345');
      expect(letter.html).toContain('Crew Neck Jersey');
      expect(letter.html).toMatch(/\$100/);
    });

    it(`${name}: keeps the shop's own closing words`, () => {
      expect(letter.html).toContain('Any questions, just reply.');
    });

    it(`${name}: subjects itself with the reference and the shop`, () => {
      expect(letter.subject).toBe('Order confirmed · DS12345 · Design Sportswear');
    });
  }
});

describe('an order that is not paid for yet', () => {
  const unpaid = renderOrderEmail({ ...base, paid: false, invoiceNumber: 'INV-9' });

  it('says it is received rather than confirmed', () => {
    expect(unpaid.subject).toBe('Order received · DS12345 · Design Sportswear');
  });

  it('says what is still owed, and names the invoice', () => {
    expect(unpaid.html).toContain('Awaiting payment');
    expect(unpaid.html).toContain('INV-9');
  });
});

describe('nothing a customer typed can become markup', () => {
  const nasty = renderOrderEmail({
    ...base,
    customerName: '<script>alert(1)</script>',
    items: [{ ...base.items[0], name: '<img src=x onerror=alert(1)>' }],
    accountUrl: 'https://example.test/account/sign-up',
  });

  it('escapes a script tag in a name', () => {
    expect(nasty.html).not.toContain('<script>');
  });

  it('escapes an image tag in a product name', () => {
    expect(nasty.html).not.toContain('<img src=x');
  });

  it('still shows it, as text', () => {
    expect(nasty.html).toContain('&lt;script&gt;');
  });

  it('escapes the five characters that matter, and nothing else', () => {
    expect(esc(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
    expect(esc('Bandits 7')).toBe('Bandits 7');
    expect(esc(null)).toBe('');
  });
});
