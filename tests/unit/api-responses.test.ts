import { describe, expect, it } from 'vitest';
import { badRequest, forbidden, json, unauthorized } from '@/lib/api';

/**
 * Every answer the API gives is about one person: who is signed in, what they
 * ordered, what just changed. Next adds no cache headers of its own to a route
 * handler, and a 200 with none is one a proxy may keep and hand to the next
 * person who asks — so the helpers say so themselves.
 */
describe('an API response', () => {
  it('may not be stored by a browser or anything between', () => {
    expect(json({ customer: { email: 'coach@team.org' } }).headers.get('cache-control')).toBe(
      'private, no-store'
    );
  });

  it('says so when it is a refusal too', () => {
    expect(badRequest('No.').headers.get('cache-control')).toBe('private, no-store');
    expect(forbidden().headers.get('cache-control')).toBe('private, no-store');
    expect(unauthorized().headers.get('cache-control')).toBe('private, no-store');
  });

  it('still carries what it was asked to carry', async () => {
    const res = json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });
});
