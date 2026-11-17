/**
 * Puts Custom Softball Jerseys directly under Custom Baseball Jerseys in the
 * catalogue sidebar and the menu.
 *
 * Both are listed by `position`, and several collections share the same
 * number, so collections with equal numbers come out in whatever order the
 * database happens to return. The new softball page landed further down that
 * way. This keeps every other collection exactly where it is shown today,
 * moves the softball page to just after the baseball one (and the baseball
 * one's sub-collections, which are always drawn under it), and gives every
 * published collection a number of its own so the order cannot drift again.
 *
 * Runs once. A marker in the settings table records that it has, so a later
 * deploy never undoes an order somebody has since set in the admin.
 *
 *   node -r dotenv/config scripts/order-jersey-collections.mjs            (look)
 *   node -r dotenv/config scripts/order-jersey-collections.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const BASEBALL = 'custom-baseball-jerseys';
const SOFTBALL = 'custom-softball-jerseys';
const MARKER = 'task:order-jersey-collections';

try {
  if (await db.setting.findUnique({ where: { key: MARKER } })) {
    console.log('Already ordered once. Nothing to do.');
    process.exit(0);
  }

  // The order the site shows today: the same query the sidebar's list uses.
  const rows = await db.collection.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { position: 'asc' },
    select: { id: true, handle: true, title: true, position: true },
  });

  const baseball = rows.findIndex((r) => r.handle === BASEBALL);
  const softball = rows.findIndex((r) => r.handle === SOFTBALL);
  if (baseball < 0 || softball < 0) {
    // The pages are made by split-jersey-collections, which runs first; if
    // they are not there yet, leave this for the next deploy.
    throw new Error('the two jersey pages are not both published yet');
  }

  const order = rows.filter((r) => r.handle !== SOFTBALL);
  order.splice(order.findIndex((r) => r.handle === BASEBALL) + 1, 0, rows[softball]);

  console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');
  const changes = [];
  order.forEach((r, i) => {
    const position = i * 10;
    console.log(`  ${String(position).padStart(4)}  ${r.title}${r.position !== position ? `  (was ${r.position})` : ''}`);
    if (r.position !== position) changes.push({ id: r.id, position });
  });

  if (apply) {
    await db.$transaction([
      ...changes.map((c) => db.collection.update({ where: { id: c.id }, data: { position: c.position } })),
      db.setting.create({ data: { key: MARKER, value: { doneAt: new Date().toISOString() } } }),
    ]);
    console.log(`\n${changes.length} collection(s) renumbered.`);
    // Read by scripts/data-tasks.mjs, which then throws away the cached reads.
    if (changes.length) console.log('DATA_CHANGED');
  } else {
    console.log(`\n${changes.length} collection(s) would be renumbered. Nothing changed.`);
  }
} finally {
  await db.$disconnect();
}
