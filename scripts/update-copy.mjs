/**
 * Applies the requested home-page copy changes to the live database.
 *   node -r dotenv/config scripts/update-copy.mjs [--dry]
 *
 * Idempotent: re-running reports "already set" rather than duplicating work.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry');

const HERO_BODY =
  'From concept to creation, we deliver top-tier customized sportswear built for comfort, durability, and game-day confidence.';

const STAT_OLD_LABEL = 'Design to delivery';
const STAT_NEW_VALUE = '3–4 weeks';
const STAT_NEW_LABEL = 'Order to deliver';

try {
  const page = await prisma.page.findUnique({ where: { slug: 'home' } });
  if (!page) throw new Error('Home page not found');

  const blocks = structuredClone(page.blocks);
  const changes = [];

  for (const b of blocks) {
    if (b.type === 'hero') {
      if (b.props.body === HERO_BODY) {
        changes.push('hero sub-headline — already set');
      } else {
        changes.push(`hero sub-headline\n      was: ${b.props.body}\n      now: ${HERO_BODY}`);
        b.props.body = HERO_BODY;
      }
    }

    if (b.type === 'statStrip' && Array.isArray(b.props.items)) {
      b.props.items.forEach((it, i) => {
        const isTarget = it.label === STAT_OLD_LABEL || it.label === STAT_NEW_LABEL;
        if (!isTarget) return;
        if (it.value === STAT_NEW_VALUE && it.label === STAT_NEW_LABEL) {
          changes.push(`stat cell ${i} — already set`);
          return;
        }
        changes.push(
          `stat cell ${i}\n      was: "${it.value}" / "${it.label}"\n      now: "${STAT_NEW_VALUE}" / "${STAT_NEW_LABEL}"`
        );
        it.value = STAT_NEW_VALUE;
        it.label = STAT_NEW_LABEL;
      });
    }
  }

  console.log('\nChanges:');
  changes.forEach((c) => console.log('  • ' + c));

  if (dry) {
    console.log('\n(dry run — nothing written)');
  } else {
    await prisma.page.update({ where: { id: page.id }, data: { blocks } });
    console.log('\nSaved to the database.');
  }
} catch (err) {
  console.error('\nFailed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
