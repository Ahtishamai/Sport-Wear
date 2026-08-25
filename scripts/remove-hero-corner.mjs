/**
 * Clears the hero corner tab ("2026 / Team Lookbook") from every page that
 * still carries it. One-off; safe to re-run.
 *   node -r dotenv/config scripts/remove-hero-corner.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const pages = await prisma.page.findMany({ select: { id: true, slug: true, blocks: true } });
  let touched = 0;

  for (const page of pages) {
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    let changed = false;

    const next = blocks.map((b) => {
      if (b?.type !== 'hero') return b;
      if (!b.props?.cornerYear && !b.props?.cornerLabel) return b;
      changed = true;
      return { ...b, props: { ...b.props, cornerYear: '', cornerLabel: '' } };
    });

    if (changed) {
      await prisma.page.update({ where: { id: page.id }, data: { blocks: next } });
      console.log(`  cleared corner tab on /${page.slug === 'home' ? '' : page.slug}`);
      touched++;
    }
  }

  console.log(touched ? `\nUpdated ${touched} page(s).` : 'Nothing to change.');
} finally {
  await prisma.$disconnect();
}
