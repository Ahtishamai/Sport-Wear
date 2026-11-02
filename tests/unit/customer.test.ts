import { describe, expect, it } from 'vitest';
import { looksLikeEmail, normalizeEmail, ordersWhere, passwordProblem } from '@/lib/customer';

describe('reading an address somebody signed up with', () => {
  it('does not care about case or stray spaces', () => {
    expect(normalizeEmail('  Coach@Team.ORG ')).toBe('coach@team.org');
  });

  it('reads nothing as nothing', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('stops at the length the column holds', () => {
    expect(normalizeEmail('a'.repeat(200) + '@team.org')).toHaveLength(160);
  });

  it('knows an address from something that only looks like one', () => {
    expect(looksLikeEmail('coach@team.org')).toBe(true);
    expect(looksLikeEmail('coach@team')).toBe(false);
    expect(looksLikeEmail('coach team.org')).toBe(false);
    expect(looksLikeEmail('')).toBe(false);
  });
});

describe('what a password has to clear', () => {
  it('asks only for length', () => {
    // Rules about capitals and symbols push people towards one predictable
    // shape and a sticky note. Length is what costs an attacker time.
    expect(passwordProblem('bandits season 2026')).toBeNull();
    expect(passwordProblem('12345678')).toBeNull();
  });

  it('refuses a short one', () => {
    expect(passwordProblem('short')).toBe('Use at least 8 characters.');
    expect(passwordProblem('')).toBe('Use at least 8 characters.');
  });

  it('refuses one too long to hash', () => {
    expect(passwordProblem('a'.repeat(201))).toBe('That password is too long.');
  });
});

describe('which orders an account is allowed to see', () => {
  const unverified = { id: 'c1', email: 'coach@team.org', verifiedAt: null };
  const verified = { id: 'c1', email: 'coach@team.org', verifiedAt: new Date('2026-01-01') };

  it('shows a verified account the orders it placed as a guest too', () => {
    // An order carries a name, a phone number and a home address, so the
    // address has to be proved before its history is handed over.
    expect(ordersWhere(verified)).toEqual({
      OR: [{ customerId: 'c1' }, { email: 'coach@team.org' }],
    });
  });

  it('shows an unverified account only the orders tied to it', () => {
    // Otherwise signing up with somebody else's address reads their history.
    expect(ordersWhere(unverified)).toEqual({ customerId: 'c1' });
  });
});
