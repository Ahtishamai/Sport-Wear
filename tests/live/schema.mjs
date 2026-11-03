/**
 * The structured data every page hands to a search engine, read off the
 * rendered HTML rather than from the code.
 *
 * Markup is the one part of a page nobody looks at, which is exactly why it
 * is worth a test: a price that drifts from the one printed on the page, a
 * rating attached to nothing, a half-built URL — none of it shows up in a
 * browser, and all of it is the kind of thing a search engine penalises.
 *
 * Read-only throughout: it starts a server, GETs a handful of pages, parses
 * what it finds and stops.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();

const PORT = 3529, BASE = 'http://127.0.0.1:' + PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  ' + String(d).replace(/\s+/g, ' ').slice(0, 300)); }
};

/** Every ld+json block on a page, parsed. */
function blocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1]
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'");
    try {
      out.push(JSON.parse(raw));
    } catch (e) {
      out.push({ BROKEN: String(e) });
    }
  }
  return out;
}

const at = async (path) => blocks(await (await fetch(BASE + path)).text());
const typed = (found, type) => found.find((b) => b['@type'] === type);

let server;
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    stdio: 'ignore', env: process.env,
  });
  let up = false;
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(BASE + '/api/health')).ok) { up = true; break; } } catch {}
    await sleep(1000);
  }
  if (!up) throw new Error('the server did not come up');

  const [collection, priced, quoted] = await Promise.all([
    db.collection.findFirst({
      where: { status: 'PUBLISHED', products: { some: { product: { status: 'PUBLISHED' } } } },
      select: { handle: true, title: true },
    }),
    db.product.findFirst({
      where: { status: 'PUBLISHED', showPrice: true, basePrice: { gt: 0 } },
      select: { handle: true, title: true, basePrice: true },
    }),
    db.product.findFirst({
      where: { status: 'PUBLISHED', showPrice: false },
      select: { handle: true, title: true },
    }),
  ]);

  // ------------------------------------------------------------- every page

  console.log('\nThe business, on every page');
  for (const path of ['/', '/collections', '/cart', `/products/${priced.handle}`]) {
    const found = await at(path);
    check(`${path}: nothing failed to parse`, !found.some((b) => b.BROKEN),
      JSON.stringify(found.filter((b) => b.BROKEN)));
    const biz = typed(found, 'LocalBusiness');
    const site = typed(found, 'WebSite');
    check(`${path}: one business, with an id`, !!biz?.['@id'], JSON.stringify(biz).slice(0, 120));
    check(`${path}: the site names it as publisher`,
      site?.publisher?.['@id'] === biz?.['@id'],
      `${site?.publisher?.['@id']} vs ${biz?.['@id']}`);
    check(`${path}: no rating where no review is shown`,
      !biz?.aggregateRating, JSON.stringify(biz?.aggregateRating));
    // The social links in settings are the networks' own home pages until
    // somebody fills them in; claiming those as the shop's profiles is a lie.
    check(`${path}: claims no social profile it cannot prove`, !biz?.sameAs, JSON.stringify(biz?.sameAs));
  }

  console.log('\nThe address, in pieces');
  const biz = typed(await at('/'), 'LocalBusiness');
  const addr = biz?.address ?? {};
  check('it is a PostalAddress', addr['@type'] === 'PostalAddress', JSON.stringify(addr));
  check('the street is not the whole address again',
    !String(addr.streetAddress ?? '').includes(String(addr.postalCode ?? 'x')),
    JSON.stringify(addr));
  check('the logo is a whole URL', /^https?:\/\/.+\.(png|jpe?g|webp|svg)/i.test(biz?.logo ?? ''),
    String(biz?.logo));

  // -------------------------------------------------------------- a product

  console.log(`\nA priced product — /products/${priced.handle}`);
  const pFound = await at(`/products/${priced.handle}`);
  const product = typed(pFound, 'Product');
  check('there is a Product', !!product, JSON.stringify(pFound.map((b) => b['@type'])));
  check('it has an id of its own', /#product$/.test(product?.['@id'] ?? ''), String(product?.['@id']));
  check('its url is whole', /^https?:\/\/.+\/products\//.test(product?.url ?? ''), String(product?.url));
  check('it has at least one image, as a whole URL',
    (product?.image ?? []).length > 0 && (product?.image ?? []).every((i) => /^https?:\/\//.test(i)),
    JSON.stringify(product?.image));
  check('it carries a description', String(product?.description ?? '').length >= 80,
    String(product?.description));
  check('the offer is the whole ladder, low to high',
    product?.offers?.['@type'] === 'AggregateOffer' &&
      Number(product.offers.lowPrice) > 0 &&
      Number(product.offers.highPrice) >= Number(product.offers.lowPrice),
    JSON.stringify(product?.offers));
  check('the seller is the business already declared',
    product?.offers?.seller?.['@id'] === biz?.['@id'],
    JSON.stringify(product?.offers?.seller));
  check('no rating is claimed for one jersey', !product?.aggregateRating,
    JSON.stringify(product?.aggregateRating));
  check('no delivery or returns promise is made',
    !product?.offers?.shippingDetails && !product?.offers?.hasMerchantReturnPolicy,
    JSON.stringify(product?.offers).slice(0, 200));
  check('nothing reached the page as the word undefined',
    !JSON.stringify(product).includes('"undefined"'), JSON.stringify(product).slice(0, 200));

  console.log(`\nA quote-only product — /products/${quoted.handle}`);
  const qProduct = typed(await at(`/products/${quoted.handle}`), 'Product');
  check('there is still a Product', !!qProduct, 'none');
  check('and not a figure anywhere in it',
    !/price/i.test(JSON.stringify(qProduct ?? {})),
    JSON.stringify(qProduct).slice(0, 240));

  console.log('\nThe trail above a product');
  const crumbs = typed(pFound, 'BreadcrumbList');
  check('there is a BreadcrumbList', !!crumbs, 'none');
  check('every step is numbered from one',
    (crumbs?.itemListElement ?? []).every((s, i) => s.position === i + 1),
    JSON.stringify(crumbs?.itemListElement?.map((s) => s.position)));
  check('every step is a whole address',
    (crumbs?.itemListElement ?? []).every((s) => /^https?:\/\/.+/.test(s.item ?? '')),
    JSON.stringify(crumbs?.itemListElement?.map((s) => s.item)));
  check('it ends on the product itself',
    crumbs?.itemListElement?.at(-1)?.name === priced.title.trim(),
    String(crumbs?.itemListElement?.at(-1)?.name));

  // ----------------------------------------------------------- a collection

  console.log(`\nA collection — /collections/${collection.handle}`);
  const cFound = await at(`/collections/${collection.handle}`);
  const page = typed(cFound, 'CollectionPage');
  check('there is a CollectionPage', !!page, JSON.stringify(cFound.map((b) => b['@type'])));
  check('it holds an ItemList', page?.mainEntity?.['@type'] === 'ItemList',
    JSON.stringify(page?.mainEntity).slice(0, 120));
  const items = page?.mainEntity?.itemListElement ?? [];
  check('the list is not empty', items.length > 0, String(items.length));
  check('its count matches the list', page?.mainEntity?.numberOfItems === items.length,
    `${page?.mainEntity?.numberOfItems} vs ${items.length}`);
  check('the positions run one to n', items.every((e, i) => e.position === i + 1),
    JSON.stringify(items.map((e) => e.position)));
  check('every entry is a product with a whole URL',
    items.every((e) => e.item?.['@type'] === 'Product' && /^https?:\/\//.test(e.item.url ?? '')),
    JSON.stringify(items[0]?.item).slice(0, 200));
  check('each one points at the same id its own page uses',
    items.every((e) => /#product$/.test(e.item?.['@id'] ?? '')),
    JSON.stringify(items.map((e) => e.item?.['@id']).slice(0, 2)));
  check('it says which site it belongs to', !!page?.isPartOf?.['@id'],
    JSON.stringify(page?.isPartOf));

  // The figure in the list has to be the figure on the card.
  const onPage = await (await fetch(`${BASE}/collections/${collection.handle}`)).text();
  const listed = items.filter((e) => e.item?.offers);
  check('a price in the list is a price shown on the page',
    listed.every((e) => onPage.includes('$' + Math.round(Number(e.item.offers.price)))),
    JSON.stringify(listed.map((e) => e.item.offers.price).slice(0, 5)));
  check('the order is the order the page shows',
    items.map((e) => e.item.name).every((name, i, all) =>
      i === 0 || onPage.indexOf(all[i - 1]) <= onPage.indexOf(name)),
    'the list is not in page order');

  console.log('\nThe trail above a collection');
  const cCrumbs = typed(cFound, 'BreadcrumbList');
  check('there is one', !!cCrumbs, 'none');
  check('it ends on the collection',
    cCrumbs?.itemListElement?.at(-1)?.name === collection.title.trim(),
    String(cCrumbs?.itemListElement?.at(-1)?.name));

  // -------------------------------------------------------------- a rating

  console.log('\nThe rating, where reviews are printed');
  const published = await db.review.count({ where: { published: true } });
  const home = await at('/');
  const rated = home.find((b) => b.aggregateRating);
  if (published === 0) {
    check('no reviews, so no rating is claimed anywhere', !rated,
      JSON.stringify(rated).slice(0, 160));
    console.log('  note  there are no published reviews; publish one to exercise the rest');
  } else {
    check('a rating is emitted', !!rated, 'none');
    check('it belongs to the business, by the same id',
      rated?.['@id'] === biz?.['@id'], `${rated?.['@id']} vs ${biz?.['@id']}`);
    check('it counts the reviews on the page',
      rated?.aggregateRating?.reviewCount === published,
      `${rated?.aggregateRating?.reviewCount} vs ${published} published`);
    check('the reviews themselves come with it',
      (rated?.review ?? []).length === published,
      `${(rated?.review ?? []).length} attached`);
    const printed = await (await fetch(BASE + '/')).text();
    check('every review in the markup is printed on the page',
      (rated?.review ?? []).every((r) => printed.includes(String(r.author?.name ?? '\u0000'))),
      'a review was marked up that the page does not show');
  }
} catch (err) {
  fail++;
  console.log('  FAIL  the check itself broke  ' + String(err).slice(0, 300));
} finally {
  if (server?.pid) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try { server.kill('SIGKILL'); } catch {}
    }
  }
  await db.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
