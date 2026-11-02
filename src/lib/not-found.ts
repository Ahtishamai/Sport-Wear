import 'server-only';
import { permanentRedirect, redirect } from 'next/navigation';
import { prisma } from './db';
import { matchRedirect, normalizePath, type RedirectKind } from './redirects';

/**
 * What to do about an address the site could not answer.
 *
 * A rule is looked up only once the page itself has been looked for and not
 * found, which is the whole reason adding one cannot take a live page off the
 * site. The cost is that the answer comes out of a render the framework may
 * cache, so saving a rule also clears the cached miss for its address — see
 * the `redirects` entry in resources.ts.
 *
 * Nothing in this file reads a request header, and nothing in it may start
 * to. Every page that can 404 imports it, and merely having `next/headers` in
 * the same module was enough to make a product page fail with "changed from
 * static to dynamic at runtime" the next time it refreshed. The address is
 * always passed in — from a page's own parameters, or by the root 404, which
 * reads the header itself because it alone is never cached.
 */

export type MissingPath = { to: string; permanent: boolean };

/** The rule that answers this address, if there is one. */
export async function redirectFor(path: string): Promise<MissingPath | null> {
  const here = normalizePath(path);
  if (here === '/' || here.length > 500) return null;

  try {
    // One round trip: the address itself, plus every wildcard rule, which the
    // matcher then narrows. There are only ever a handful of wildcards.
    const rules = await prisma.redirect.findMany({
      where: { active: true, OR: [{ from: here }, { from: { endsWith: '/*' } }] },
      select: { from: true, to: true, kind: true },
    });
    const hit = matchRedirect(here, rules as { from: string; to: string; kind: RedirectKind }[]);
    return hit ? { to: hit.to, permanent: hit.rule.kind === 'PERMANENT' } : null;
  } catch (err) {
    // A database that is briefly unreachable must still leave the visitor a
    // 404 to read, rather than a crash on top of the page they could not have.
    console.error('[redirects]', err);
    return null;
  }
}

/**
 * Sends a visitor onward if a rule says where to, and otherwise returns so
 * the caller can show its 404.
 *
 * Called by every page that can fail to find what it was asked for, with the
 * address built from its own parameters rather than from a header.
 */
export async function redirectAwayIfMoved(path: string): Promise<void> {
  const moved = await redirectFor(path);
  if (moved) moved.permanent ? permanentRedirect(moved.to) : redirect(moved.to);
}

/**
 * Addresses only a vulnerability scanner asks for.
 *
 * A site on the open internet is probed for WordPress, phpMyAdmin and stray
 * config files thousands of times a week. Those are not lost visitors and no
 * redirect will ever be written for them, so counting them would bury the
 * handful of addresses that matter under noise.
 */
const PROBE =
  /(\.php\d?$|\.php[/?]|\.aspx?$|\.cgi$|\.jsp$|\.do$|\.env|\.ya?ml$|\.sql$|\.bak$|\.ini$|\.log$|\.git|\.svn|\.ds_store|wp-admin|wp-content|wp-includes|wp-login|wp-json|xmlrpc|phpmyadmin|\/vendor\/|autodiscover|owa\/|cgi-bin)/i;

/** Counts a dead end. Called by the beacon on the 404 page, nowhere else. */
export async function recordNotFound(rawPath: string, referrer: string | null) {
  const path = normalizePath(rawPath);
  if (path === '/' || path.length > 500 || PROBE.test(path)) return false;
  // A mistyped admin address is the shop owner's own slip, not a customer
  // getting lost, and no redirect will ever be written for one.
  if (/^\/(admin|api)(\/|$)/.test(path)) return false;

  const ref = referrer && referrer.length <= 500 ? referrer : null;
  await prisma.notFoundHit.upsert({
    where: { path },
    create: { path, hits: 1, referrer: ref },
    // The newest referrer is kept, and a visit with none does not erase the
    // one that told us where the bad link lives.
    update: { hits: { increment: 1 }, lastSeenAt: new Date(), ...(ref ? { referrer: ref } : {}) },
  });
  return true;
}
