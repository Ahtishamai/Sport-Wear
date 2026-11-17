import { describe, expect, it, vi } from 'vitest';

/**
 * The address a customer types on the pay page.
 *
 * Settings are replaced so this is about the checking, not about what the
 * shop happens to have switched on.
 */
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ payEnabled: true, payMin: 1, payMax: 10000 }),
}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

const { checkPayment, formatShipTo } = await import('@/lib/invoice-pay');

const BASE = { invoiceNumber: 'INV-2291', amount: '120.00' };
const FULL = {
  line1: '1601 Main St',
  line2: 'Unit 4',
  city: 'Springfield',
  region: 'MA',
  postcode: '01103',
  country: 'United States',
};

describe('the delivery address on a payment', () => {
  it('is kept when it is complete', async () => {
    const p = await checkPayment({ ...BASE, shipTo: FULL });
    expect(p.shipTo).toEqual(FULL);
  });

  it('is nothing when none was given', async () => {
    expect((await checkPayment(BASE)).shipTo).toBeNull();
    expect((await checkPayment({ ...BASE, shipTo: {} })).shipTo).toBeNull();
    expect((await checkPayment({ ...BASE, shipTo: 'anywhere' })).shipTo).toBeNull();
  });

  it('is nothing when it is only half an address', async () => {
    // A street with no town is not somewhere a parcel can go, and showing it
    // to whoever is packing as though it were would be worse than silence.
    const half = await checkPayment({ ...BASE, shipTo: { line1: '1601 Main St' } });
    expect(half.shipTo).toBeNull();

    const noPostcode = await checkPayment({
      ...BASE,
      shipTo: { line1: '1601 Main St', city: 'Springfield' },
    });
    expect(noPostcode.shipTo).toBeNull();
  });

  it('does not need the optional parts', async () => {
    const p = await checkPayment({
      ...BASE,
      shipTo: { line1: '1601 Main St', city: 'Springfield', postcode: '01103' },
    });
    expect(p.shipTo).toEqual({
      line1: '1601 Main St',
      line2: undefined,
      city: 'Springfield',
      region: '',
      postcode: '01103',
      country: 'United States',
    });
  });

  it('trims what was typed and will not take an essay', async () => {
    const p = await checkPayment({
      ...BASE,
      shipTo: { line1: '  1601 Main St  ', city: ' Springfield ', postcode: ' 01103 ', region: 'x'.repeat(200) },
    });
    expect(p.shipTo?.line1).toBe('1601 Main St');
    expect(p.shipTo?.city).toBe('Springfield');
    expect(p.shipTo?.region).toHaveLength(80);
  });

  it('reads back as one line for an email or a note', () => {
    expect(formatShipTo(FULL)).toBe('1601 Main St, Unit 4, Springfield, MA, 01103, United States');
    expect(
      formatShipTo({ line1: '1601 Main St', city: 'Springfield', region: '', postcode: '01103', country: 'United States' })
    ).toBe('1601 Main St, Springfield, 01103, United States');
  });

  it('leaves the rest of the payment alone', async () => {
    const p = await checkPayment({ ...BASE, customerName: 'Amber', shipTo: FULL });
    expect(p.invoiceNumber).toBe('INV-2291');
    expect(p.amount).toBe(120);
    expect(p.customerName).toBe('Amber');
  });
});
