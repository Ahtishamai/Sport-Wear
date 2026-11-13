import { describe, expect, it } from 'vitest';
import {
  isExternal,
  isGoneRule,
  matchGone,
  matchRedirect,
  normalizePath,
  normalizeTarget,
  redirectProblem,
  type RedirectRule,
} from '@/lib/redirects';

const rule = (from: string, to: string, over: Partial<RedirectRule> = {}): RedirectRule => ({
  from,
  to,
  kind: 'PERMANENT',
  ...over,
});

/** Where an address ends up, which is the only part of a match worth asserting. */
const where = (path: string, rules: RedirectRule[]) => matchRedirect(path, rules)?.to ?? null;

describe('reading an address', () => {
  it('leaves a plain path alone', () => {
    expect(normalizePath('/baseball')).toBe('/baseball');
  });

  it('does not care about capitals', () => {
    expect(normalizePath('/Baseball-Jerseys')).toBe('/baseball-jerseys');
  });

  it('does not care about a trailing slash', () => {
    expect(normalizePath('/baseball/')).toBe('/baseball');
  });

  it('drops a query, because it is not part of the address', () => {
    expect(normalizePath('/baseball?utm_source=fb')).toBe('/baseball');
  });

  it('drops a fragment too', () => {
    expect(normalizePath('/baseball#sizes')).toBe('/baseball');
  });

  it('keeps only the path of a whole address', () => {
    expect(normalizePath('https://design-sportswear.com/baseball/')).toBe('/baseball');
  });

  it('reads a bare host as the home page', () => {
    expect(normalizePath('https://design-sportswear.com')).toBe('/');
  });

  it('adds a missing leading slash', () => {
    expect(normalizePath('baseball')).toBe('/baseball');
  });

  it('collapses double slashes', () => {
    expect(normalizePath('/shop//jerseys')).toBe('/shop/jerseys');
  });

  it('reads an escape back', () => {
    expect(normalizePath('/team%20store')).toBe('/team store');
  });

  it('treats a backslash as a slash', () => {
    expect(normalizePath('\\shop\\bags')).toBe('/shop/bags');
  });

  it('reads nothing as the home page', () => {
    expect(normalizePath('')).toBe('/');
    expect(normalizePath(null)).toBe('/');
    expect(normalizePath(undefined)).toBe('/');
  });

  it('leaves the home page as one slash', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('leaves a star alone', () => {
    expect(normalizePath('/Shop/*')).toBe('/shop/*');
  });

  it('survives a half-written escape rather than failing', () => {
    expect(normalizePath('/team%2store')).toBe('/team%2store');
  });
});

describe('reading where a rule points', () => {
  it('gives a path its slash', () => {
    expect(normalizeTarget('collections/bags')).toBe('/collections/bags');
  });

  it('keeps the case, because a target may be a real address', () => {
    expect(normalizeTarget('/Team-Store')).toBe('/Team-Store');
  });

  it('keeps a query, because a target may carry one', () => {
    expect(normalizeTarget('/collections?sort=new')).toBe('/collections?sort=new');
  });

  it('leaves a full address whole', () => {
    expect(normalizeTarget('https://example.com/x')).toBe('https://example.com/x');
  });

  it('knows an address that leaves the site', () => {
    expect(isExternal('https://example.com')).toBe(true);
    expect(isExternal('/collections')).toBe(false);
  });
});

describe('finding the rule that answers', () => {
  const rules = [
    rule('/old-jerseys', '/collections/baseball-uniform'),
    rule('/shop/*', '/collections'),
    rule('/shop/jerseys/*', '/collections/baseball-uniform/*'),
    rule('/gone', 'https://example.com/moved'),
  ];

  it('answers an exact rule', () => {
    expect(where('/old-jerseys', rules)).toBe('/collections/baseball-uniform');
  });

  it('answers through a trailing slash, capitals and a query', () => {
    expect(where('/old-jerseys/', rules)).toBe('/collections/baseball-uniform');
    expect(where('/Old-Jerseys', rules)).toBe('/collections/baseball-uniform');
    expect(where('/old-jerseys?ref=email', rules)).toBe('/collections/baseball-uniform');
  });

  it('has no answer for an address nobody wrote a rule for', () => {
    expect(where('/nothing-here', rules)).toBeNull();
  });

  it('catches everything below a wildcard', () => {
    expect(where('/shop/bags', rules)).toBe('/collections');
  });

  it('catches the stem of a wildcard itself', () => {
    expect(where('/shop', rules)).toBe('/collections');
  });

  it('lets the longest wildcard win', () => {
    expect(where('/shop/jerseys/red', rules)).toBe('/collections/baseball-uniform/red');
  });

  it('carries the rest of the address across a starred target', () => {
    expect(where('/shop/jerseys/a/b', rules)).toBe('/collections/baseball-uniform/a/b');
  });

  it('lets an exact rule beat a wildcard that also covers the address', () => {
    expect(where('/shop/jerseys', [rule('/shop/*', '/collections'), rule('/shop/jerseys', '/x')])).toBe(
      '/x'
    );
  });

  it('allows an address off the site', () => {
    expect(where('/gone', rules)).toBe('https://example.com/moved');
  });

  it('answers nothing when there are no rules at all', () => {
    expect(where('/anything', [])).toBeNull();
  });
});

describe('it cannot send an address to itself', () => {
  it('drops a rule onto itself', () => {
    expect(where('/x', [rule('/x', '/x')])).toBeNull();
  });

  it('drops one that only differs by case', () => {
    expect(where('/x', [rule('/x', '/X')])).toBeNull();
  });

  it('drops one that only differs by a slash', () => {
    expect(where('/x', [rule('/x', '/x/')])).toBeNull();
  });

  it('drops a wildcard that lands where it started', () => {
    expect(where('/shop/a', [rule('/shop/*', '/shop/*')])).toBeNull();
  });

  it('keeps a wildcard that does move', () => {
    expect(where('/shop/a', [rule('/shop/*', '/store/*')])).toBe('/store/a');
  });
});

describe('what cannot be saved', () => {
  it('accepts an ordinary rule', () => {
    expect(redirectProblem('/old', '/new')).toBeNull();
  });

  it('wants an old address', () => {
    expect(redirectProblem('', '/new')).toBe('Type the old address this rule is for.');
  });

  it('wants somewhere to send people', () => {
    expect(redirectProblem('/old', '')).toBe('Type where the old address should send people.');
  });

  it('refuses the home page, which would send the whole site away', () => {
    expect(redirectProblem('/', '/shop')).toBe('The home page cannot be redirected away from.');
  });

  it('refuses the panel and the api, which is how a bad rule gets deleted', () => {
    const said = 'Addresses under /admin and /api are the panel itself and cannot be redirected.';
    expect(redirectProblem('/admin/products', '/shop')).toBe(said);
    expect(redirectProblem('/api/shop/checkout', '/x')).toBe(said);
  });

  it('refuses a loop', () => {
    expect(redirectProblem('/old/', '/Old')).toBe('That sends the address back to itself.');
  });

  it('refuses a star on the right alone', () => {
    expect(redirectProblem('/old', '/new/*')).toBe(
      'Only use /* on the right when the old address uses it too.'
    );
  });

  it('accepts a star on both sides', () => {
    expect(redirectProblem('/old/*', '/new/*')).toBeNull();
  });

  it('refuses an address too long to store', () => {
    expect(redirectProblem('/' + 'a'.repeat(600), '/x')).toBe('That address is too long to store.');
  });
});

describe('an address that is gone for good', () => {
  const gone = (from: string) => ({ from, to: '', kind: 'PERMANENT' as const });
  const sendTo = (from: string, to: string) => ({ from, to, kind: 'PERMANENT' as const });

  it('is a rule with nowhere to send anybody', () => {
    expect(isGoneRule({ to: '' })).toBe(true);
    expect(isGoneRule({ to: '   ' })).toBe(true);
    expect(isGoneRule({ to: null })).toBe(true);
    expect(isGoneRule({ to: '/collections' })).toBe(false);
  });

  it('is found by the address it was written for', () => {
    expect(matchGone('/football', [gone('/football')])).toBe(true);
    expect(matchGone('/blog', [gone('/football')])).toBe(false);
  });

  it('is matched however the address is spelled', () => {
    const rules = [gone('/football')];
    expect(matchGone('/Football/', rules)).toBe(true);
    expect(matchGone('https://design-sportswear.com/football?utm=x', rules)).toBe(true);
  });

  it('never also looks like a redirect', () => {
    expect(matchRedirect('/football', [gone('/football')])).toBeNull();
  });

  it('can cover everything below an address', () => {
    const rules = [gone('/blog/*')];
    expect(matchGone('/blog/anything', rules)).toBe(true);
    expect(matchGone('/blog', rules)).toBe(true);
    expect(matchGone('/blogger', rules)).toBe(false);
  });

  it('loses to an exact redirect, so one page can be saved from a gone branch', () => {
    const rules = [gone('/blog/*'), sendTo('/blog/sizing', '/size-chart')];
    expect(matchGone('/blog/sizing', rules)).toBe(false);
    expect(matchRedirect('/blog/sizing', rules)?.to).toBe('/size-chart');
    expect(matchGone('/blog/old-post', rules)).toBe(true);
  });

  it('beats a wildcard redirect when it is the more exact rule', () => {
    const rules = [sendTo('/products/*', '/collections'), gone('/products/15')];
    expect(matchGone('/products/15', rules)).toBe(true);
    expect(matchRedirect('/products/15', rules)).toBeNull();
    expect(matchRedirect('/products/other', rules)?.to).toBe('/collections');
  });

  it('is accepted by the form without a destination', () => {
    expect(redirectProblem('/football', '', true)).toBeNull();
    expect(redirectProblem('/football', '')).toBe('Type where the old address should send people.');
  });

  it('still refuses the home page and the admin', () => {
    expect(redirectProblem('/', '', true)).toBe('The home page cannot be redirected away from.');
    expect(redirectProblem('/admin/users', '', true)).toContain('cannot be redirected');
  });
});
