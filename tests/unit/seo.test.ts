import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  breadcrumbLd,
  echoesTitle,
  pageDescription,
  pageTitle,
  plainText,
  productDescription,
} from '@/lib/seo';

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

describe('text taken out of markup', () => {
  it('keeps the words and loses the tags', () => {
    expect(plainText('<p>Crew neck <b>jersey</b></p>')).toBe('Crew neck jersey');
  });

  it('puts long whitespace back to one space', () => {
    expect(plainText('  Crew \n\n  neck   jersey  ')).toBe('Crew neck jersey');
  });

  it('reads nothing as nothing', () => {
    expect(plainText(null)).toBe('');
    expect(plainText(undefined)).toBe('');
  });
});

describe('a description built for a product', () => {
  const jersey = {
    title: 'Crew Neck Jerseys Fully customizable Design #10',
    subtitle: null,
    sports: ['Baseball', 'Softball', 'Other'],
    from: 20,
  };

  it('leads with the product, so no two are the same', () => {
    const one = productDescription(jersey);
    const two = productDescription({ ...jersey, title: 'Backpack Design #5' });
    expect(one).toContain('Crew Neck Jerseys Fully customizable Design #10');
    expect(two).toContain('Backpack Design #5');
    expect(one).not.toBe(two);
  });

  it('names the sports it is sold for', () => {
    expect(productDescription(jersey)).toContain('baseball and softball');
  });

  it('does not print "other", which is what nobody chose', () => {
    // Every product defaults to Baseball, Softball and Other, and "custom
    // baseball, softball and other kit" reads like a half-filled form.
    expect(productDescription(jersey)).not.toMatch(/\bother\b/i);
    expect(productDescription({ ...jersey, sports: ['Other'] })).toContain('custom team kit');
  });

  it('quotes the bottom of the price ladder', () => {
    expect(productDescription(jersey)).toContain('From $20 each.');
  });

  it('says nothing about price when the product shows none', () => {
    const quiet = productDescription({ ...jersey, from: null });
    expect(quiet).not.toMatch(/\$/);
    expect(quiet).toMatch(/names and numbers/i);
  });

  it('gets the whole pitch in when the name leaves room', () => {
    const short = productDescription({ ...jersey, title: 'Pinstripe jersey' });
    expect(short).toMatch(/names and numbers/i);
    expect(short).toContain('From $20 each.');
    expect(short).toMatch(/mockup/i);
    expect(short.length).toBeLessThanOrEqual(158);
  });

  it('fits in a search result, and ends on a full stop', () => {
    const long = productDescription({
      ...jersey,
      title: 'Sublimated Two-Button Baseball Jersey With Piping And Contrast Sleeves, Design #14',
    });
    expect(long.length).toBeLessThanOrEqual(158);
    expect(long.endsWith('.')).toBe(true);
    // Trimmed by dropping whole promises, never by cutting one in half.
    expect(long).not.toMatch(/…$/);
  });

  it('is long enough to be worth showing', () => {
    expect(productDescription(jersey).length).toBeGreaterThan(110);
  });

  it('keeps a short subtitle, which is the one line written about it', () => {
    const withSub = productDescription({ ...jersey, subtitle: 'Two-button placket, piped sleeves' });
    expect(withSub).toContain('Two-button placket, piped sleeves.');
  });
});

describe('a description that is only the name again', () => {
  it('is recognised, however it was punctuated', () => {
    expect(echoesTitle('Backpacks Design #1 - Fully Customizable', 'Backpacks Design #1  - Fully Customizable')).toBe(true);
    expect(echoesTitle('backpacks design 1 fully customizable', 'Backpacks Design #1 - Fully Customizable')).toBe(true);
  });

  it('is recognised when it is the name plus a word or two', () => {
    expect(echoesTitle('Crew Neck Jerseys', 'Crew Neck Jerseys Fully customizable Design #10')).toBe(true);
  });

  it('leaves a real sentence alone', () => {
    expect(
      echoesTitle(
        'A two-button placket and piped sleeves, cut for a full season of play.',
        'Crew Neck Jerseys Design #10'
      )
    ).toBe(false);
  });

  it('says nothing about an empty one either way', () => {
    expect(echoesTitle('', 'Anything')).toBe(false);
    expect(echoesTitle('Anything', '')).toBe(false);
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

describe('the site address used to build every other address', () => {
  // SITE_URL is read once when the module loads, so each case needs a fresh
  // import rather than just a changed variable.
  const load = async (value?: string) => {
    vi.resetModules();
    if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = value;
    return (await import('@/lib/seo')).siteBase();
  };

  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it('drops a trailing slash, so nothing ends up with two', async () => {
    expect(await load('https://design-sportswear.com/')).toBe('https://design-sportswear.com');
  });

  it('drops several, because a variable set by hand can carry more than one', async () => {
    expect(await load('https://design-sportswear.com///')).toBe('https://design-sportswear.com');
  });

  it('leaves an address that was already clean alone', async () => {
    expect(await load('https://design-sportswear.com')).toBe('https://design-sportswear.com');
  });

  it('still gives something usable when the variable is unset', async () => {
    expect(await load(undefined)).toBe('http://localhost:3000');
  });

  it('builds a sitemap address with one slash in it', async () => {
    const base = await load('https://design-sportswear.com/');
    expect(`${base}/sitemap.xml`).toBe('https://design-sportswear.com/sitemap.xml');
  });
});
