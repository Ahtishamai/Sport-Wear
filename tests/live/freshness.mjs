/**
 * An edit in the admin shows on the site at once.
 *
 * The site's settings, its menus, its collection list and its redirect rules
 * are now read once and held for every page (lib/cache.ts), which is what
 * makes the place survive a crawl. The price of being wrong about it is worse
 * than a slow site: somebody changes the phone number, reloads, and sees the
 * old one. So every one of those holds is cleared by the write that makes it
 * stale, and this is the check that says so.
 *
 * Everything it changes it changes back in the finally block, and it writes
 * only to the settings row, one temporary menu link and one temporary rule.
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const { SignJWT } = req('jose');
const db = new PrismaClient();

const PORT = 3543, BASE = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

const stamp = String(Date.now()).slice(-7);
let server, log = '';
let before = null;
const madeNav = [];
const madeRules = [];

try {
  const secret = new TextEncoder().encode(
    (fs.readFileSync('.env', 'utf8').match(/^AUTH_SECRET=(.*)$/m) || [])[1]
      .replace(/^["']|["']$/g, '').trim()
  );
  const admin = await db.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, name: true, role: true },
  });
  const token = await new SignJWT({ id: admin.id, email: admin.email, name: admin.name, role: admin.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(secret);
  const adminApi = (method, p, body) =>
    fetch(BASE + '/api/admin/' + p, {
      method,
      headers: { cookie: 'ds_session=' + token, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
  });
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {}
    await sleep(1000);
  }

  const body = async (p) => (await fetch(BASE + p, { redirect: 'manual' })).text();

  // ------------------------------------------------------------- the settings
  console.log('\nA setting changed in the admin');
  // Warm the hold first: the interesting case is a value already being held,
  // not one read for the first time after the change.
  await body('/');
  await body('/cart');

  const settingsRow = await db.setting.findUnique({ where: { key: 'site' } });
  before = settingsRow?.value ?? null;
  const mark = `Updated by the freshness check ${stamp}`;
  const saved = await adminApi('POST', 'settings', { footerMeta: mark });
  check('the admin accepts the change', saved.status === 200, String(saved.status));

  const home = await body('/');
  check('the home page shows it on the next request', home.includes(mark), 'old value still shown');
  const cart = await body('/cart');
  check('  and so does a page that is never cached', cart.includes(mark), 'old value still shown');

  // ----------------------------------------------------------------- the menu
  console.log('\nA menu link added in the admin');
  const link = await adminApi('POST', 'nav', {
    menu: 'footer_company',
    label: 'Freshness ' + stamp,
    href: '/about',
    position: 99,
  });
  const linkOut = await link.json();
  if (linkOut?.item?.id) madeNav.push(linkOut.item.id);
  check('the admin accepts the link', link.status === 201, String(link.status));

  const withLink = await body('/cart');
  check('it is in the footer on the next request',
    withLink.includes('Freshness ' + stamp), 'new link missing');

  await adminApi('DELETE', 'nav/' + linkOut.item.id);
  const withoutLink = await body('/cart');
  check('and taking it away removes it at once',
    !withoutLink.includes('Freshness ' + stamp), 'deleted link still shown');
  madeNav.length = 0;

  // -------------------------------------------------------------- a dead end
  console.log('\nA redirect rule saved in the admin');
  const missing = '/freshness-' + stamp;
  const first = await fetch(BASE + missing, { redirect: 'manual' });
  check('the address is a dead end to begin with', first.status === 404, String(first.status));

  const rule = await adminApi('POST', 'redirects', { from: missing, to: '/collections', kind: 'PERMANENT' });
  const ruleOut = await rule.json();
  if (ruleOut?.item?.id) madeRules.push(ruleOut.item.id);
  check('the admin accepts the rule', rule.status === 201, String(rule.status));

  const sent = await fetch(BASE + missing, { redirect: 'manual' });
  check('the address redirects on the next request', sent.status === 308 || sent.status === 301,
    String(sent.status));
  // Next sends the Location twice on a redirect from a page render, so the
  // header reads "/collections, /collections" when the two are joined.
  check('  to where the rule says',
    (sent.headers.get('location') ?? '').endsWith('/collections'),
    String(sent.headers.get('location')));

  await adminApi('PATCH', 'redirects/' + ruleOut.item.id, { active: false });
  const stopped = await fetch(BASE + missing, { redirect: 'manual' });
  check('switching the rule off stops it at once', stopped.status === 404, String(stopped.status));

  check('no server errors in the log', !/⨯/.test(log), (log.match(/⨯.*/) ?? [''])[0]);
} finally {
  // Put everything back, whatever happened above.
  if (before) {
    await db.setting.update({ where: { key: 'site' }, data: { value: before } }).catch(() => {});
  }
  for (const id of madeNav) await db.navItem.delete({ where: { id } }).catch(() => {});
  for (const id of madeRules) await db.redirect.delete({ where: { id } }).catch(() => {});
  const left = await db.redirect.count({ where: { from: { contains: stamp } } }).catch(() => 0);
  const navLeft = await db.navItem.count({ where: { label: { contains: stamp } } }).catch(() => 0);
  console.log(`\nrestored the settings; ${left} rule(s) and ${navLeft} menu link(s) left behind`);
  if (server) server.kill();
  await db.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
