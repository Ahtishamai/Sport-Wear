/**
 * Splits "Custom Baseball & Softball Jerseys" into two pages that can each
 * rank for their own search: custom baseball jerseys, and custom softball
 * jerseys.
 *
 * One page with both sports in the heading is the second-best answer to both
 * searches, and Google ranks pages that are about one thing. So:
 *
 *   1. /collections/shirts becomes /collections/custom-baseball-jerseys.
 *      The same row is renamed rather than a new one made, so it keeps its
 *      products, its two sub-collections (crew neck, V-neck), its images and
 *      its place in the catalogue. Only its address and its words change.
 *
 *   2. /collections/custom-softball-jerseys is created, holding the same
 *      jerseys (every design is offered for both sports) with writing of its
 *      own, so the two pages are not copies of each other.
 *
 *   3. /collections/shirts answers 301 to the baseball page, so whatever
 *      the old address had earned with search engines carries across.
 *
 *   4. Every link to the old address the site prints itself — menus, page
 *      sections, collection writing, settings — and every collection handle
 *      a section or a discount code names is pointed at the new one, so the
 *      site never sends its own visitors through a redirect.
 *
 * Dry run by default: prints everything it would do and changes nothing.
 *
 *   node -r dotenv/config scripts/split-jersey-collections.mjs            (look)
 *   node -r dotenv/config scripts/split-jersey-collections.mjs --apply    (do it)
 *
 * Runs by itself on every deploy, through scripts/data-tasks.mjs and
 * `npm run build`, with --once: the first deploy makes the split and every
 * deploy after that finds it made and changes nothing. Before writing, the
 * old collection row is kept in the settings table under
 * "backup:collection-shirts", and every page it edits gets a revision in the
 * page builder's history, so all of it can be put back.
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
/**
 * --once: do nothing when the split has already been made. Every deploy runs
 * this (scripts/data-tasks.mjs), and without it each deploy would write the
 * copy below over whatever the shop has since changed in the admin.
 */
const once = process.argv.includes('--once');

const OLD_HANDLE = 'shirts';
const BASEBALL = 'custom-baseball-jerseys';
const SOFTBALL = 'custom-softball-jerseys';
const OLD_PATH = `/collections/${OLD_HANDLE}`;
const NEW_PATH = `/collections/${BASEBALL}`;

// ------------------------------------------------------------------ the writing
//
// Every fact here is one the site already states and stands behind: the price
// ladder printed on the jersey designs, YS to 3XL, 24-hour mockups, 3–4 weeks
// from approval with a 2-week rush, no art or setup fees, free shipping, the
// Springfield shop. Nothing is promised here that a product page does not.

const BASEBALL_COPY = {
  title: 'Custom Baseball Jerseys',
  subtitle: 'Personalized team jerseys, made in our own shop',
  description:
    'Design custom baseball jerseys for your whole team. Every jersey is personalized with ' +
    'names, numbers and your logo at no extra cost, and you see a free mockup within 24 hours.',
  seoTitle: 'Custom Baseball Jerseys | Personalized for Your Team',
  seoDescription:
    'Custom baseball jerseys with free names, numbers and logos. Free mockup in 24 hours, ' +
    'no setup fees and free shipping. As low as $20 a jersey for teams.',
  bodyCopy: `## Custom baseball jerseys, made for your team

Your team should look like a team. We make custom baseball jerseys in your colors, with your logo, player names and numbers. You do not need any design skills. Tell us what you want, and our artists build it for you.

Every jersey is sublimated in our own shop in Springfield, Massachusetts. That means the color is dyed into the fabric, not printed on top. It will not crack, peel or fade, even after a full season of washing.

## What comes with every jersey

- **Player names and numbers**, at no extra cost
- **Your team logo and sponsor names**, also included
- **Unlimited colors**, because sublimation has no color limit
- **Unlimited design changes** until you approve
- **No art fees and no setup fees**
- **Free shipping** on every order

## How much do custom baseball jerseys cost?

The price per jersey goes down as your order grows. These are the prices for our listed designs:

| Jerseys in your order | Price per jersey |
|---|---|
| 1 | $50 |
| 2 | $40 |
| 3 to 4 | $35 |
| 5 | $30 |
| 6 to 10 | $25 |
| 11 to 20 | $22 |
| 21 or more | $20 |

Some designs show "Request a quote" instead of a price. Send us your roster size, and we reply with an exact price within 24 hours. A quote is free, and we never ask for a deposit.

Need jerseys on a tight budget? A full team order brings the price down to $20 a jersey, with names and numbers already included. That makes our custom team baseball jerseys an easy fit for most team budgets.

## Pick your cut: V-neck or crew neck

We make custom baseball jerseys in two cuts. Both cost the same and use the same artwork.

- [V-neck baseball jerseys](/collections/jerseys-v-neck) have an open collar. They feel cool on hot game days.
- [Crew neck baseball jerseys](/collections/crew-neck-jerseys) have a round collar. They give a clean, classic look.

Not sure which fits your players best? Ask us for a free sizing kit and try them before you order.

## Sizes for every player

Sizes run from youth small (YS) to adult 3XL. You can mix youth and adult sizes in one order, and every size costs the same. That makes these a good choice for custom youth baseball jerseys, school teams, travel teams and clubs.

## Design your own baseball jersey, with our help

Many people look for a baseball jersey maker or an online builder. You do not need one here. Our art team works as your jersey designer, for free. Just send us any of these:

- Your team colors
- Your logo, or a photo of it
- A sketch, or a photo of last season's jersey

We turn it into a full design and send you a free mockup, usually within 24 hours. You can ask for changes as many times as you like. Nothing is made until you say yes.

Want ideas first? Look through the baseball jersey designs above. Any of them can be changed to your team colors.

## How to order personalized baseball jerseys

1. **Send your idea.** Your colors, your logo or a rough sketch is enough.
2. **Approve your mockup.** We send it free, usually within 24 hours.
3. **Send your roster.** One list with every size, name and number.
4. **Get your jerseys.** They arrive 3 to 4 weeks after you approve the design. Need them sooner? A 2-week rush is available for an added fee.

Need the full uniform? See our [custom baseball team uniforms](/collections/baseball-uniform), with matching pants. Playing softball instead? See our [custom softball jerseys](/collections/${SOFTBALL}).

## Frequently asked questions

### Can I order just one custom baseball jersey?

Yes. You can order a single jersey for $50, or jerseys for a whole team. The price per jersey drops as you add more.

### Are names and numbers really free?

Yes. Player names, numbers, your logo and sponsor names are all part of the price. There are no art fees and no setup fees.

### How long do custom baseball jerseys take?

Most orders arrive 3 to 4 weeks after you approve the artwork. If you need them sooner, a 2-week rush is available for an added fee.

### Can I mix youth and adult sizes in one order?

Yes. One order can run from youth small to adult 3XL, and every size costs the same.

### What is the difference between sublimation and screen printing?

Sublimation dyes the design into the fabric, so it cannot crack, peel or fade. Screen printing sits on top of the fabric and can wear off over time.

### Can I add a player later in the season?

Yes. We keep your artwork and sizes on file, so you can order one more jersey that matches the rest of the team.`,
};

const SOFTBALL_COPY = {
  title: 'Custom Softball Jerseys',
  subtitle: 'Personalized jerseys for fastpitch and slowpitch teams',
  description:
    'Custom softball jerseys for youth, fastpitch, slowpitch and men’s teams. Each one is ' +
    'personalized with names, numbers and your logo, and you get a free mockup in 24 hours.',
  seoTitle: 'Custom Softball Jerseys for Fastpitch & Slowpitch',
  seoDescription:
    'Personalized softball jerseys for youth, fastpitch, slowpitch and men’s teams. ' +
    'Free names, numbers and logos, free mockup in 24 hours, free shipping.',
  bodyCopy: `## Custom softball jerseys for your whole team

Getting softball jerseys for a team should be simple. We make custom softball jerseys in your colors, with your logo, player names and numbers. Our artists do the design work for you, so nobody on your team needs design skills.

Every jersey is sublimated in our own shop in Springfield, Massachusetts. The color is dyed into the fabric, so it will not crack, peel or fade after many washes. The fabric is light and breathable, which helps on hot summer days in the field.

## Jerseys for every kind of softball team

- **Youth softball jerseys.** Sizes start at youth small (YS), so your youngest players fit too.
- **Fastpitch teams.** School, travel and club teams can all share one look.
- **Men's softball jerseys.** Adult sizes run up to 3XL for slowpitch, rec and league teams.
- **Coed and company teams.** Mix any sizes in one order, at one price per jersey.

Not sure which cut suits your league? Tell us if you play fastpitch or slowpitch, and we will help you choose.

## What every personalized softball jersey includes

- **Player names and numbers**, at no extra cost
- **Your logo and sponsor names**, also included
- **Unlimited colors** in your design
- **Unlimited changes** until you approve
- **No art fees and no setup fees**
- **Free shipping** on every order

## Softball jersey prices

You pay less per jersey as your team order grows. These are the prices for our listed designs:

| Jerseys in your order | Price per jersey |
|---|---|
| 1 | $50 |
| 2 | $40 |
| 3 to 4 | $35 |
| 5 | $30 |
| 6 to 10 | $25 |
| 11 to 20 | $22 |
| 21 or more | $20 |

Some designs say "Request a quote" instead of showing a price. Tell us how many players you have, and we send an exact price within 24 hours. Quotes are free, with no deposit.

## Softball jersey designs to start from

The designs above are a starting point. Every one can be changed to your team colors and logo. You can pick a V-neck, with an open collar that feels cool in summer games, or a crew neck, with a round collar and a classic look. Both cost the same.

Prefer to start from scratch? Send us a logo, a sketch or a photo of an old jersey. We send you a free mockup, usually within 24 hours, and change it as many times as you need.

## How to order custom softball jerseys

1. **Share your idea.** Team colors, a logo or a quick sketch is plenty.
2. **Approve the free mockup.** It usually arrives within 24 hours.
3. **Send your roster.** List each player's size, name and number.
4. **Play in your new jerseys.** Orders arrive 3 to 4 weeks after you approve the design. A 2-week rush is available for an added fee.

Want a full kit with pants? See our [custom softball uniforms](/collections/softball-uniform) and our [youth and fastpitch softball team kits](/collections/softball). Coaching a baseball team too? See our [custom baseball jerseys](/collections/${BASEBALL}).

## Frequently asked questions

### What is the minimum order for custom softball jerseys?

You can order a single jersey for $50. The price drops as you add players, down to $20 a jersey for 21 or more.

### Do you make men's softball jerseys?

Yes. Adult sizes run up to 3XL, so our jerseys work well for men's slowpitch and league teams. Names and numbers are included.

### Do you make youth softball jerseys?

Yes. Youth sizes start at YS. Youth and adult sizes cost the same and can go on one order.

### Do these jerseys work for fastpitch and slowpitch?

Yes. Tell us which one you play, and we will suggest the cut that suits it best.

### How long do custom softball jerseys take?

Most orders arrive 3 to 4 weeks after you approve the artwork. A 2-week rush is available for an added fee.

### Can I order one more jersey later in the season?

Yes. We keep your design and sizes on file, so a new player's jersey will match the rest of the team.`,
};

// ------------------------------------------------------------------ helpers

/** The old address as a whole path segment: not /collections/shirts-2. */
const OLD_PATH_RE = /\/collections\/shirts(?=$|[?#"'\s)\]/])/g;

const SOFTBALL_PATH = `/collections/${SOFTBALL}`;
const swapPath = (s, to = NEW_PATH) => s.replace(OLD_PATH_RE, to);

/** Words about softball and not baseball — a "Softball Design now" tile. */
const aboutSoftball = (s) => typeof s === 'string' && /softball/i.test(s) && !/baseball/i.test(s);

/**
 * A copy of a JSON value with the old address swapped in every string, and
 * the old handle swapped wherever a key names a collection handle (a product
 * grid block's `collectionHandle`, for one). Returns the copy and how many
 * places changed.
 */
function rewrite(value, defaultTo = NEW_PATH) {
  let changes = 0;
  const walk = (v, key, to) => {
    if (typeof v === 'string') {
      if (key && /handle/i.test(key) && v === OLD_HANDLE) {
        changes++;
        return to === SOFTBALL_PATH ? SOFTBALL : BASEBALL;
      }
      const next = swapPath(v, to);
      if (next !== v) changes++;
      return next;
    }
    if (Array.isArray(v)) return v.map((x) => walk(x, key, to));
    if (v && typeof v === 'object') {
      // A tile or card whose own words are about softball links to the
      // softball page; everything else that linked to the old shared page
      // goes to the baseball one, which is what that page has become.
      const own = Object.values(v).some(aboutSoftball) ? SOFTBALL_PATH : to;
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k, own)]));
    }
    return v;
  };
  return { value: walk(value, null, defaultTo), changes };
}

const say = (s) => console.log(s);
const act = apply ? 'did' : 'would';
const run = async (fn) => (apply ? fn() : undefined);

// ------------------------------------------------------------------ 1. baseball

say(apply ? '\n=== APPLYING ===\n' : '\n=== DRY RUN (nothing is changed; add --apply) ===\n');

let baseball = await db.collection.findUnique({ where: { handle: BASEBALL } });
const old = await db.collection.findUnique({ where: { handle: OLD_HANDLE } });

if (old && baseball) {
  throw new Error(
    `Both /${OLD_HANDLE} and /${BASEBALL} exist. Stopping rather than guess which is the real one.`
  );
}
if (!old && !baseball) {
  throw new Error(`Neither /${OLD_HANDLE} nor /${BASEBALL} exists — nothing to work from.`);
}

if (once && !old && (await db.collection.findUnique({ where: { handle: SOFTBALL } }))) {
  say('Already split: both jersey pages exist and the old one is gone. Nothing to do.');
  await db.$disconnect();
  process.exit(0);
}

const source = old ?? baseball;
say(`Jerseys collection: "${source.title}" (/${source.handle}, ${source.status}, id ${source.id})`);

/*
 * An FAQ section under the grid would print a second set of questions (and a
 * second FAQ markup block) beneath the ones the new writing carries, so it is
 * taken off. It is kept in the backup below with the rest of the old row.
 */
const oldBlocks = Array.isArray(source.blocks) ? source.blocks : [];
const keptBlocks = oldBlocks.filter((b) => b?.type !== 'faq');
if (oldBlocks.length) {
  say(`  Sections under the grid: ${oldBlocks.map((b) => b?.type).join(', ')}`);
  if (keptBlocks.length < oldBlocks.length) {
    say(`  ${act} remove the FAQ section — the new writing has its own questions`);
  }
}

// The products both pages hold: the collection's own and its sub-collections'.
const subs = await db.collectionParent.findMany({
  where: { parentId: source.id },
  select: { child: { select: { id: true, handle: true, title: true } } },
});
const memberRows = await db.productCollection.findMany({
  where: { collectionId: { in: [source.id, ...subs.map((s) => s.child.id)] } },
  select: { productId: true, position: true, product: { select: { title: true, status: true } } },
  orderBy: { position: 'asc' },
});
const members = new Map();
for (const r of memberRows) if (!members.has(r.productId)) members.set(r.productId, r);

say(`  Sub-collections: ${subs.map((s) => `/${s.child.handle}`).join(', ') || 'none'}`);
say(`  Jerseys (own + sub-collections): ${members.size}`);
for (const r of members.values()) say(`    - ${r.product.title} [${r.product.status}]`);

/*
 * The old row is kept whole in the database, not on disk: a deploy replaces
 * the app folder, and the database is the one thing that survives it.
 */
const BACKUP_KEY = `backup:collection-${OLD_HANDLE}`;
if (old) {
  const kept = await db.setting.findUnique({ where: { key: BACKUP_KEY } });
  if (kept) {
    say(`\n  the old row is already backed up in settings "${BACKUP_KEY}"`);
  } else {
    say(`\n  ${act} back up the old row to settings "${BACKUP_KEY}"`);
    await run(() =>
      db.setting.create({ data: { key: BACKUP_KEY, value: JSON.parse(JSON.stringify(old)) } })
    );
  }
}

const baseballData = {
  handle: BASEBALL,
  status: 'PUBLISHED',
  ...BASEBALL_COPY,
  ...(keptBlocks.length < oldBlocks.length ? { blocks: keptBlocks } : {}),
};
say(`  ${act} rename /${source.handle} → /${BASEBALL} and write its new copy`);
say(`    title       (${BASEBALL_COPY.title.length}) ${BASEBALL_COPY.title}`);
say(`    seoTitle    (${BASEBALL_COPY.seoTitle.length}) ${BASEBALL_COPY.seoTitle}`);
say(`    seoDesc     (${BASEBALL_COPY.seoDescription.length}) ${BASEBALL_COPY.seoDescription}`);
say(`    bodyCopy    ${BASEBALL_COPY.bodyCopy.split(/\s+/).length} words`);
baseball = (await run(() => db.collection.update({ where: { id: source.id }, data: baseballData }))) ?? source;

// ------------------------------------------------------------------ 2. softball

let softball = await db.collection.findUnique({ where: { handle: SOFTBALL } });
const softballData = {
  status: 'PUBLISHED',
  showInNav: source.showInNav,
  thumbUrl: source.thumbUrl,
  bannerUrl: source.bannerUrl,
  ...SOFTBALL_COPY,
};
say(`\n  ${act} ${softball ? 'update' : 'create'} /${SOFTBALL}`);
say(`    seoTitle    (${SOFTBALL_COPY.seoTitle.length}) ${SOFTBALL_COPY.seoTitle}`);
say(`    seoDesc     (${SOFTBALL_COPY.seoDescription.length}) ${SOFTBALL_COPY.seoDescription}`);
say(`    bodyCopy    ${SOFTBALL_COPY.bodyCopy.split(/\s+/).length} words`);
if (apply) {
  softball = softball
    ? await db.collection.update({ where: { id: softball.id }, data: softballData })
    : await db.collection.create({
        data: { handle: SOFTBALL, position: source.position, ...softballData },
      });
}

const have = softball
  ? new Set(
      (
        await db.productCollection.findMany({
          where: { collectionId: softball.id },
          select: { productId: true },
        })
      ).map((r) => r.productId)
    )
  : new Set();
const toAdd = [...members.values()].filter((r) => !have.has(r.productId));
say(`    ${act} file ${toAdd.length} jersey(s) in it (${have.size} already there)`);
await run(() =>
  db.productCollection.createMany({
    data: toAdd.map((r, i) => ({ productId: r.productId, collectionId: softball.id, position: i })),
    skipDuplicates: true,
  })
);

// ------------------------------------------------------------------ 3. redirect

const rule = await db.redirect.findUnique({ where: { from: OLD_PATH } });
if (rule && rule.to === NEW_PATH && rule.active && rule.kind === 'PERMANENT') {
  say(`\n  301 ${OLD_PATH} → ${NEW_PATH} is already in place`);
} else {
  say(`\n  ${act} ${rule ? 'update' : 'add'} 301 ${OLD_PATH} → ${NEW_PATH}`);
  const data = {
    to: NEW_PATH,
    kind: 'PERMANENT',
    active: true,
    note: 'Jerseys split into a baseball and a softball page; the old shared page became the baseball one.',
  };
  await run(() =>
    rule
      ? db.redirect.update({ where: { id: rule.id }, data })
      : db.redirect.create({ data: { from: OLD_PATH, ...data } })
  );
}

// Older rules that sent people to the old address now send them straight to
// the new one, rather than through two hops.
const chained = await db.redirect.findMany({ where: { to: OLD_PATH } });
for (const r of chained) {
  say(`  ${act} repoint ${r.from} → ${NEW_PATH} (was → ${OLD_PATH})`);
  await run(() => db.redirect.update({ where: { id: r.id }, data: { to: NEW_PATH } }));
}

// ------------------------------------------------------------------ 4. links

say('\n  Links to the old address:');
let linkChanges = 0;

// Menus
const navItems = await db.navItem.findMany({ orderBy: [{ menu: 'asc' }, { position: 'asc' }] });
for (const n of navItems) {
  const href = swapPath(n.href);
  const label = n.label.trim().toLowerCase() === 'shirts & jerseys' ? 'Baseball jerseys' : n.label;
  if (href === n.href && label === n.label) continue;
  linkChanges++;
  say(`    menu ${n.menu}: "${n.label}" ${n.href}  →  "${label}" ${href}`);
  await run(() => db.navItem.update({ where: { id: n.id }, data: { href, label } }));
}

// A footer link to the new softball page, beside the baseball one, so the
// page is linked from every page of the site from day one.
const baseballLink = navItems.find(
  (n) => n.href === OLD_PATH || n.href === NEW_PATH || swapPath(n.href) === NEW_PATH
);
const softballLinked = navItems.some((n) => n.href === `/collections/${SOFTBALL}`);
if (baseballLink && !softballLinked) {
  say(`    menu ${baseballLink.menu}: ${act} add "Softball jerseys" /collections/${SOFTBALL} after it`);
  await run(async () => {
    await db.navItem.updateMany({
      where: { menu: baseballLink.menu, position: { gt: baseballLink.position } },
      data: { position: { increment: 1 } },
    });
    await db.navItem.create({
      data: {
        menu: baseballLink.menu,
        label: 'Softball jerseys',
        href: `/collections/${SOFTBALL}`,
        position: baseballLink.position + 1,
      },
    });
  });
} else if (!baseballLink) {
  say('    (no menu links to the jerseys page, so no softball link is added to a menu)');
}

// Page sections
for (const p of await db.page.findMany({ select: { id: true, slug: true, blocks: true } })) {
  const { value, changes } = rewrite(p.blocks);
  if (!changes) continue;
  linkChanges += changes;
  say(`    page /${p.slug}: ${changes} place(s)`);
  await run(async () => {
    // The page's own history keeps the version from before, so it can be
    // restored from the page builder like any other edit.
    await db.pageRevision.create({
      data: { pageId: p.id, blocks: p.blocks, label: 'Before the jersey split' },
    });
    await db.page.update({ where: { id: p.id }, data: { blocks: value } });
  });
}

// Collection sections and writing (the two jersey pages included)
for (const c of await db.collection.findMany({
  select: { id: true, handle: true, blocks: true, bodyCopy: true },
})) {
  // A softball shelf that pointed at the old shared jerseys page means the
  // softball jerseys; every other shelf means the baseball ones.
  const to = /softball/.test(c.handle) ? SOFTBALL_PATH : NEW_PATH;
  const blocks = c.blocks == null ? { value: null, changes: 0 } : rewrite(c.blocks, to);
  const body = c.bodyCopy ? swapPath(c.bodyCopy, to) : c.bodyCopy;
  const bodyChanged = body !== c.bodyCopy;
  if (!blocks.changes && !bodyChanged) continue;
  linkChanges += blocks.changes + (bodyChanged ? 1 : 0);
  say(`    collection /${c.handle}: ${blocks.changes} section place(s)${bodyChanged ? ', writing' : ''}`);
  const data = {};
  if (blocks.changes) data.blocks = blocks.value;
  if (bodyChanged) data.bodyCopy = body;
  await run(() => db.collection.update({ where: { id: c.id }, data }));
}

// Settings (announcement bar, footer copy and the like)
for (const s of await db.setting.findMany()) {
  // Backups are a record of how things were, and must stay that way.
  if (s.key.startsWith('backup:')) continue;
  const { value, changes } = rewrite(s.value);
  if (!changes) continue;
  linkChanges += changes;
  say(`    settings "${s.key}": ${changes} place(s)`);
  await run(() => db.setting.update({ where: { key: s.key }, data: { value } }));
}

// Discount codes limited to the old collection by handle
for (const d of await db.discount.findMany({ where: { scope: 'COLLECTIONS' } })) {
  const targets = Array.isArray(d.targets) ? d.targets : [];
  if (!targets.includes(OLD_HANDLE)) continue;
  const next = targets.map((t) => (t === OLD_HANDLE ? BASEBALL : t));
  if (!next.includes(SOFTBALL)) next.push(SOFTBALL);
  linkChanges++;
  say(`    discount ${d.code}: limited to [${targets.join(', ')}] → [${next.join(', ')}]`);
  await run(() => db.discount.update({ where: { id: d.id }, data: { targets: next } }));
}

if (!linkChanges) say('    none found');

// ------------------------------------------------------------------ done

// Read by scripts/data-tasks.mjs, which then throws away the cached reads.
if (apply) say('DATA_CHANGED');

say(
  apply
    ? `\nDone. Run by hand rather than by a deploy? Clear the caches from the admin:
  Collections → Custom Baseball Jerseys → Save, Redirects → ${OLD_PATH} → Save,
  Navigation → Save. Then ${OLD_PATH} lands on ${NEW_PATH}.`
    : '\nNothing was changed. Run again with --apply to do the above.'
);

await db.$disconnect();
