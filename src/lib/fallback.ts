/**
 * Holding on to the last good answer to a question the whole site asks.
 *
 * Plain functions over plain values: no database, no request, nothing from
 * the framework. The site needs its own name, its menus and its collection
 * list to draw any page at all, and those three reads sit in front of every
 * other thing a page does. If one of them fails the page has nothing to draw
 * — so rather than fail with it, the answer from a minute ago is used, and
 * the built-in defaults only when there has never been one.
 *
 * This is deliberately not a cache: it does not expire, hold more than one
 * answer per question, or serve anything while a read is succeeding. It is
 * the floor under the cache in lib/cache.ts.
 */

export type Read<T> = () => Promise<T>;

const held = new Map<string, unknown>();

/**
 * Wraps a read so that a failure returns the last answer it gave instead of
 * throwing. The wrapped read must be the one that talks to the database, and
 * the cache must sit inside it — a failure that got cached would freeze the
 * site on its defaults long after the database came back.
 */
export function lastGood<T>(
  name: string,
  read: Read<T>,
  fallback: T,
  report: (message: string, err: unknown) => void = console.error
): Read<T> {
  return async () => {
    try {
      const value = await read();
      held.set(name, value);
      return value;
    } catch (err) {
      const kept = held.get(name) as T | undefined;
      // Said out loud every time: a site quietly running on its defaults
      // looks like a content problem and gets debugged as one.
      report(
        `[${name}] could not be read; using ${
          kept === undefined ? 'the built-in defaults' : 'the last good answer'
        }.`,
        err
      );
      return kept === undefined ? fallback : kept;
    }
  };
}

/** What is being held for a question, if anything. For tests. */
export function heldFor<T>(name: string): T | undefined {
  return held.get(name) as T | undefined;
}

/** Forgets everything held. For tests. */
export function forgetHeld() {
  held.clear();
}
