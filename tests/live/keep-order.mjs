/**
 * Keeping an order, and the ratings search engines are shown.
 *
 * Nothing is POSTed to any checkout — that takes money and would make a real
 * PayPal order. The cookie the checkout hands the browser is forged here the
 * way the server mints it, which is what the claim actually reads.
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const { SignJWT } = req('jose');
const db = new PrismaClient();

const PORT = 3537, BASE = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

const stamp = String(Date.now()).slice(-8);
const mail = (who) => `inv-${who}-${stamp}@example.invalid`;
const madeOrders = [];
let server, log = '';

try {
  const secret = new TextEncoder().encode(
    (fs.readFileSync('.env', 'utf8').match(/^AUTH_SECRET=(.*)$/m) || [])[1].replace(/^["']|["']$/g, '').trim()
  );

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
  });
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {}
    await sleep(1000);
  }

  const prod = await db.product.findFirst({ where: { status: 'PUBLISHED', sellOnline: true } });
  const makeOrder = async (reference, email) => {
    const o = await db.shopOrder.create({
      data: {
        reference, customerName: 'Alice Coach', email,
        shipTo: { line1: '1 Test St', city: 'Springfield', state: 'MA', postcode: '01103' },
        subtotal: 100, discount: 0, shipping: 0, total: 100, currency: 'USD', status: 'PAID',
        items: { create: [{ productId: prod.id, title: prod.title, handle: prod.handle, size: 'L',
          orderType: 'individual', quantity: 2, unitPrice: 50, lineTotal: 100 }] },
      },
    });
    madeOrders.push(o.id);
    return o;
  };

  /** The cookie the checkout gives the browser that just paid. */
  const orderCookie = (orderId, claim = 'o') =>
    new SignJWT({ oid: orderId, t: claim })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(secret);

  const visitor = (extraCookie = '') => {
    let jar = extraCookie;
    const call = async (payload, method = 'POST') => {
      const res = await fetch(BASE + '/api/account', {
        method,
        headers: { 'content-type': 'application/json', ...(jar ? { cookie: jar } : {}) },
        body: method === 'POST' ? JSON.stringify(payload) : undefined,
      });
      for (const c of res.headers.getSetCookie?.() ?? []) {
        const [pair] = c.split(';');
        if (pair.startsWith('ds_customer=')) {
          const keep = jar.split('; ').filter((p) => p && !p.startsWith('ds_customer='));
          jar = [...keep, pair].join('; ');
        }
        if (pair.startsWith('ds_order=') && pair === 'ds_order=') {
          jar = jar.split('; ').filter((p) => p && !p.startsWith('ds_order=')).join('; ');
        }
      }
      return { status: res.status, ...(await res.json().catch(() => ({}))) };
    };
    return {
      post: (p) => call(p),
      page: (p) => fetch(BASE + p, { redirect: 'manual', headers: jar ? { cookie: jar } : {} }),
    };
  };

  // ---------------------------------------------------------------- claiming

  console.log('\nKeeping the order you just placed');
  const order = await makeOrder('INVA' + stamp, mail('alice'));
  const cookie = 'ds_order=' + (await orderCookie(order.id));
  const alice = visitor(cookie);

  const made = await alice.post({
    action: 'register', name: 'Alice Coach', email: mail('alice'), password: 'alongenoughone',
  });
  check('the account is made', made.status === 200, JSON.stringify(made).slice(0, 180));
  check('  and the order it was made from is claimed', made.claimed === order.reference, String(made.claimed));

  const owned = await db.shopOrder.findUnique({ where: { id: order.id }, select: { customerId: true } });
  check('  so the order now belongs to the account', Boolean(owned?.customerId), String(owned?.customerId));

  const page = await (await alice.page('/account')).text();
  check('it shows on the account page straight away', page.includes(order.reference), 'not listed');
  check('  even though the address is not confirmed yet',
    /Confirm/i.test(page), 'no verify prompt, so this proves nothing');
  const opened = await alice.page('/account/orders/' + order.reference);
  check('  and opens', opened.status === 200, String(opened.status));

  console.log('\nThe same works for somebody who already had an account');
  const bobOrder = await makeOrder('INVB' + stamp, mail('bob'));
  const bob = visitor();
  await bob.post({ action: 'register', name: 'Bob', email: mail('bob'), password: 'alongenoughone' });
  await bob.post({ action: 'logout' });
  const bobBack = visitor('ds_order=' + (await orderCookie(bobOrder.id)));
  const signedIn = await bobBack.post({ action: 'login', email: mail('bob'), password: 'alongenoughone' });
  check('signing in claims it too', signedIn.claimed === bobOrder.reference, String(signedIn.claimed));

  // ---------------------------------------------------------------- it cannot be abused

  console.log('\nAn order cannot be claimed without having placed it');
  const victim = await makeOrder('INVV' + stamp, mail('victim'));

  const noCookie = visitor();
  const m1 = await noCookie.post({
    action: 'register', name: 'Mallory', email: mail('m1'), password: 'alongenoughone',
  });
  check('no cookie, nothing claimed', m1.claimed === null || m1.claimed === undefined, String(m1.claimed));

  // Guessing the reference gets nowhere: references are DS plus five digits,
  // and the claim never looks at what the browser says the order is.
  const guesser = visitor();
  const m2 = await guesser.post({
    action: 'register', name: 'Mallory', email: mail('m2'), password: 'alongenoughone',
    reference: victim.reference, orderId: victim.id, claimed: victim.reference,
  });
  check('naming somebody order in the request claims nothing',
    !m2.claimed, String(m2.claimed));

  const unsigned = visitor('ds_order=' + Buffer.from(JSON.stringify({ oid: victim.id })).toString('base64url'));
  const m3 = await unsigned.post({
    action: 'register', name: 'Mallory', email: mail('m3'), password: 'alongenoughone',
  });
  check('an unsigned cookie claims nothing', !m3.claimed, String(m3.claimed));

  const wrongKind = visitor('ds_order=' + (await orderCookie(victim.id, 'c')));
  const m4 = await wrongKind.post({
    action: 'register', name: 'Mallory', email: mail('m4'), password: 'alongenoughone',
  });
  check('a signed cookie of the wrong kind claims nothing', !m4.claimed, String(m4.claimed));

  const stillFree = await db.shopOrder.findUnique({ where: { id: victim.id }, select: { customerId: true } });
  check('the order is still nobody after all that', stillFree?.customerId === null, String(stillFree?.customerId));

  console.log('\nAn order that already belongs to someone is not taken away');
  const thief = visitor('ds_order=' + (await orderCookie(order.id)));
  const m5 = await thief.post({
    action: 'register', name: 'Mallory', email: mail('m5'), password: 'alongenoughone',
  });
  check('a replayed cookie claims nothing', !m5.claimed, String(m5.claimed));
  const unmoved = await db.shopOrder.findUnique({ where: { id: order.id }, select: { customerId: true } });
  check('  and the order stays with its owner',
    unmoved?.customerId === owned?.customerId, `${unmoved?.customerId} vs ${owned?.customerId}`);

  console.log('\nThe cookie is spent once');
  const spent = await alice.post({ action: 'logout' });
  const aliceAgain = visitor();
  const back = await aliceAgain.post({ action: 'login', email: mail('alice'), password: 'alongenoughone' });
  check('signing in again claims nothing new', !back.claimed, String(back.claimed));

  // ---------------------------------------------------------------- ratings

  console.log('\nWhat search engines are told about ratings');
  const reviews = await db.review.count({ where: { published: true } });
  const home = await (await fetch(BASE + '/')).text();
  const ld = [...home.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean);

  check('the invented site-wide rating is gone',
    !/"reviewCount"\s*:\s*"1000"/.test(home) && !/"ratingValue"\s*:\s*"4\.9"/.test(home),
    (home.match(/.{60}4\.9.{60}/) ?? [''])[0]);

  const business = ld.find((d) => d['@type'] === 'LocalBusiness');
  check('the business listing no longer carries one', business && !business.aggregateRating,
    JSON.stringify(business?.aggregateRating));

  const rating = ld.find((d) => d['@type'] === 'AggregateRating');
  if (reviews > 0) {
    check('the reviews section publishes a real one', Boolean(rating), 'none found');
    check('  counting the reviews actually on the page',
      rating?.reviewCount > 0 && rating.reviewCount <= reviews,
      `${rating?.reviewCount} of ${reviews} published`);
    check('  with a score in range', rating?.ratingValue >= 1 && rating?.ratingValue <= 5,
      String(rating?.ratingValue));
    const shown = (home.match(/★/g) ?? []).length;
    check('  on a page that actually shows reviews', shown > 0, 'no stars on the page');
  } else {
    check('with no reviews, no rating is published', !rating, JSON.stringify(rating));
  }

  console.log('\nThe product page');
  const pdp = await (await fetch(BASE + '/products/' + prod.handle)).text();
  check('the invented product rating is gone',
    !/aggregateRating/.test(pdp), (pdp.match(/.{80}aggregateRating.{80}/) ?? [''])[0]);
  check('  but the price range it has earned is still there',
    /AggregateOffer/.test(pdp) && /lowPrice/.test(pdp), 'offers missing');
  const pdpLd = [...pdp.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean);
  check('  and the product markup still parses',
    pdpLd.some((d) => d['@type'] === 'Product'), JSON.stringify(pdpLd.map((d) => d['@type'])));
  check('  with a breadcrumb',
    pdpLd.some((d) => d['@type'] === 'BreadcrumbList'), 'no breadcrumb');

  console.log('\nThe pages still work');
  for (const [name, p] of [
    ['the home page', '/'],
    ['a product', '/products/' + prod.handle],
    ['the collections page', '/collections'],
    ['the cart', '/cart'],
    ['checkout', '/checkout'],
  ]) {
    const r = await fetch(BASE + p, { redirect: 'manual' });
    check(name + ' answers 200', r.status === 200, p + ' gave ' + r.status);
  }

  check('no server errors in the log',
    !/⨯|static to dynamic/.test(log), (log.match(/.*(⨯|static to dynamic).*/) ?? [''])[0]);
} catch (e) {
  fail++;
  console.log('  ERROR ' + e.stack);
} finally {
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
