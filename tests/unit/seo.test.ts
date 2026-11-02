import { describe, expect, it } from 'vitest';
import { breadcrumbLd, pageDescription, pageTitle } from '@/lib/seo';

const SITE = 'Design Sportswear';

describe('a title that reads well in a search result', () => {
  it('puts the site name after the page’s own words', () => {
    expect(pageTitle('Baseball uniforms', SITE)).toBe('Baseball uniforms — Design Sportswear');
  });

  it('does not say the name twice', () => {
    expect(pageTitle('About Design Sportswear', SITE)).toBe('About Design Sportswear');
  });

  it('does not add a name that was already typed on the end', () => {
    expect(pageTitle('Pinstripes uniform — Design Sportswear', SITE)).toBe(
      'Pinstripes uniform — Design Sportswear'
    );
    expect(pageTitle('Pinstripes uniform | Design Sportswear', SITE)).toBe(
      'Pinstripes uniform — Design Sportswear'
    );
  });

  it('drops the site name rather than let the title be cut off', () => {
    // Google shows about 60 characters. A long page title keeps its own
    // words and loses the suffix, which is the half nobody searches for.
    const long = 'Custom sublimated baseball jerseys for travel teams';
    expect(pageTitle(long, SITE)).toBe(long);
  });

  it('tidies whitespace somebody pasted in', () => {
    expect(pageTitle('  Baseball   uniforms  ', SITE)).toBe('Baseball uniforms — Design Sportswear');
  });

  it('falls back to the site name when the field is empty', () => {
    expect(pageTitle('', SITE)).toBe(SITE);
    expect(pageTitle('   ', SITE)).toBe(SITE);
  });
});

describe('a description', () => {
  it('takes the first candidate long enough to be worth showing', () => {
    const real = 'Custom baseball and softball uniforms, made in the USA and shipped in two weeks.';
    expect(pageDescription('too short', real)).toBe(real);
  });

  it('skips a field that was left empty', () => {
    const real = 'Custom baseball and softball uniforms, made in the USA and shipped in two weeks.';
    expect(pageDescription(null, undefined, '', real)).toBe(real);
  });

  it('cuts a long one where a search result would, and marks the cut', () => {
    const out = pageDescription('x'.repeat(400));
    expect(out).toHaveLength(163);
    expect(out?.endsWith('…')).toBe(true);
  });

  it('gives nothing rather than a description too thin to help', () => {
    expect(pageDescription('short')).toBeUndefined();
    expect(pageDescription()).toBeUndefined();
  });
});

describe('the trail above a page', () => {
  it('numbers the steps and gives each a whole address', () => {
    const ld = breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Collections', path: '/collections' },
      { name: 'Baseball uniform', path: '/collections/baseball-uniform' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement[2].item).toBe(
      'https://design-sportswear.com/collections/baseball-uniform'
    );
  });
});
