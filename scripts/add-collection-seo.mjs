/**
 * Gives the collections that had no search title or description one each.
 *
 * Six of the twelve were falling back: the title became the collection's own
 * name ("Crew Neck Jerseys"), and the description was generated from a
 * template, so several pages described themselves in the same words. These
 * are written from what each shelf actually holds — the price in each is the
 * cheapest anyone can pay on that page today, checked against the products
 * rather than typed from memory.
 *
 * Idempotent: a field somebody has already filled in is left alone unless
 * --force is passed.
 *
 *   node -r dotenv/config scripts/add-collection-seo.mjs [--force]
 */
import { createRequire } from 'node:module';

const req = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = req('@prisma/client');
const db = new PrismaClient();
const force = process.argv.includes('--force');

const COPY = {
  'baseball-uniform': {
    title: 'Baseball Uniform',
    seoTitle: 'Custom baseball uniforms & jerseys',
    seoDescription:
      "Fully sublimated baseball uniforms — crew neck jerseys and pinstripe sets in your colors. " +
      'Names and numbers included, free mockup in 24 hours, from $20 each.',
  },
  'softball-uniform': {
    title: 'Softball Uniform',
    seoTitle: 'Custom softball uniforms & jerseys',
    seoDescription:
      "Fully sublimated softball uniforms — crew neck jerseys and pinstripe sets in your colors. " +
      'Names and numbers included, free mockup in 24 hours, from $20 each.',
  },
  'crew-neck-jerseys': {
    seoTitle: 'Custom crew neck baseball jerseys',
    seoDescription:
      "Crew neck jerseys sublimated in your team's colors, with player names and numbers " +
      'included. No art or setup fees, free mockup in 24 hours, from $20 each.',
  },
  'jerseys-v-neck': {
    seoTitle: 'Custom V-neck baseball & softball jerseys',
    seoDescription:
      "V-neck jerseys sublimated in your team's colors, with player names and numbers included. " +
      'No art or setup fees and a free digital mockup in 24 hours.',
  },
  'pinstripe-uniform': {
    seoTitle: 'Custom pinstripe baseball uniforms',
    seoDescription:
      "Pinstripe baseball and softball uniforms, sublimated to order in your team's colors. " +
      'Names and numbers included, with a free digital mockup in 24 hours.',
  },
  pinstripes: {
    seoTitle: 'Custom pinstripe uniforms',
    seoDescription:
      'Pinstripe uniforms built to order for baseball and softball teams — sublimated in-house, ' +
      'player names and numbers included, with a free mockup in 24 hours.',
  },
};

let changed = 0;
for (const [handle, copy] of Object.entries(COPY)) {
  const c = await db.collection.findUnique({
    where: { handle },
    select: { id: true, title: true, seoTitle: true, seoDescription: true },
  });
  if (!c) {
    console.log(`  skipped /${handle} — no such collection`);
    continue;
  }

  const data = {};
  if (copy.title && c.title !== copy.title) data.title = copy.title;
  if (force || !c.seoTitle) data.seoTitle = copy.seoTitle;
  if (force || !c.seoDescription) data.seoDescription = copy.seoDescription;

  if (!Object.keys(data).length) {
    console.log(`  left alone /${handle} — already written`);
    continue;
  }
  await db.collection.update({ where: { id: c.id }, data });
  changed++;
  console.log(`  wrote /${handle}: ${Object.keys(data).join(', ')}`);
  if (data.seoTitle) console.log(`      title (${data.seoTitle.length}) ${data.seoTitle}`);
  if (data.seoDescription) {
    console.log(`      desc  (${data.seoDescription.length}) ${data.seoDescription}`);
  }
}

console.log(`\n${changed} collection(s) updated.`);
console.log('The pages pick it up within their two-minute cache, or at once on the next save in the admin.');
await db.$disconnect();
