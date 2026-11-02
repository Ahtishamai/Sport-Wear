/**
 * Stands in for the `server-only` package while tests run.
 *
 * The real one throws on import, which is exactly what it is for: it stops a
 * module that reads secrets from being pulled into the browser bundle. A test
 * is not the browser, so here it does nothing.
 */
export {};
