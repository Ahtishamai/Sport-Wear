/**
 * Discount codes through the real admin API and the real cart pricing.
 *
 * Nothing is ever POSTed to checkout — that takes money. Pricing is a PUT,
 * which only quotes. Every code made here is deleted in the finally block.
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { findBrowser, shotsDir } from './shots.mjs';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const { SignJWT } = req('jose');
const db = new PrismaClient();

const PORT = 3517, CDP = 9769, BASE = 'http://127.0.0.1:' + PORT;
const SHOTS = shotsDir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

let server, edge, ws;
const madeCodes = [];
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
    stdio: 'ignore', env: process.env,
  });
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {}
    await sleep(1000);
  }

  // A sellable product to price against.
  const prod = await db.product.findFirst({
    where: { sellOnline: true, status: 'PUBLISHED' },
    select: { id: true, handle: true, title: true,
              collections: { select: { collection: { select: { handle: true } } } } },
  });
  const inCollection = prod.collections[0]?.collection.handle;
  console.log(`pricing against ${prod.title.replace(/\s+/g, ' ')} (in ${inCollection})`);

  const price = async (qty, code) => {
    const res = await fetch(BASE + '/api/shop/checkout', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lines: [{ productId: prod.id, quantity: qty, size: 'L', orderType: 'individual' }],
        code,
      }),
    });
    return res.json();
  };

  const make = async (body) => {
    const res = await adminApi('POST', 'discounts', body);
    const out = await res.json();
    if (res.ok && out.item?.code) madeCodes.push(out.item.code);
    return { status: res.status, out };
  };

  console.log('\nMaking codes in the admin');
  let r = await make({ code: ' test ten ', kind: 'PERCENT', value: 10, scope: 'ALL', active: true });
  check('a code is saved', r.status === 201, JSON.stringify(r.out).slice(0, 160));
  check('  and is tidied to TESTTEN', r.out.item?.code === 'TESTTEN', r.out.item?.code);

  r = await make({ code: 'TESTBAD', kind: 'PERCENT', value: 140, scope: 'ALL' });
  check('a percentage over 100 is refused', r.status === 400 && /more than 100/i.test(r.out.error ?? ''),
    r.status + ' ' + r.out.error);
  r = await make({ code: 'TESTZERO', kind: 'FIXED', value: 0, scope: 'ALL' });
  check('nothing off is refused', r.status === 400 && /above zero/i.test(r.out.error ?? ''), r.out.error);
  r = await make({ code: 'TEST NOTARGETS', kind: 'PERCENT', value: 5, scope: 'COLLECTIONS', targets: [] });
  check('a scoped code with no targets is refused',
    r.status === 400 && /at least one/i.test(r.out.error ?? ''), r.out.error);
  r = await make({ code: 'TESTTEN', kind: 'PERCENT', value: 5, scope: 'ALL' });
  check('the same code twice is refused', r.status >= 400, r.status + ' ' + JSON.stringify(r.out).slice(0, 120));

  console.log('\nPricing a cart with a code');
  const plain = await price(2);
  check('no code, no discount', plain.discount === undefined && plain.total === plain.subtotal,
    JSON.stringify({ s: plain.subtotal, t: plain.total }));

  const tenth = await price(2, 'testten');
  check('a lower-case code still works', tenth.discount?.code === 'TESTTEN', JSON.stringify(tenth.discount));
  check('  10% comes off',
    Math.abs(tenth.discount.amount - Math.round(plain.subtotal * 10) / 100) < 0.011,
    JSON.stringify({ sub: plain.subtotal, off: tenth.discount?.amount }));
  check('  and the total is the subtotal less the discount',
    Math.abs(tenth.total - (tenth.subtotal - tenth.discount.amount)) < 0.011,
    JSON.stringify({ sub: tenth.subtotal, off: tenth.discount.amount, total: tenth.total }));

  const unknown = await price(2, 'NOPE123');
  check('an unknown code says so, and charges full price',
    /not one of ours/i.test(unknown.discountError ?? '') && unknown.total === unknown.subtotal,
    JSON.stringify({ e: unknown.discountError, t: unknown.total }));

  console.log('\nThe conditions');
  await make({ code: 'TESTMIN', kind: 'FIXED', value: 10, scope: 'ALL', minSubtotal: 100000 });
  const tooSmall = await price(1, 'TESTMIN');
  check('a minimum order is enforced', /needs an order of/i.test(tooSmall.discountError ?? ''),
    tooSmall.discountError);
  check('  and nothing comes off', tooSmall.total === tooSmall.subtotal, JSON.stringify(tooSmall.total));

  await make({ code: 'TESTGONE', kind: 'PERCENT', value: 10, scope: 'ALL',
               endsAt: new Date(Date.now() - 86400000).toISOString() });
  const expired = await price(2, 'TESTGONE');
  check('an expired code is refused', /expired/i.test(expired.discountError ?? ''), expired.discountError);

  await make({ code: 'TESTOFF', kind: 'PERCENT', value: 10, scope: 'ALL', active: false });
  const off = await price(2, 'TESTOFF');
  check('a switched-off code is refused', /no longer available/i.test(off.discountError ?? ''), off.discountError);

  await make({ code: 'TESTSCOPE', kind: 'PERCENT', value: 50, scope: 'COLLECTIONS',
               targets: ['nothing-like-this'] });
  const wrongScope = await price(2, 'TESTSCOPE');
  check('a code for another collection does not apply',
    /does not apply/i.test(wrongScope.discountError ?? ''), wrongScope.discountError);

  if (inCollection) {
    await make({ code: 'TESTHERE', kind: 'PERCENT', value: 50, scope: 'COLLECTIONS',
                 targets: [inCollection] });
    const right = await price(2, 'TESTHERE');
    check('a code for this collection does apply',
      Math.abs(right.discount?.amount - right.subtotal / 2) < 0.011,
      JSON.stringify({ sub: right.subtotal, off: right.discount?.amount }));
  }

  await make({ code: 'TESTHUGE', kind: 'FIXED', value: 99999, scope: 'ALL' });
  const free = await price(1, 'TESTHUGE');
  check('a huge code makes it free, never negative',
    free.total === 0 && free.discount.amount === free.subtotal,
    JSON.stringify({ sub: free.subtotal, off: free.discount?.amount, total: free.total }));

  console.log('\nUsed up');
  const limited = await make({ code: 'TESTLIMIT', kind: 'PERCENT', value: 10, scope: 'ALL', usageLimit: 1 });
  await db.discount.update({ where: { id: limited.out.item.id }, data: { usedCount: 1 } });
  const spent = await price(2, 'TESTLIMIT');
  check('a code at its limit is refused', /used up/i.test(spent.discountError ?? ''), spent.discountError);

  console.log('\nOn the checkout page');
  const profile = mkdtempSync(path.join(tmpdir(), 'edge-dc-'));
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });

  // Put something in the cart the way the site does, then open checkout.
  await send('Page.navigate', { url: BASE + '/products/' + prod.handle });
  await waitFor(`!!document.querySelector('h1')`);
  await sleep(1500);
  // The provider stores the lines array itself, under this key.
  await ev(`(() => {
    const lines = [{ id: 'test-1', productId: ${JSON.stringify(prod.id)}, handle: ${JSON.stringify(prod.handle)},
      title: 'test', image: null, size: 'L', sport: null, colorway: null, teamName: null, number: null,
      orderType: 'individual', quantity: 2, unitPrice: 50 }];
    localStorage.setItem('ds-shop-cart', JSON.stringify(lines)); return true; })()`);
  await send('Page.navigate', { url: BASE + '/checkout' });
  await waitFor(`!!document.querySelector('#discount-code')`, 15000);
  await sleep(1200);
  const hasBox = await ev(`!!document.querySelector('#discount-code')`);
  check('the checkout has a code box', hasBox === true, String(hasBox));

  if (hasBox) {
    await ev(`(() => {
      const i = document.querySelector('#discount-code');
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(i, 'TESTTEN'); i.dispatchEvent(new Event('input', { bubbles: true }));
      i.closest('form').requestSubmit(); return true; })()`);
    await sleep(2500);
    const after = await ev(`document.body.innerText`);
    // The saving is printed with a true minus sign (U+2212), not a hyphen.
    check(
      '  applying a code shows the saving',
      /applied/i.test(after) && /[−-]\$\d/.test(after),
      after.slice(0, 400)
    );
    const totals = (after.match(/Subtotal[\s\S]{0,90}/) ?? [''])[0].replace(/\s+/g, ' ');
    console.log('        ' + totals);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, 'checkout-discount.png'), Buffer.from(shot.result.data, 'base64'));
  }

  check('no browser errors', errors.length === 0, errors.join(' | '));
} catch (e) {
  fail++;
  console.log('  ERROR ' + e.stack);
} finally {
  if (madeCodes.length) {
    await db.discount.deleteMany({ where: { code: { in: madeCodes } } });
    console.log(`\ncleaned up ${madeCodes.length} test codes`);
  }
  try { ws?.close(); } catch {}
  try { edge?.kill(); } catch {}
  try { server?.kill(); } catch {}
  await db.$disconnect();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
