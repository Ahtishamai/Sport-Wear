/**
 * Redirects and the dead-ends report through a real server.
 *
 * Nothing is POSTed to any checkout. Every rule and every recorded dead end
 * made here is removed in the finally block.
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { closeBrowser, findBrowser, shotsDir } from './shots.mjs';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const { SignJWT } = req('jose');
const db = new PrismaClient();

const PORT = 3523, CDP = 9773, BASE = 'http://127.0.0.1:' + PORT;
const SHOTS = shotsDir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

let server, edge, ws;
const madeRules = [];
const touched = [];
const madeUsers = [];
const stamp = String(Date.now()).slice(-7);

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
  let log = '';
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {}
    await sleep(1000);
  }

  // Never follow a redirect: the status and the Location are the whole point.
  const hit = (p, extra = {}) => fetch(BASE + p, { redirect: 'manual', ...extra });
  const make = async (body) => {
    const res = await adminApi('POST', 'redirects', body);
    const out = await res.json();
    if (out?.item?.id) { madeRules.push(out.item.id); touched.push(out.item.from); }
    return { status: res.status, ...out };
  };
  // The beacon the 404 page fires, called the way the browser calls it.
  const beacon = (p, from) =>
    fetch(BASE + '/api/not-found', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p, from: from ?? null }),
    }).then((r) => r.json());

  // ---------------------------------------------------------------- live pages

  console.log('\nEvery kind of page still answers');
  const live = await db.collection.findFirst({ where: { status: 'PUBLISHED' }, select: { handle: true } });
  const prods = await db.product.findMany({ where: { status: 'PUBLISHED' }, select: { handle: true }, take: 4 });
  // 'home' and the router's own names are not addresses, so pick a real one.
  const page = await db.page.findFirst({
    where: { status: 'PUBLISHED', slug: { notIn: ['home', 'collections', 'products', 'cart', 'checkout'] } },
    select: { slug: true },
  });
  for (const [name, p] of [
    ['the home page', '/'],
    ['the collections page', '/collections'],
    ['a collection', '/collections/' + live.handle],
    ['a CMS page', '/' + page.slug],
    ['robots.txt', '/robots.txt'],
    ['the sitemap', '/sitemap.xml'],
    ...prods.map((p) => ['the product ' + p.handle, '/products/' + p.handle]),
  ]) {
    const r = await hit(p);
    check(name + ' answers 200', r.status === 200, p + ' gave ' + r.status);
  }
  // A sweep rather than a sample: the change touches the miss path of every
  // route, and a collection or menu link that quietly started 404ing would be
  // exactly the kind of damage this phase is meant to prevent.
  const allCols = await db.collection.findMany({ where: { status: 'PUBLISHED' }, select: { handle: true } });
  const navLinks = await db.navItem.findMany({ select: { href: true, label: true } });
  const bad = [];
  for (const c of allCols) {
    const r = await hit('/collections/' + c.handle);
    if (r.status !== 200) bad.push(`/collections/${c.handle} -> ${r.status}`);
  }
  check(`all ${allCols.length} published collections answer 200`, bad.length === 0, bad.join(', '));

  const badNav = [];
  for (const n of navLinks) {
    if (!n.href?.startsWith('/')) continue;
    const r = await hit(n.href);
    if (r.status !== 200) badNav.push(`${n.label} ${n.href} -> ${r.status}`);
  }
  check(`all ${navLinks.length} menu links answer 200`, badNav.length === 0, badNav.join(', '));

  const allProds = await db.product.findMany({ where: { status: 'PUBLISHED' }, select: { handle: true } });
  const badProd = [];
  for (const p of allProds) {
    const r = await hit('/products/' + p.handle);
    if (r.status !== 200) badProd.push(`/products/${p.handle} -> ${r.status}`);
  }
  check(`all ${allProds.length} published products answer 200`, badProd.length === 0, badProd.slice(0, 5).join(', '));

  check('no page turned dynamic at runtime',
    !/static to dynamic/i.test(log), (log.match(/.*static to dynamic.*/) ?? [''])[0]);

  // ---------------------------------------------------------------- the 404

  // The sweep leaves the server re-rendering up to a hundred pages behind
  // the requests that triggered them, and the pool is two connections wide.
  // Everything below has to render live, so wait until the server can answer
  // a missing address at all rather than judge it mid-storm.
  let settledAfter = -1;
  for (let i = 0; i < 45; i++) {
    const r = await hit('/settling-' + Date.now());
    if (r.status === 404) { settledAfter = i; break; }
    await sleep(1000);
  }
  check('the server recovers from the sweep', settledAfter >= 0,
    'still failing to answer a missing address after 45s');
  if (settledAfter > 0) console.log(`         (it took ${settledAfter}s to catch up)`);

  console.log('\nA dead end');
  const missing = '/an-address-that-never-existed-' + stamp;
  touched.push(missing);
  const r404 = await hit(missing);
  const body404 = await r404.text();
  check('an unknown address answers 404', r404.status === 404, String(r404.status));
  check('the 404 page is the site page, not the framework default',
    /not here any more/i.test(body404), body404.slice(0, 200));
  check('it carries the site header and footer',
    /Skip to content/i.test(body404) && /Request a quote/i.test(body404), 'chrome missing');
  check('it asks not to be indexed', /noindex/i.test(body404), 'no robots meta');

  const deep = '/a/made/up/path-' + stamp;
  touched.push(deep);
  const rDeep = await hit(deep);
  check('an address several segments deep answers 404 too', rDeep.status === 404, String(rDeep.status));
  check('  with the same page', /not here any more/i.test(await rDeep.text()), 'different page');

  // ---------------------------------------------------------------- the report

  console.log('\nThe report is filled by the beacon, one row per address');
  const b1 = await beacon(missing, 'https://example.com/a-page-with-a-bad-link');
  check('the beacon records the dead end', b1?.recorded === true, JSON.stringify(b1));
  await beacon(missing.toUpperCase());
  await beacon(missing + '/');
  await beacon('https://design-sportswear.com' + missing + '?utm_source=fb');
  await sleep(300);
  const row = await db.notFoundHit.findUnique({ where: { path: missing } });
  check('every spelling of it is the same address', row?.hits === 4, String(row?.hits));
  const spellings = await db.notFoundHit.count({ where: { path: { contains: stamp } } });
  check('  so it makes one row, not four', spellings === 1, String(spellings));
  check('the linking page is kept',
    row?.referrer === 'https://example.com/a-page-with-a-bad-link', String(row?.referrer));
  await beacon(missing);
  await sleep(200);
  const kept = await db.notFoundHit.findUnique({ where: { path: missing } });
  check('  and a later visit with no referrer does not erase it',
    kept?.referrer === 'https://example.com/a-page-with-a-bad-link', String(kept?.referrer));

  console.log('\nScanner probes are refused by the report, not by the site');
  for (const p of ['/wp-login.php', '/.env', '/phpmyadmin/index.php', '/.git/config', '/xmlrpc.php']) {
    touched.push(p);
    const r = await hit(p);
    const b = await beacon(p);
    const logged = await db.notFoundHit.findUnique({ where: { path: p } });
    check(`${p}: 404 to the visitor, nothing in the report`,
      r.status === 404 && b?.recorded === false && !logged,
      `${r.status}, recorded=${b?.recorded}, row=${!!logged}`);
  }
  const homeBeacon = await beacon('/');
  check('the home page can never be reported as a dead end', homeBeacon?.recorded === false,
    JSON.stringify(homeBeacon));

  // ---------------------------------------------------------------- rules

  console.log('\nA rule is checked before it is saved');
  for (const [name, body, wanted] of [
    ['the home page is refused', { from: '/', to: '/collections' }, /home page cannot be redirected/i],
    ['the panel is refused', { from: '/admin/products', to: '/collections' }, /\/admin and \/api/i],
    ['the api is refused', { from: '/api/shop/checkout', to: '/x' }, /\/admin and \/api/i],
    ['a rule onto itself is refused', { from: '/loop-me', to: '/loop-me/' }, /back to itself/i],
    ['a rule with nowhere to go is refused', { from: '/no-target', to: '  ' }, /where the old address should send/i],
    ['a lone star on the right is refused', { from: '/one', to: '/two/*' }, /only use \/\* on the right/i],
  ]) {
    const r = await make(body);
    check(name, r.status === 400 && wanted.test(r.error ?? ''), r.status + ' ' + JSON.stringify(r.error));
  }

  console.log('\nA rule is tidied as it is saved');
  const messy = await make({ from: 'HTTPS://design-sportswear.com/Old-Jerseys-' + stamp + '/?ref=x', to: 'collections' });
  check('the old address is reduced to the form the site matches',
    messy?.item?.from === '/old-jerseys-' + stamp, String(messy?.item?.from));
  check('  and the target is given its slash', messy?.item?.to === '/collections', String(messy?.item?.to));
  const dup = await make({ from: '/old-jerseys-' + stamp, to: '/collections' });
  check('the same old address twice is refused, and named',
    dup.status === 400 && /old address is already used/i.test(dup.error ?? ''), JSON.stringify(dup.error));

  console.log('\nA rule answers, and answers at once');
  const gone = '/jerseys-gone-' + stamp;
  touched.push(gone);
  const before = await hit(gone);
  check('the address 404s while no rule exists', before.status === 404, String(before.status));
  await make({ from: gone, to: '/collections/' + live.handle, kind: 'PERMANENT' });
  const moved = await hit(gone);
  check('the very next request is a 308, with no wait for a cache',
    moved.status === 308, String(moved.status));
  check('  and points at the new address',
    (moved.headers.get('location') ?? '').endsWith('/collections/' + live.handle),
    String(moved.headers.get('location')));

  const shouted = await hit('/JERSEYS-GONE-' + stamp);
  check('it answers a shouted address', shouted.status === 308, String(shouted.status));
  const queried = await hit(gone + '?utm_source=fb');
  check('it answers an address with a tracking tail', queried.status === 308, String(queried.status));

  const temp = '/away-for-now-' + stamp;
  touched.push(temp);
  await make({ from: temp, to: '/collections', kind: 'TEMPORARY' });
  const tempRes = await hit(temp);
  check('a temporary rule answers 307', tempRes.status === 307, String(tempRes.status));

  console.log('\nRules for the addresses the site has its own pages for');
  const goneProduct = '/products/a-product-we-stopped-making-' + stamp;
  touched.push(goneProduct);
  await make({ from: goneProduct, to: '/collections/' + live.handle });
  const pr = await hit(goneProduct);
  check('a dead product address redirects', pr.status === 308, String(pr.status));
  const goneCollection = '/collections/a-collection-we-retired-' + stamp;
  touched.push(goneCollection);
  await make({ from: goneCollection, to: '/collections' });
  const cr = await hit(goneCollection);
  check('a dead collection address redirects', cr.status === 308, String(cr.status));

  console.log('\nA wildcard rule');
  const stem = '/old-shop-' + stamp;
  touched.push(stem + '/*', stem, stem + '/bags');
  await make({ from: stem + '/*', to: '/collections/*' });
  const below = await hit(stem + '/bags');
  check('it catches an address below the stem', below.status === 308, String(below.status));
  check('  and carries the rest across',
    (below.headers.get('location') ?? '').endsWith('/collections/bags'),
    String(below.headers.get('location')));
  const deeper = await hit(stem + '/jerseys/red');
  check('it catches an address further down', deeper.status === 308, String(deeper.status));
  const stemItself = await hit(stem);
  check('it catches the stem itself', stemItself.status === 308, String(stemItself.status));

  console.log('\nA rule cannot take a live page off the site');
  await make({ from: '/collections', to: '/collections/' + live.handle });
  touched.push('/collections');
  check('the real collections page still answers', (await hit('/collections')).status === 200);
  await make({ from: '/products/' + prods[0].handle, to: '/collections' });
  touched.push('/products/' + prods[0].handle);
  check('the real product page still answers', (await hit('/products/' + prods[0].handle)).status === 200);
  await make({ from: '/' + page.slug, to: '/collections' });
  touched.push('/' + page.slug);
  check('the real CMS page still answers', (await hit('/' + page.slug)).status === 200);
  const catchAll = await make({ from: '/*', to: '/collections' });
  touched.push('/*');
  check('even a catch-all leaves the home page alone', (await hit('/')).status === 200);
  check('  and leaves a real collection alone', (await hit('/collections/' + live.handle)).status === 200);
  check('  while still answering a dead end', (await hit('/nothing-at-all-' + stamp)).status === 308);
  // It answers everything, which would mask every check below it.
  await adminApi('DELETE', 'redirects/' + catchAll.item.id);
  check('  and once deleted, a dead end is a dead end again',
    (await hit('/nothing-at-all-two-' + stamp)).status === 404);

  console.log('\nSwitching a rule off stops it, at once');
  const off = '/switched-off-' + stamp;
  touched.push(off);
  const offRule = await make({ from: off, to: '/collections', active: false });
  check('a rule saved switched off does nothing', (await hit(off)).status === 404);
  await adminApi('PATCH', 'redirects/' + offRule.item.id, { active: true });
  check('  switching it on makes it answer', (await hit(off)).status === 308);
  await adminApi('PATCH', 'redirects/' + offRule.item.id, { active: false });
  check('  and switching it back off stops it', (await hit(off)).status === 404);
  await adminApi('DELETE', 'redirects/' + offRule.item.id);
  check('  deleting it stops it too', (await hit(off)).status === 404);

  // ---------------------------------------------------------------- admin

  console.log('\nThe report in the admin');
  const list = await (await adminApi('GET', 'not-found')).json();
  check('the report lists the dead ends', (list.items ?? []).length > 0, JSON.stringify(list).slice(0, 200));
  check('  loudest first',
    list.items.every((it, i) => i === 0 || list.items[i - 1].hits >= it.hits),
    JSON.stringify(list.items.map((i) => i.hits)));
  check('  no probe reached it',
    !list.items.some((i) => /wp-login|\.env|phpmyadmin/.test(i.path)),
    JSON.stringify(list.items.map((i) => i.path)).slice(0, 200));

  await beacon(gone);
  await sleep(200);
  const covered = await (await adminApi('GET', 'not-found?ignored=1')).json();
  const coveredRow = covered.items.find((i) => i.path === gone);
  check('an address that already has a rule is marked as redirected',
    coveredRow?.covered === true, JSON.stringify(coveredRow));

  const target = list.items.find((i) => i.path === missing);
  const ign = await (await adminApi('POST', 'not-found', { action: 'ignore', id: target.id })).json();
  check('a row can be marked dealt with', ign?.item?.ignored === true, JSON.stringify(ign));
  const hidden = await (await adminApi('GET', 'not-found')).json();
  check('  and then leaves the list', !hidden.items.some((i) => i.path === missing), 'still listed');
  check('  while still being counted', hidden.ignoredCount >= 1, String(hidden.ignoredCount));
  const shown = await (await adminApi('GET', 'not-found?ignored=1')).json();
  check('  and can be shown again', shown.items.some((i) => i.path === missing), 'not shown');
  await adminApi('POST', 'not-found', { action: 'unignore', id: target.id });

  const searched = await (await adminApi('GET', 'not-found?q=an-address-that-never')).json();
  check('the report can be searched',
    searched.items.length === 1 && searched.items[0].path === missing,
    JSON.stringify(searched.items.map((i) => i.path)));

  const del = await (await adminApi('POST', 'not-found', { action: 'delete', id: target.id })).json();
  check('a row can be forgotten outright', del?.ok === true, JSON.stringify(del));
  const afterDel = await db.notFoundHit.findUnique({ where: { path: missing } });
  check('  and is really gone, not in Trash', !afterDel, 'still there');

  console.log('\nAn editor without the settings area cannot reach any of it');
  // A real account: the server reads the role back from the database, so a
  // forged token claiming EDITOR would still be served as the admin it names.
  const editor = await db.user.create({
    data: {
      email: `redirect-test-${stamp}@example.invalid`,
      name: 'Redirect test editor',
      passwordHash: 'x',
      role: 'EDITOR',
      permissions: ['orders'],
    },
    select: { id: true, email: true, name: true, role: true },
  });
  madeUsers.push(editor.id);
  const editorToken = await new SignJWT(
    { id: editor.id, email: editor.email, name: editor.name, role: editor.role }
  ).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(secret);
  for (const [name, p] of [['the report', 'not-found'], ['the rules', 'redirects']]) {
    const r = await fetch(BASE + '/api/admin/' + p, { headers: { cookie: 'ds_session=' + editorToken } });
    check(`${name} is refused`, r.status === 403, String(r.status));
  }
  const canOrders = await fetch(BASE + '/api/admin/quotes', { headers: { cookie: 'ds_session=' + editorToken } });
  check('  while the area they do have still opens', canOrders.status === 200, String(canOrders.status));
  for (const [name, p] of [['the report', 'not-found'], ['the rules', 'redirects']]) {
    const r = await fetch(BASE + '/api/admin/' + p);
    check(`${name} is refused to a stranger`, r.status === 401, String(r.status));
  }

  console.log('\nA discount code can be deleted again');
  const code = 'TRASHTEST' + stamp.slice(-5);
  const made = await (await adminApi('POST', 'discounts', { code, kind: 'PERCENT', value: 5, scope: 'ALL' })).json();
  const dres = await adminApi('DELETE', 'discounts/' + made.item.id);
  const dout = await dres.json();
  check('deleting a code moves it to Trash, rather than refusing',
    dres.status === 200 && !!dout?.trashed, dres.status + ' ' + JSON.stringify(dout).slice(0, 200));
  if (dout?.trashed?.id) {
    const restored = await (await adminApi('POST', 'trash', { action: 'restore', id: dout.trashed.id })).json();
    check('  and can be restored from there', restored?.ok === true, JSON.stringify(restored).slice(0, 200));
    await adminApi('DELETE', 'discounts/' + made.item.id).then((r) => r.json()).then((o) =>
      o?.trashed?.id ? adminApi('POST', 'trash', { action: 'purge', id: o.trashed.id }) : null
    );
  }
  await db.discount.deleteMany({ where: { code } });

  // ---------------------------------------------------------------- the look

  const profile = mkdtempSync(path.join(tmpdir(), 'edge-404-'));
  edge = spawn(findBrowser(),
    ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
     '--remote-debugging-port=' + CDP, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 80; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + CDP + '/json/list')).json();
      const p = l.find((t) => t.type === 'page');
      if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(200);
  }
  ws = new WebSocket(wsUrl);
  await new Promise((res) => (ws.onopen = res));
  let msgId = 0;
  const pend = new Map();
  const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params).slice(0, 200));
  };
  const send = (method, params = {}) =>
    new Promise((res) => { const i = ++msgId; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) =>
    (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.result?.value;
  const waitFor = async (expr, ms = 20000) => {
    for (let t = 0; t < ms; t += 300) { if (await ev(expr)) return true; await sleep(300); }
    return false;
  };
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('\nThe 404 page as a visitor sees it');
  const look = '/a-page-that-is-gone-' + stamp;
  touched.push(look);
  for (const [label, w, h] of [['desktop', 1440, 1100], ['phone', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: 1, mobile: label === 'phone' });
    await send('Page.navigate', { url: BASE + look + (label === 'phone' ? '?x=1' : '') });
    await waitFor(`!!document.querySelector('h1')`);
    await sleep(1500);
    const text = await ev('document.body.textContent');
    check(`${label}: the heading reads as a 404`, /not here any more/i.test(text ?? ''), String(text).slice(0, 150));
    check(`${label}: there is a way onward`,
      /Browse everything we make/i.test(text ?? '') && /Request a quote/i.test(text ?? ''),
      String(text).slice(0, 250));
    check(`${label}: it prints the address asked for`,
      (text ?? '').includes(look), 'address not shown');
    check(`${label}: the footer is there`,
      /Design Sportswear/i.test(text ?? '') && /\u00a9|rights/i.test(text ?? ''), 'no footer');
    const overflow = await ev('document.documentElement.scrollWidth - window.innerWidth');
    check(`${label}: nothing hangs off the side`, Number(overflow) <= 1, 'overflow ' + overflow);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, `404-${label}.png`), Buffer.from(shot.result.data, 'base64'));
  }

  await sleep(800);
  const beaconed = await db.notFoundHit.findUnique({ where: { path: look } });
  check('a real browser visit reached the report', !!beaconed, 'the beacon did not fire');
  check('  counted once per visit, not once per render', beaconed?.hits === 2, String(beaconed?.hits));

  console.log('\nThe quote form still opens from the 404 page');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE + look + '?q=1' });
  await waitFor(`!!document.querySelector('h1')`);
  await sleep(1200);
  await ev(`[...document.querySelectorAll('button')].find(b => /Request a quote/i.test(b.textContent))?.click()`);
  await sleep(1200);
  const opened = await ev(`/Tell us|team|quote/i.test(document.body.textContent) && !!document.querySelector('form')`);
  check('the quote drawer opens', opened === true, String(opened));

  console.log('\nThe admin screens');
  await send('Network.enable');
  await send('Network.setCookie', { name: 'ds_session', value: token, domain: '127.0.0.1', path: '/' });
  for (const [label, url, want] of [
    ['dead-ends', '/admin/not-found', /Dead ends/i],
    ['redirects', '/admin/redirects', /Redirects/i],
  ]) {
    await send('Page.navigate', { url: BASE + url });
    await waitFor(`!!document.querySelector('h1')`);
    await waitFor(`!/Reading the report|Loading/i.test(document.body.textContent)`, 15000);
    await sleep(2500);
    const text = await ev('document.body.textContent');
    check(`the ${label} screen opens`, want.test(text ?? ''), String(text).slice(0, 150));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, `admin-${label}.png`), Buffer.from(shot.result.data, 'base64'));
  }

  // Back to the report, and mend a dead end the way the shop owner would.
  await send('Page.navigate', { url: BASE + '/admin/not-found' });
  await waitFor(`document.body.textContent.includes(${JSON.stringify(look)})`, 20000);
  check('the dead ends are on screen', true);
  const clicked = await ev(`(() => {
    const cells = [...document.querySelectorAll('tr')];
    const row = cells.find(r => r.textContent.includes(${JSON.stringify(look)}));
    if (!row) return 'no row';
    const b = [...row.querySelectorAll('button')].find(b => /Redirect it/i.test(b.textContent));
    if (!b) return 'no button';
    b.click(); return 'clicked';
  })()`);
  check('the row offers to redirect it', clicked === 'clicked', String(clicked));
  await sleep(600);
  await ev(`(() => {
    const i = document.querySelector('input[placeholder^="/collections"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, '/collections'); i.dispatchEvent(new Event('input', { bubbles: true }));
    [...i.closest('tr').querySelectorAll('button')].find(b => /^Save/.test(b.textContent)).click();
    return true; })()`);
  await sleep(2500);
  const ruleMade = await db.redirect.findUnique({ where: { from: look } });
  check('mending it from the report writes the rule', !!ruleMade, 'no rule written');
  if (ruleMade) madeRules.push(ruleMade.id);
  const nowMoved = await hit(look);
  check('  and the address redirects from the next request', nowMoved.status === 308, String(nowMoved.status));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, 'admin-dead-ends-mended.png'), Buffer.from(shot.result.data, 'base64'));

  check('no browser errors', errors.length === 0, errors.join(' | '));
  check('no server errors in the log',
    !/⨯|static to dynamic/.test(log),
    (log.match(/.*(⨯|static to dynamic).*/) ?? [''])[0]);
} catch (e) {
  fail++;
  console.log('  ERROR ' + e.stack);
} finally {
  try { ws?.close(); } catch {}
  // The browser is a tree of processes; closing the one we started would
  // leave the rest holding memory. See shots.mjs.
  try { closeBrowser(edge); } catch {}
  try { server?.kill(); } catch {}
  try {
    if (madeUsers.length) await db.user.deleteMany({ where: { id: { in: madeUsers } } });
    const n = await db.redirect.deleteMany({ where: { id: { in: madeRules } } });
    const n2 = await db.notFoundHit.deleteMany({
      where: { OR: [{ path: { in: touched } }, { path: { contains: stamp } }] },
    });
    console.log(`\ncleaned up ${n.count} rule(s) and ${n2.count} recorded dead end(s)`);
    console.log(`${await db.redirect.count()} rule(s) and ${await db.notFoundHit.count()} report row(s) remain`);
  } catch (e) {
    console.log('CLEANUP FAILED ' + e.message);
  }
  await db.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
