import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));
const stub = (name: string) => fileURLToPath(new URL(`./tests/stubs/${name}`, import.meta.url));

/**
 * The suite that runs anywhere.
 *
 * Everything under tests/unit is arithmetic and wording — no database, no
 * server, no browser — so it runs on a laptop with no .env and on a build
 * machine that has never heard of this shop. The checks that need a real
 * server live in tests/live and are run by hand; see tests/README.md.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    env: {
      NEXT_PUBLIC_SITE_URL: 'https://design-sportswear.com',
      // Nothing here talks to a database. This is only so that the Prisma
      // client can be constructed by a module a test happens to import.
      DATABASE_URL: 'mysql://nobody:nothing@127.0.0.1:3306/none',
    },
    alias: [
      { find: /^@\//, replacement: src + '/' },
      // `server-only` exists to throw when it is imported anywhere but a
      // server component, and a test is neither.
      { find: /^server-only$/, replacement: stub('server-only.ts') },
      // A unit test has no request, so reading a cookie is a mistake rather
      // than something worth simulating. The stub says so out loud.
      { find: /^next\/headers$/, replacement: stub('next-headers.ts') },
    ],
  },
});
