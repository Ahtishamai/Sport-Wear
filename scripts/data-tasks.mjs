/**
 * One-off changes to the live data, made by the deploy itself.
 *
 * The shop is deployed from hPanel (NPM Install → NPM Build → Restart) with
 * no shell, so a script that has to run against the live database cannot be
 * run by hand. `npm run build` calls this first instead. Every task here:
 *
 *   - checks for itself whether it is already done, so running on every
 *     deploy costs a query or two and changes nothing once it has run;
 *   - can never fail the build. A deploy that cannot reach the database, or a
 *     task that throws, is logged and skipped — the site still ships, and the
 *     task simply runs again on the next deploy.
 *
 * When a task did change something, the cached database reads under
 * .next/cache/fetch-cache are thrown away, because Next keeps them across
 * builds: otherwise menus and the collection list would go on showing the old
 * data for up to half an hour after the deploy.
 *
 * Once a task has run on the live site, its line below can be deleted.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const TASKS = [
  {
    name: 'split the jerseys page into baseball and softball',
    file: 'scripts/split-jersey-collections.mjs',
    args: ['--apply', '--once'],
  },
  {
    name: 'list softball jerseys right under baseball jerseys',
    file: 'scripts/order-jersey-collections.mjs',
    args: ['--apply'],
  },
  {
    name: 'DTF pinstripe uniforms landing page',
    file: 'scripts/make-landing-pages.mjs',
    args: ['--apply'],
  },
  {
    name: 'sell every pinstripe uniform online',
    file: 'scripts/sell-pinstripes-online.mjs',
    args: ['--apply'],
  },
  {
    name: 'price the pinstripe uniforms on the shirt list',
    file: 'scripts/price-pinstripes-like-shirts.mjs',
    args: ['--apply'],
  },
  {
    name: 'offer YXL wherever youth sizes are offered',
    file: 'scripts/add-youth-xl-size.mjs',
    args: ['--apply'],
  },
  {
    name: 'the size chart page, and Size Chart in the menu',
    file: 'scripts/size-chart-page.mjs',
    args: ['--apply'],
  },
];

let changed = false;

for (const task of TASKS) {
  console.log(`\n[data-tasks] ${task.name}`);
  try {
    const res = spawnSync(process.execPath, ['-r', 'dotenv/config', task.file, ...task.args], {
      encoding: 'utf8',
      timeout: 120_000,
    });
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`exited with ${res.status}`);
    if (/^DATA_CHANGED$/m.test(res.stdout ?? '')) changed = true;
  } catch (err) {
    console.error(`[data-tasks] skipped "${task.name}": ${err?.message ?? err}`);
  }
}

if (changed) {
  try {
    rmSync('.next/cache/fetch-cache', { recursive: true, force: true });
    console.log('\n[data-tasks] data changed — cleared the cached database reads');
  } catch {
    /* a cache that could not be cleared refreshes itself within half an hour */
  }
}

console.log('[data-tasks] done\n');
// Always succeed: nothing here is worth failing a deploy over.
process.exit(0);
