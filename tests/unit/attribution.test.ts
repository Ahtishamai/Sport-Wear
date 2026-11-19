import { describe, expect, it } from 'vitest';
import { cleanAttribution } from '@/lib/attribution';

/**
 * What a lead's ad source is stored as.
 *
 * The browser sends it, so it is a claim: only the known campaign keys and a
 * landing path survive, each cut short, and anything malformed is dropped
 * rather than failing the lead it came with.
 */
describe('cleanAttribution', () => {
  it('keeps the campaign tags and the Google Ads click id', () => {
    const raw = JSON.stringify({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'baseball-jerseys',
      gclid: 'Cj0KCQiA',
      landing: '/lp/custom-baseball-jerseys',
    });
    expect(cleanAttribution(raw)).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'baseball-jerseys',
      gclid: 'Cj0KCQiA',
      landing: '/lp/custom-baseball-jerseys',
    });
  });

  it('drops keys it does not know, and values that are not text', () => {
    const raw = JSON.stringify({ gclid: 'abc', admin: 'yes', utm_term: 42, utm_source: '  ' });
    expect(cleanAttribution(raw)).toEqual({ gclid: 'abc' });
  });

  it('cuts a long value rather than storing it whole', () => {
    const out = cleanAttribution(JSON.stringify({ utm_content: 'x'.repeat(1000) }));
    expect(out?.utm_content).toHaveLength(300);
  });

  it('answers null for nothing, for junk, and for an empty object', () => {
    expect(cleanAttribution('')).toBeNull();
    expect(cleanAttribution('not json')).toBeNull();
    expect(cleanAttribution('[1,2]')).toBeNull();
    expect(cleanAttribution('{}')).toBeNull();
  });
});
