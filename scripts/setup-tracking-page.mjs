/**
 * Puts the order-tracking block on /track-order, replacing the placeholder copy.
 *   node -r dotenv/config scripts/setup-tracking-page.mjs
 * Safe to re-run.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const page = await prisma.page.findUnique({ where: { slug: 'track-order' } });
  if (!page) throw new Error('The track-order page does not exist.');

  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  if (blocks.some((b) => b?.type === 'orderTracking')) {
    console.log('Order tracking is already on the page — nothing to do.');
  } else {
    const next = [
      blocks.find((b) => b?.type === 'pageHeader') ?? {
        id: 'b_track_hdr',
        type: 'pageHeader',
        props: {
          theme: 'light',
          eyebrow: 'Order status',
          heading: 'Track your order',
          body: '',
          showBreadcrumb: true,
          image: '',
        },
      },
      {
        id: 'b_track_ui',
        type: 'orderTracking',
        props: {
          eyebrow: '',
          heading: 'Track your order',
          body: 'Enter your order number to check the status of your order.',
          background: 'white',
        },
      },
      ...blocks.filter((b) => b?.type === 'ctaBand'),
    ];

    await prisma.page.update({ where: { id: page.id }, data: { blocks: next } });
    console.log(`Track order page rebuilt with ${next.length} sections.`);
  }
} catch (err) {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
