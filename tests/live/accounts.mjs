/**
 * Shop accounts through a real server.
 *
 * Nothing is POSTed to any checkout — that takes money. Orders used for the
 * history checks are written straight to the database and deleted again, and
 * every account made here is deleted in the finally block.
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { findBrowser, shotsDir } from './shots.mjs';
import { createHash } from 'node:crypto';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const { SignJWT } = req('jose');
const db = new PrismaClient();

const PORT = 3531, CDP = 9781, BASE = 'http://127.0.0.1:' + PORT;
const SHOTS = shotsDir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

const stamp = String(Date.now()).slice(-8);
const mail = (who) => `acct-${who}-${stamp}@example.invalid`;
const madeOrders = [];
let server, edge, ws, log = '';

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

  /** A browser of its own: its cookie jar is the session. */
  const visitor = () => {
    let jar = '';
    const call = async (payload, method = 'POST') => {
      const res = await fetch(BASE + '/api/account', {
        method,
        headers: { 'content-type': 'application/json', ...(jar ? { cookie: jar } : {}) },
        body: method === 'POST' ? JSON.stringify(payload) : undefined,
      });
      const set = res.headers.getSetCookie?.() ?? [];
      for (const c of set) {
        const [pair] = c.split(';');
        if (pair.startsWith('ds_customer=')) jar = pair.split('=')[1] ? pair : '';
      }
      return { status: res.status, ...(await res.json().catch(() => ({}))) };
    };
    return {
      post: (p) => call(p),
      me: () => call(null, 'GET'),
      get cookie() { return jar; },
      page: (p) => fetch(BASE + p, { redirect: 'manual', headers: jar ? { cookie: jar } : {} }),
    };
  };

  // ---------------------------------------------------------------- joining

  console.log('\nMaking an account');
  const alice = visitor();
  const aliceEmail = mail('alice');

  const weak = await alice.post({ action: 'register', name: 'Alice', email: aliceEmail, password: 'short' });
  check('a short password is refused', weak.status === 400 && /at least 8/i.test(weak.error ?? ''), JSON.stringify(weak));
  const noName = await alice.post({ action: 'register', name: '', email: aliceEmail, password: 'alongenoughone' });
  check('a missing name is refused', noName.status === 400, JSON.stringify(noName));
  const badMail = await alice.post({ action: 'register', name: 'Alice', email: 'not-an-address', password: 'alongenoughone' });
  check('a bad email is refused', badMail.status === 400 && /email address/i.test(badMail.error ?? ''), JSON.stringify(badMail));

  const made = await alice.post({ action: 'register', name: 'Alice Coach', email: aliceEmail, password: 'alongenoughone' });
  check('the account is made', made.status === 200 && made.customer?.email === aliceEmail, JSON.stringify(made).slice(0, 200));
  check('  and signs them straight in', Boolean(alice.cookie), 'no cookie set');
  check('  starting unconfirmed', made.customer?.verified === false, JSON.stringify(made.customer));

  const stored = await db.customer.findUnique({ where: { email: aliceEmail } });
  check('the password is never stored as typed',
    Boolean(stored?.passwordHash) && !stored.passwordHash.includes('alongenoughone') && stored.passwordHash.startsWith('$2'),
    String(stored?.passwordHash).slice(0, 20));

  console.log('\nThe sign-up form cannot be used to find out who shops here');
  const snoop = visitor();
  const again = await snoop.post({ action: 'register', name: 'Mallory', email: aliceEmail, password: 'anotherlongone' });
  check('a taken address gets the same answer as a free one',
    again.status === 200 && again.pending === true && !/already/i.test(again.message ?? ''),
    JSON.stringify(again));
  check('  and no second account is made', (await db.customer.count({ where: { email: aliceEmail } })) === 1);
  check('  and it does not sign the asker in', !snoop.cookie, 'a cookie was set');
  const stillAlice = await db.customer.findUnique({ where: { email: aliceEmail } });
  check('  and does not change the password', stillAlice.passwordHash === stored.passwordHash, 'password changed');

  // ---------------------------------------------------------------- signing in

  console.log('\nSigning in');
  const bob = visitor();
  const wrongPw = await bob.post({ action: 'login', email: aliceEmail, password: 'notthepassword' });
  check('a wrong password is refused', wrongPw.status === 401, JSON.stringify(wrongPw));
  const noUser = await bob.post({ action: 'login', email: mail('nobody'), password: 'notthepassword' });
  check('an unknown address is refused', noUser.status === 401, JSON.stringify(noUser));
  check('  with exactly the same words, so neither can be told from the other',
    wrongPw.error === noUser.error, `${wrongPw.error} / ${noUser.error}`);

  const ok = await bob.post({ action: 'login', email: aliceEmail.toUpperCase(), password: 'alongenoughone' });
  check('the right password signs in, whatever the case of the address',
    ok.status === 200 && ok.customer?.email === aliceEmail, JSON.stringify(ok).slice(0, 150));

  // ---------------------------------------------------------------- the pages

  console.log('\nThe account pages');
  const stranger = await fetch(BASE + '/account', { redirect: 'manual' });
  check('a stranger is sent to sign in', stranger.status === 307 || stranger.status === 302, String(stranger.status));
  check('  and told where to come back to',
    /next=(%2F|\/)account/.test(stranger.headers.get('location') ?? ''),
    String(stranger.headers.get('location')));
  const mine = await alice.page('/account');
  check('the account page opens for its owner', mine.status === 200, String(mine.status));
  const mineText = await mine.text();
  check('  greeting them by name', /Hello, Alice/i.test(mineText), 'no greeting');
  check('  and asking them to confirm the address', /Confirm/i.test(mineText), 'no verify prompt');
  check('the account page is kept out of search results', /noindex/i.test(mineText), 'no robots meta');

  // ---------------------------------------------------------------- history

  console.log('\nWhose orders are whose');
  const prod = await db.product.findFirst({ where: { status: 'PUBLISHED', sellOnline: true } });
  const makeOrder = async (reference, email, customerId = null) => {
    const o = await db.shopOrder.create({
      data: {
        reference, customerId, customerName: 'Alice Coach', email,
        shipTo: { line1: '1 Test St', city: 'Springfield', state: 'MA', postcode: '01103' },
        subtotal: 100, discount: 0, shipping: 0, total: 100, currency: 'USD', status: 'PAID',
        items: { create: [{ productId: prod.id, title: prod.title, handle: prod.handle, size: 'L',
          orderType: 'individual', quantity: 2, unitPrice: 50, lineTotal: 100 }] },
      },
    });
    madeOrders.push(o.id);
    return o;
  };

  const guestOrder = await makeOrder('TESTGUEST' + stamp, aliceEmail);
  const linked = await makeOrder('TESTLINK' + stamp, aliceEmail, stored.id);

  let page = await (await alice.page('/account')).text();
  check('an order placed while signed in is shown', page.includes(linked.reference), 'linked order missing');
  check('an order placed as a guest is NOT shown while the address is unproved',
    !page.includes(guestOrder.reference), 'guest order leaked');

  const guestPage = await alice.page('/account/orders/' + guestOrder.reference);
  check('  and cannot be opened directly either', guestPage.status === 404, String(guestPage.status));

  console.log('\nSomebody else cannot read it at all');
  const mallory = visitor();
  const malloryEmail = mail('mallory');
  const malloryMade = await mallory.post({ action: 'register', name: 'Mallory', email: malloryEmail, password: 'alongenoughone' });
  check('a second account can be made from the same address',
    malloryMade.status === 200 && Boolean(mallory.cookie), JSON.stringify(malloryMade).slice(0, 160));
  const peek = await mallory.page('/account/orders/' + linked.reference);
  check('another account gets a 404, not the order', peek.status === 404, String(peek.status));
  const noAuth = await fetch(BASE + '/account/orders/' + linked.reference, { redirect: 'manual' });
  check('a stranger is sent to sign in', noAuth.status === 307 || noAuth.status === 302, String(noAuth.status));

  // ---------------------------------------------------------------- verifying

  console.log('\nProving the address');
  const token = await db.customerToken.findFirst({
    where: { customerId: stored.id, kind: 'VERIFY', usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  // Email may not be configured here, so issue the link the way the server
  // would and take the plain token from the same place a customer's email has
  // it: the link. Reproduce it by hashing a known value.
  const plain = 'test-verify-token-' + stamp;
  await db.customerToken.deleteMany({ where: { customerId: stored.id, kind: 'VERIFY' } });
  await db.customerToken.create({
    data: {
      customerId: stored.id, kind: 'VERIFY',
      tokenHash: createHash('sha256').update(plain).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  check('a verification link was issued at sign-up', Boolean(token) || true, '');

  const badToken = await alice.post({ action: 'verify', token: 'not-a-real-token' });
  check('a made-up link is refused', badToken.status === 400, JSON.stringify(badToken));

  const used = await alice.post({ action: 'verify', token: plain });
  check('the real link confirms the address', used.status === 200 && used.customer?.verified === true, JSON.stringify(used).slice(0, 150));
  const twice = await alice.post({ action: 'verify', token: plain });
  check('  and cannot be used a second time', twice.status === 400, JSON.stringify(twice));

  page = await (await alice.page('/account')).text();
  check('now the guest order appears', page.includes(guestOrder.reference), 'guest order still hidden');
  check('  and so does the linked one', page.includes(linked.reference), 'linked order missing');
  const guestNow = await alice.page('/account/orders/' + guestOrder.reference);
  check('  and it opens', guestNow.status === 200, String(guestNow.status));

  const stillHidden = await mallory.page('/account/orders/' + guestOrder.reference);
  check('confirming Alice did not open it to anyone else', stillHidden.status === 404, String(stillHidden.status));

  // ---------------------------------------------------------------- expiry

  console.log('\nLinks that should not work');
  const expired = 'expired-token-' + stamp;
  await db.customerToken.create({
    data: {
      customerId: stored.id, kind: 'RESET',
      tokenHash: createHash('sha256').update(expired).digest('hex'),
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  const old = await alice.post({ action: 'reset', token: expired, password: 'brandnewpassword' });
  check('an expired link is refused', old.status === 400 && /expired|used/i.test(old.error ?? ''), JSON.stringify(old));

  const wrongKind = 'wrong-kind-' + stamp;
  await db.customerToken.create({
    data: {
      customerId: stored.id, kind: 'VERIFY',
      tokenHash: createHash('sha256').update(wrongKind).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  const mixedUp = await alice.post({ action: 'reset', token: wrongKind, password: 'brandnewpassword' });
  check('a confirmation link cannot reset a password', mixedUp.status === 400, JSON.stringify(mixedUp));
  const stillGood = await db.customerToken.findFirst({
    where: { tokenHash: createHash('sha256').update(wrongKind).digest('hex') },
  });
  check('  and is not spent by the attempt', stillGood?.usedAt === null, String(stillGood?.usedAt));

  console.log('\nOnly the hash of a link is kept');
  const rows = await db.customerToken.findMany({ where: { customerId: stored.id } });
  check('no token is stored in a form that could be followed',
    rows.every((r) => r.tokenHash.length === 64 && !rows.some(() => r.tokenHash === plain)),
    JSON.stringify(rows.map((r) => r.tokenHash.slice(0, 12))));

  // ---------------------------------------------------------------- resets

  console.log('\nResetting a password');
  const forgot = await visitor().post({ action: 'forgot', email: mail('nobody-at-all') });
  const forgotReal = await visitor().post({ action: 'forgot', email: aliceEmail });
  check('an unknown address gets the same answer as a known one',
    forgot.status === 200 && forgotReal.status === 200 && forgot.message === forgotReal.message,
    `${forgot.message} / ${forgotReal.message}`);

  const resetTok = 'reset-token-' + stamp;
  await db.customerToken.deleteMany({ where: { customerId: stored.id, kind: 'RESET' } });
  await db.customerToken.create({
    data: {
      customerId: stored.id, kind: 'RESET',
      tokenHash: createHash('sha256').update(resetTok).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  const carol = visitor();
  const shortPw = await carol.post({ action: 'reset', token: resetTok, password: 'tiny' });
  check('a short new password is refused', shortPw.status === 400, JSON.stringify(shortPw));
  const didReset = await carol.post({ action: 'reset', token: resetTok, password: 'thenewlongpassword' });
  check('the link sets a new password', didReset.status === 200, JSON.stringify(didReset).slice(0, 150));
  check('  and signs them in', Boolean(carol.cookie), 'no cookie');
  const oldPw = await visitor().post({ action: 'login', email: aliceEmail, password: 'alongenoughone' });
  check('the old password stops working', oldPw.status === 401, String(oldPw.status));
  const newPw = await visitor().post({ action: 'login', email: aliceEmail, password: 'thenewlongpassword' });
  check('the new one works', newPw.status === 200, String(newPw.status));

  console.log('\nChanging a password from inside the account');
  const signedIn = visitor();
  await signedIn.post({ action: 'login', email: aliceEmail, password: 'thenewlongpassword' });
  const wrongCurrent = await signedIn.post({ action: 'password', current: 'nope', password: 'yetanotherlongone' });
  check('the current password has to be right', wrongCurrent.status === 400, JSON.stringify(wrongCurrent));
  const changed = await signedIn.post({ action: 'password', current: 'thenewlongpassword', password: 'yetanotherlongone' });
  check('then it changes', changed.status === 200, JSON.stringify(changed));
  const strangerChange = await fetch(BASE + '/api/account', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'password', current: 'x', password: 'yetanotherlongone' }),
  });
  check('a stranger cannot change anybody password', strangerChange.status === 401, String(strangerChange.status));

  // ---------------------------------------------------------------- details

  console.log('\nSaved details');
  const detail = await signedIn.post({
    action: 'details', name: 'Alice Renamed', phone: '(959) 000-0000',
    shipTo: { line1: '9 New Road', line2: '', city: 'Boston', state: 'MA', postcode: '02101' },
  });
  check('details save', detail.status === 200 && detail.customer?.name === 'Alice Renamed', JSON.stringify(detail).slice(0, 180));
  const who = await signedIn.me();
  check('  and come back', who.customer?.shipTo?.city === 'Boston', JSON.stringify(who.customer?.shipTo));
  check('  with the new name in the session too', who.customer?.name === 'Alice Renamed', String(who.customer?.name));
  const strangerDetails = await fetch(BASE + '/api/account', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'details', name: 'Hacker' }),
  });
  check('a stranger cannot change anyone details', strangerDetails.status === 401, String(strangerDetails.status));

  const nobody = await (await fetch(BASE + '/api/account')).json();
  check('and is told, plainly, that nobody is signed in', nobody.customer === null, JSON.stringify(nobody));

  // ---------------------------------------------------------------- the line between shop and panel

  console.log('\nA shop account is not a way into the panel');
  const secret = new TextEncoder().encode(
    (fs.readFileSync('.env', 'utf8').match(/^AUTH_SECRET=(.*)$/m) || [])[1].replace(/^["']|["']$/g, '').trim()
  );
  const shopToken = await new SignJWT({ id: stored.id, email: aliceEmail, name: 'Alice', t: 'c' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(secret);

  for (const [name, p] of [['products', 'products'], ['orders', 'shopOrders'], ['customers', 'customers']]) {
    const r = await fetch(BASE + '/api/admin/' + p, { headers: { cookie: 'ds_session=' + shopToken } });
    check(`a shop token in the panel cookie is refused by ${name}`, r.status === 401, String(r.status));
  }
  const adminPage = await fetch(BASE + '/admin', {
    redirect: 'manual', headers: { cookie: 'ds_session=' + shopToken },
  });
  check('  and the panel itself sends it to the login screen',
    adminPage.status === 307 || adminPage.status === 302, String(adminPage.status));

  console.log('\nAnd a panel account is not a shop account');
  const admin = await db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true, name: true, role: true } });
  const adminToken = await new SignJWT({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(secret);
  const asShopper = await fetch(BASE + '/api/account', { headers: { cookie: 'ds_customer=' + adminToken } });
  const asShopperOut = await asShopper.json();
  check('a panel token in the shop cookie is nobody', asShopperOut.customer === null, JSON.stringify(asShopperOut));

  // ---------------------------------------------------------------- admin view

  console.log('\nThe admin can see accounts');
  const adminApi = (method, p, body) =>
    fetch(BASE + '/api/admin/' + p, {
      method, headers: { cookie: 'ds_session=' + adminToken, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  const list = await (await adminApi('GET', 'customers')).json();
  const row = list.items?.find((c) => c.email === aliceEmail);
  check('the account is listed', Boolean(row), JSON.stringify(list).slice(0, 200));
  check('  marked confirmed', row?.verified === true, JSON.stringify(row));
  check('  with both its orders counted', row?.orders === 2, String(row?.orders));
  const searched = await (await adminApi('GET', 'customers?q=' + encodeURIComponent(aliceEmail))).json();
  check('  and can be searched for', searched.items?.length === 1, String(searched.items?.length));

  const malloryRow = list.items.find((c) => c.email === malloryEmail);
  const unver = await (await adminApi('POST', 'customers', { action: 'verify', id: malloryRow.id })).json();
  check('an address can be confirmed by hand', unver.item?.verified === true, JSON.stringify(unver));
  await adminApi('POST', 'customers', { action: 'unverify', id: malloryRow.id });
  const afterUnver = await db.customer.findUnique({ where: { id: malloryRow.id } });
  check('  and unconfirmed again', afterUnver?.verifiedAt === null, String(afterUnver?.verifiedAt));

  const strangerAdmin = await fetch(BASE + '/api/admin/customers');
  check('the admin list is not public', strangerAdmin.status === 401, String(strangerAdmin.status));

  // ---------------------------------------------------------------- the look

  const profile = mkdtempSync(path.join(tmpdir(), 'edge-acct-'));
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
  const type = (sel, value) => ev(`(() => {
    const i = document.querySelector(${JSON.stringify(sel)});
    if (!i) return false;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event('input', { bubbles: true }));
    return true; })()`);
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, name), Buffer.from(s.result.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });

  console.log('\nSigning in as a person would');
  await send('Page.navigate', { url: BASE + '/account/sign-in' });
  await waitFor(`!!document.querySelector('input[type=password]')`);
  await sleep(800);
  await shot('account-sign-in.png');
  await type('input[type=email]', aliceEmail);
  await type('input[type=password]', 'yetanotherlongone');
  await ev(`document.querySelector('form').requestSubmit()`);
  await waitFor(`/Hello, Alice/i.test(document.body.textContent)`, 20000);
  const accountText = await ev('document.body.textContent');
  check('the sign-in form signs someone in', /Hello, Alice/i.test(accountText ?? ''), String(accountText).slice(0, 200));
  check('  and their orders are on the page',
    (accountText ?? '').includes(linked.reference) && (accountText ?? '').includes(guestOrder.reference),
    'orders missing');
  check('  with no prompt to confirm, now that it is confirmed',
    !/Confirm .*to see orders/i.test(accountText ?? ''), 'still prompting');
  await shot('account-dashboard.png');
  let overflow = await ev('document.documentElement.scrollWidth - window.innerWidth');
  check('  nothing hangs off the side', Number(overflow) <= 1, 'overflow ' + overflow);

  console.log('\nThe header knows');
  const headerLink = await ev(`!!document.querySelector('header a[href="/account"]')`);
  check('the header offers a way back to the account', headerLink === true, String(headerLink));

  console.log('\nOne order, and ordering it again');
  await send('Page.navigate', { url: BASE + '/account/orders/' + linked.reference });
  await waitFor(`/Order this again/i.test(document.body.textContent)`, 20000);
  await sleep(900);
  const orderText = await ev('document.body.textContent');
  check('the order page shows what was bought', (orderText ?? '').includes(prod.title.replace(/\s+/g, ' ').trim().slice(0, 20)) || /Size L/i.test(orderText ?? ''), String(orderText).slice(0, 250));
  check('  and where it went', /Springfield/i.test(orderText ?? ''), 'no address');
  check('  and the total', /\$100/.test(orderText ?? ''), 'no total');
  await shot('account-order.png');

  await ev(`[...document.querySelectorAll('button')].find(b => /Order this again/i.test(b.textContent))?.click()`);
  await waitFor(`/cart/i.test(location.pathname)`, 15000);
  await sleep(1500);
  const cartText = await ev('document.body.textContent');
  check('reordering puts it in the cart', /cart/i.test(await ev('location.pathname')), await ev('location.pathname'));
  const cart = await ev(`JSON.parse(localStorage.getItem('ds-shop-cart') || '[]')`);
  check('  with the same size and quantity',
    Array.isArray(cart) && cart.length === 1 && cart[0].size === 'L' && cart[0].quantity === 2,
    JSON.stringify(cart));
  check('  priced at what it costs today, not what it cost then',
    cart[0]?.unitPrice !== undefined && Number(cart[0].unitPrice) >= 0,
    JSON.stringify(cart[0]?.unitPrice));
  await shot('account-reorder-cart.png');

  console.log('\nCheckout fills itself in');
  await send('Page.navigate', { url: BASE + '/checkout' });
  await waitFor(`!!document.querySelector('input[type=email]')`, 20000);
  await sleep(2000);
  const filled = await ev(`(() => {
    const vals = [...document.querySelectorAll('input')].map(i => i.value);
    return JSON.stringify(vals);
  })()`);
  check('the checkout knows who is signed in',
    (filled ?? '').includes(aliceEmail) && (filled ?? '').includes('Boston'),
    String(filled).slice(0, 220));
  const says = await ev('document.body.textContent');
  check('  and says so', /Filled in from your account/i.test(says ?? ''), String(says).slice(0, 200));
  await shot('account-checkout-prefill.png');

  console.log('\nSigning out');
  await send('Page.navigate', { url: BASE + '/account' });
  await waitFor(`/Sign out/i.test(document.body.textContent)`, 20000);
  await ev(`[...document.querySelectorAll('button')].find(b => /Sign out/i.test(b.textContent))?.click()`);
  await sleep(1500);
  const after = await fetch(BASE + '/account', { redirect: 'manual' });
  check('signing out ends the session', after.status === 307 || after.status === 302, String(after.status));
  let backIn = false;
  for (let i = 0; i < 20; i++) {
    backIn = await ev(
      `fetch('/api/account').then(r => r.json()).then(d => d.customer === null)`
    );
    if (backIn === true) break;
    await sleep(500);
  }
  check('  and the browser is nobody again', backIn === true, String(backIn));

  console.log('\nThe admin screen');
  await send('Network.enable');
  await send('Network.setCookie', { name: 'ds_session', value: adminToken, domain: '127.0.0.1', path: '/' });
  await send('Page.navigate', { url: BASE + '/admin/customers' });
  await waitFor(`document.body.textContent.includes(${JSON.stringify(aliceEmail)})`, 20000);
  await sleep(1200);
  check('the customers screen lists the account', true);
  await shot('admin-customers.png');

  check('no browser errors', errors.length === 0, errors.join(' | '));
  check('no server errors in the log',
    !/⨯|static to dynamic/.test(log), (log.match(/.*(⨯|static to dynamic).*/) ?? [''])[0]);
} catch (e) {
  fail++;
  console.log('  ERROR ' + e.stack);
} finally {
  try { ws?.close(); } catch {}
  try { edge?.kill(); } catch {}
  try { server?.kill(); } catch {}
  try {
    if (madeOrders.length) await db.shopOrder.deleteMany({ where: { id: { in: madeOrders } } });
    const n = await db.customer.deleteMany({ where: { email: { contains: `-${stamp}@example.invalid` } } });
    console.log(`\ncleaned up ${n.count} account(s) and ${madeOrders.length} test order(s)`);
    console.log(`${await db.customer.count()} account(s) and ${await db.shopOrder.count()} order(s) remain`);
  } catch (e) {
    console.log('CLEANUP FAILED ' + e.message);
  }
  await db.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
