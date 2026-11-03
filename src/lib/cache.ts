import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { lastGood, type Read } from './fallback';

/**
 * The reads every page makes, made once instead of once per page.
 *
 * The host's binding limit is new database connections per hour, not how many
 * can be open at once, so the pool is deliberately two connections wide (see
 * `npm run db:limits`). Two connections can serve a great many pages — but
 * only if a page does not ask the same three or four questions every other
 * page has already asked. Before this, drawing any page that cannot be cached
 * whole — a dead end, the cart, the checkout — cost four queries before the
 * page itself had done anything, and a crawler sweeping the catalogue could
 * empty the pool for longer than its own timeout. Fifty dead ends at once
 * then answered 500 rather than 404.
 *
 * What is cached here is only what is the same for every visitor: the site
 * settings, the menus, the collection list and the redirect rules. Nothing
 * about a person, an order or a cart is ever cached, anywhere.
 */

/** The tag a resource's readers depend on, and its writers clear. */
export const resourceTag = (resource: string) => `res:${resource}`;

/**
 * Throws away what was read from these resources. Called by every admin write
 * beside the `revalidatePath` that clears the rendered pages — one clears the
 * page, this clears the answers the page was drawn from.
 */
export function bustResource(...resources: string[]) {
  for (const resource of resources) {
    try {
      revalidateTag(resourceTag(resource));
    } catch {
      /* Clearing a cache is best-effort; the safety net below catches a miss. */
    }
  }
}

/**
 * A missed tag heals itself within half an hour. Every write clears its own
 * tag, so this is not how freshness is kept — it is there so that a write
 * path nobody remembered to wire up is a slow answer rather than a wrong one
 * forever.
 */
const SAFETY_NET = 1800;

/**
 * One answer, shared by every page, for as long as it stays true.
 *
 * The order of the three layers matters. The database read is innermost, so
 * only an answer that actually came back is stored. The cache is next, keyed
 * by name and cleared by tag. The fallback is outermost, so a read that fails
 * — including one that fails while the cache is cold — is answered from the
 * last good value rather than cached as the new truth.
 */
export function shared<T>(
  name: string,
  dependsOn: string[],
  read: Read<T>,
  fallback: T
): Read<T> {
  const cached = unstable_cache(read, ['shared', name], {
    tags: dependsOn.map(resourceTag),
    revalidate: SAFETY_NET,
  });
  return lastGood(name, cached, fallback);
}
