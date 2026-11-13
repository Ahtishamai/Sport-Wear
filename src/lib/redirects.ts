/**
 * Matching an address nobody answers to the address that should answer it.
 *
 * Plain functions over plain values: no database, no request. A redirect is
 * only ever consulted after the site has failed to find the page itself, so
 * nothing here can take a working page off the site — the worst a wrong rule
 * can do is send a visitor who was already lost to the wrong place.
 */

export type RedirectKind = 'PERMANENT' | 'TEMPORARY';

/** A rule as the database holds it. */
export type RedirectRule = {
  from: string;
  to: string;
  kind: RedirectKind;
};

/**
 * A rule with nowhere to send anybody means the address is gone for good.
 *
 * It is stored as an empty target rather than a third kind, because the kind
 * column is a database enum and adding to it needs a migration run against a
 * live shop. An empty target was already meaningless — a rule that sent
 * visitors nowhere was simply ignored — so the one spare state the data
 * already had is the one being used.
 *
 * Gone means 410: the page existed, it is not coming back, and a search
 * engine should drop it rather than keep asking. That is the difference
 * between it and the 404 every other unknown address gets.
 */
export function isGoneRule(rule: { to?: string | null }): boolean {
  return !String(rule?.to ?? '').trim();
}

/** A rule whose `from` ends in this matches everything below it. */
const STAR = '/*';

/**
 * The one form an address is both stored and matched in.
 *
 * Addresses reach us spelled every way a person or a mail client can manage
 * them — with a host in front, a tracking query on the end, a capital letter,
 * a double slash, a trailing slash. All of those are the same page, so all of
 * them have to become the same string before anything is compared, or a rule
 * works from the browser bar and not from the email that sent them.
 */
export function normalizePath(raw: string | null | undefined): string {
  let v = String(raw ?? '').trim();
  if (!v) return '/';

  // A whole address may be pasted in; keep the path and drop the host.
  const absolute = v.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([/?#].*)?$/i);
  if (absolute) v = absolute[1] ?? '/';

  v = v.split('#')[0].split('?')[0];

  // %20 and a space are the same address. A half-written escape is not worth
  // failing over, so a bad sequence is left as it was typed.
  try {
    v = decodeURI(v);
  } catch {
    /* keep it as given */
  }

  v = v.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  if (!v.startsWith('/')) v = '/' + v;
  v = v.toLowerCase();
  if (v.length > 1) v = v.replace(/\/+$/, '');
  return v || '/';
}

/** True for a target that leaves this site. */
export function isExternal(to: string): boolean {
  return /^https?:\/\//i.test(String(to ?? '').trim());
}

/**
 * Tidies where a rule points.
 *
 * Unlike the address being matched, a target keeps its case and its query —
 * `/collections?sort=new` and a name in a tracking parameter both have to
 * survive — so it is only trimmed and given the leading slash it may be
 * missing.
 */
export function normalizeTarget(raw: string | null | undefined): string {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if (isExternal(v)) return v;
  return ('/' + v.replace(/\\/g, '/').replace(/^\/+/, '')).replace(/([^:])\/{2,}/g, '$1/');
}

const starPrefix = (from: string) => from.slice(0, -STAR.length) || '/';

/**
 * The rule that answers this address, and where it sends it.
 *
 * An exact rule always beats a wildcard, and among wildcards the longest one
 * wins — so `/shop/jerseys/*` can be pointed somewhere of its own without
 * `/shop/*` above it getting in the way. A rule that would send an address
 * back to itself is dropped rather than returned, because the browser would
 * follow it forever.
 */
export function matchRedirect<R extends RedirectRule>(
  path: string,
  rules: R[]
): { rule: R; to: string } | null {
  const hit = ruleFor(path, rules);
  if (!hit || isGoneRule(hit.rule)) return null;
  return finish(hit.rule, hit.to, normalizePath(path));
}

/** True when the rule that answers this address says it is gone for good. */
export function matchGone<R extends RedirectRule>(path: string, rules: R[]): boolean {
  const hit = ruleFor(path, rules);
  return !!hit && isGoneRule(hit.rule);
}

/**
 * The one rule that answers this address, before anything is decided about
 * what to do with it.
 *
 * An exact rule always beats a wildcard, and among wildcards the longest one
 * wins — so `/shop/jerseys/*` can be pointed somewhere of its own without
 * `/shop/*` above it getting in the way.
 */
function ruleFor<R extends RedirectRule>(path: string, rules: R[]): { rule: R; to: string } | null {
  const here = normalizePath(path);

  const exact = rules.find((r) => !r.from.endsWith(STAR) && normalizePath(r.from) === here);
  if (exact) return { rule: exact, to: exact.to };

  let best: R | null = null;
  let bestPrefix = '';
  for (const r of rules) {
    if (!r.from.endsWith(STAR)) continue;
    const prefix = normalizePath(starPrefix(r.from));
    const covers = prefix === '/' || here === prefix || here.startsWith(prefix + '/');
    if (!covers) continue;
    if (!best || prefix.length > bestPrefix.length) {
      best = r;
      bestPrefix = prefix;
    }
  }
  if (!best) return null;

  // `/old/*` → `/new/*` carries the rest of the address across; a target
  // without the star gathers everything onto one page.
  const to = best.to.endsWith(STAR)
    ? best.to.slice(0, -STAR.length) + (bestPrefix === '/' ? here : here.slice(bestPrefix.length))
    : best.to;

  return { rule: best, to };
}

function finish<R extends RedirectRule>(rule: R, rawTo: string, here: string) {
  const to = normalizeTarget(rawTo);
  if (!to) return null;
  if (!isExternal(to) && normalizePath(to) === here) return null;
  return { rule, to };
}

/**
 * Why a rule cannot be saved, in words for the person typing it.
 *
 * The two refusals that matter are the home page and the admin: a rule on
 * either would lock someone out of the site or out of the panel they would
 * need to delete it from.
 */
export function redirectProblem(rawFrom: string, rawTo: string, gone = false): string | null {
  const from = normalizePath(rawFrom);
  const to = normalizeTarget(rawTo);

  if (!String(rawFrom ?? '').trim()) return 'Type the old address this rule is for.';
  // No target is how an address is marked gone, so it is only missing when
  // the rule was meant to send somebody somewhere.
  if (!to && !gone) return 'Type where the old address should send people.';

  if (from === '/') return 'The home page cannot be redirected away from.';
  if (/^\/(admin|api)(\/|$)/.test(from)) {
    return 'Addresses under /admin and /api are the panel itself and cannot be redirected.';
  }

  if (to && !isExternal(to) && normalizePath(to) === from) {
    return 'That sends the address back to itself.';
  }
  if (rawTo.trim().endsWith(STAR) && !from.endsWith(STAR)) {
    return 'Only use /* on the right when the old address uses it too.';
  }
  if (from.length > 500 || to.length > 500) return 'That address is too long to store.';
  return null;
}
