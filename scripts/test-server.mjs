/**
 * Starts the app against the test database.
 *
 * The suites create and delete stores, orders, products and users. Run against
 * the live database that put fake orders in front of the client in their own
 * admin, so tests get their own database — see .env.test.
 *
 *   npm run test:server            # port 3399
 *   npm run test:server -- 3401    # somewhere else
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

let env;
try {
  env = readFileSync('.env.test', 'utf8');
} catch {
  console.error(
    '\n.env.test is missing. It must set DATABASE_URL to a database that is not the live one.\n'
  );
  process.exit(1);
}

const url = env
  .replace(/\r/g, '')
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))
  ?.replace(/^DATABASE_URL=/, '')
  .replace(/^"|"$/g, '')
  .trim();

if (!url) {
  console.error('\n.env.test has no DATABASE_URL.\n');
  process.exit(1);
}

// A loud guard: running the suites against production is the mistake this
// whole file exists to prevent.
const live = (() => {
  try {
    return readFileSync('.env', 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='))
      ?.replace(/^DATABASE_URL=/, '')
      .replace(/^"|"$/g, '')
      .trim();
  } catch {
    return null;
  }
})();

if (live && url === live) {
  console.error('\n.env.test points at the LIVE database. Refusing to start.\n');
  process.exit(1);
}

const port = process.argv[2] ?? '3399';
const db = url.split('/').pop()?.split('?')[0];
console.log(`\nTest server on :${port} against "${db}" (not the live database)\n`);

spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: url,
    PAYPAL_API_BASE: process.env.PAYPAL_API_BASE ?? 'http://127.0.0.1:4611',
  },
});
