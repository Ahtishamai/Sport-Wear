/**
 * What the site does when a lot of people, or one crawler, arrive at once.
 *
 * The database pool is two connections wide, because the host's binding limit
 * is new connections per hour rather than concurrent ones (npm run db:limits
 * shows the figures). So the only way to serve more pages is to ask it fewer
 * questions — and the way to know whether that is working is to make the rush
 * happen on purpose.
 *
 * Read-only: every request here is a GET, and nothing is written.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();

const PORT = 3541, BASE = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

const stamp = String(Date.now()).slice(-7);
let server, log = '';

/** Fires `n` requests at once and reports what came back. */
async function storm(label, paths) {
  const started = Date.now();
  const results = await Promise.all(
    paths.map(async (p) => {
      const t = Date.now();
      try {
        const r = await fetch(BASE + p, { redirect: 'manual' });
        return { path: p, status: r.status, ms: Date.now() - t };
      } catch (err) {
        return { path: p, status: 0, ms: Date.now() - t, err: String(err) };
      }
    })
  );
  const by = {};
  for (const r of results) by[r.status] = (by[r.status] ?? 0) + 1;
  const slowest = Math.max(...results.map((r) => r.ms));
  console.log(
    `  ${label}: ${paths.length} at once in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `— ${JSON.stringify(by)}, slowest ${(slowest / 1000).toFixed(1)}s`
  );
  return { results, by, slowest };
}

/** Pool timeouts in the server log since the last time we looked. */
let seenAt = 0;
function poolErrors() {
  const fresh = log.slice(seenAt);
  seenAt = log.length;
  return (fresh.match(/P2024|connection pool/g) ?? []).length;
}

try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
  });
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {}
    await sleep(1000);
  }

  const cols = await db.collection.findMany({ where: { status: 'PUBLISHED' }, select: { handle: true } });
  const prods = await db.product.findMany({ where: { status: 'PUBLISHED' }, select: { handle: true } });

  // ------------------------------------------------- a crawler finding nothing
  // Every one of these has to render live: there is no cached copy of an
  // address that has never existed. It is the cheapest page on the site, and
  // the one a crawler asks for most when a link somewhere has gone bad.
  console.log('\nFifty addresses that do not exist, all at once');
  const missing = Array.from({ length: 50 }, (_, i) => `/nothing-here-${stamp}-${i}`);
  const a = await storm('dead ends', missing);
  check('every one answers', (a.by['404'] ?? 0) === missing.length, JSON.stringify(a.by));
  check('  none of them fails', !a.by['500'] && !a.by['0'], JSON.stringify(a.by));
  check('  and none of them waits on the database pool', poolErrors() === 0, 'pool timeouts in the log');
  check('  the slowest is still under ten seconds', a.slowest < 10000, `${a.slowest}ms`);

  // ------------------------------------------------- the pages people shop on
  console.log('\nThe pages that always render live');
  const live = ['/cart', '/checkout', '/account/sign-in', '/pay'];
  const b = await storm('live pages', Array.from({ length: 30 }, (_, i) => live[i % live.length]));
  check('they all answer', !b.by['500'] && !b.by['0'], JSON.stringify(b.by));
  check('  with no pool timeouts', poolErrors() === 0, 'pool timeouts in the log');

  // ------------------------------------------------- a sweep, then a dead end
  // This is what actually happened: asking for every published page sets the
  // stale ones re-rendering behind the responses, and whatever has to render
  // live next is competing with all of it.
  console.log('\nEvery published page, then a dead end in the middle of it');
  const sweep = [
    '/',
    '/collections',
    ...cols.map((c) => '/collections/' + c.handle),
    ...prods.map((p) => '/products/' + p.handle),
  ];
  for (const p of sweep) await fetch(BASE + p, { redirect: 'manual' });
  console.log(`  swept ${sweep.length} addresses`);
  const c = await storm('dead ends during the sweep', Array.from({ length: 20 }, (_, i) => `/after-sweep-${stamp}-${i}`));
  check('a dead end still answers 404 while the site catches up',
    (c.by['404'] ?? 0) === 20, JSON.stringify(c.by));
  const after = poolErrors();
  check('  and nothing times out waiting for the database', after === 0, `${after} pool timeouts`);

  console.log('\nAnd afterwards');
  const bad = [];
  for (const p of sweep.slice(0, 8)) {
    const r = await fetch(BASE + p, { redirect: 'manual' });
    if (r.status !== 200) bad.push(`${p} -> ${r.status}`);
  }
  check('  and still answers after all that', bad.length === 0, bad.join(', '));
  check('no server errors in the log', !/⨯/.test(log), (log.match(/⨯.*/) ?? [''])[0]);
} finally {
  if (server) server.kill();
  await db.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
