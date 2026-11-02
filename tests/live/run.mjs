/**
 * Runs the live checks, one after another.
 *
 * Each one is a separate process on a port of its own: they boot a real
 * server against the real database, drive it over HTTP, and clean up after
 * themselves. They are run by hand before a release, not on every push — a
 * build machine has no database and no browser, which is why the suite that
 * does run on every push lives in tests/unit.
 *
 *   npm run test:live              every check
 *   npm run test:live accounts     one of them
 *
 * Nothing here ever POSTs to a checkout: that takes real money through
 * PayPal. Cart pricing is quoted with PUT, which only prices.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const ALL = ['redirects', 'discounts', 'accounts', 'keep-order'];

const asked = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const unknown = asked.filter((a) => !ALL.includes(a));
if (unknown.length) {
  console.error(`No such check: ${unknown.join(', ')}. There is ${ALL.join(', ')}.`);
  process.exit(2);
}
const checks = asked.length ? asked : ALL;

if (!existsSync('.next')) {
  console.error('There is no build to serve. Run `npm run build` first.');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run this through `npm run test:live`, which loads .env.');
  process.exit(2);
}

const results = [];
for (const name of checks) {
  console.log(`\n${'='.repeat(60)}\n  ${name}\n${'='.repeat(60)}`);
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [`tests/live/${name}.mjs`], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (c) => resolve(c ?? 1));
    child.on('error', (err) => {
      console.error(String(err));
      resolve(1);
    });
  });
  results.push({ name, code });
}

console.log(`\n${'='.repeat(60)}`);
for (const r of results) console.log(`  ${r.code === 0 ? 'passed' : 'FAILED'}  ${r.name}`);
const bad = results.filter((r) => r.code !== 0).length;
console.log(`${bad ? bad + ' of ' + results.length + ' failed' : 'all ' + results.length + ' passed'}`);
process.exit(bad ? 1 : 0);
