/**
 * Offers youth extra large (YXL) on every product that offers youth sizes.
 *
 * The house size run went YS, YM, YL, then straight to adult S, so YXL was
 * missing from every jersey. Two products had been given it by hand as "YX",
 * at the end of the list after 3XL. Customers asked for YXL more than once.
 *
 * For each product with its own size list:
 *   - "YX" is corrected to "YXL";
 *   - YXL is placed straight after YL, where it belongs in the run;
 *   - a list with YL but no YXL gains YXL after YL.
 * A product with no youth sizes (a bag, an adults-only cut) is left alone.
 * Products with no list of their own already use SIZE_RUN in src/lib/utils.ts,
 * which now includes YXL.
 *
 * Once, by a marker in settings; the lists as they were are kept in it.
 *
 *   node -r dotenv/config scripts/add-youth-xl-size.mjs            (look)
 *   node -r dotenv/config scripts/add-youth-xl-size.mjs --apply    (do it)
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');

const MARKER = 'task:add-youth-xl-size';

/** The size list with YXL in its place, or null if it needs no change. */
export function withYouthXL(sizes) {
  if (!Array.isArray(sizes)) return null;
  const list = sizes.map((s) => (String(s).trim().toUpperCase() === 'YX' ? 'YXL' : String(s).trim()));
  const hasYL = list.some((s) => s.toUpperCase() === 'YL');
  const hasYXL = list.some((s) => s.toUpperCase() === 'YXL');
  if (!hasYL && !hasYXL) return null;
  // YXL once, straight after YL (or where it already was, when there is no YL).
  const without = list.filter((s) => s.toUpperCase() !== 'YXL');
  const at = without.findIndex((s) => s.toUpperCase() === 'YL');
  const next = at >= 0 ? [...without.slice(0, at + 1), 'YXL', ...without.slice(at + 1)] : list;
  return JSON.stringify(next) === JSON.stringify(sizes) ? null : next;
}

try {
  if (await db.setting.findUnique({ where: { key: MARKER } })) {
    console.log('Already done once — left as it is.');
    process.exit(0);
  }

  const products = await db.product.findMany({ select: { id: true, title: true, sizes: true } });
  const changes = products
    .map((p) => ({ ...p, next: withYouthXL(p.sizes) }))
    .filter((p) => p.next);

  console.log(apply ? '\n=== APPLYING ===' : '\n=== DRY RUN (add --apply) ===');
  for (const p of changes) console.log(`  ${p.title}: ${JSON.stringify(p.sizes)} → ${JSON.stringify(p.next)}`);
  if (!changes.length) console.log('  every product with youth sizes already offers YXL');

  if (apply) {
    await db.$transaction([
      ...changes.map((p) => db.product.update({ where: { id: p.id }, data: { sizes: p.next } })),
      db.setting.create({
        data: {
          key: MARKER,
          value: { doneAt: new Date().toISOString(), before: changes.map((p) => ({ id: p.id, sizes: p.sizes })) },
        },
      }),
    ]);
    if (changes.length) console.log('DATA_CHANGED');
  }
} finally {
  await db.$disconnect();
}
