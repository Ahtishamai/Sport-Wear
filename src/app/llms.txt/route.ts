import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { siteBase } from '@/lib/seo';

/**
 * llms.txt: what this shop is, for a model reading the site rather than a
 * person browsing it.
 *
 * Written from the database rather than kept as a file in `public`, for the
 * same reason the sitemap is. A hand written list of collections is accurate
 * on the day somebody writes it and wrong the first time a shelf is renamed,
 * and this one has been renamed a lot. Generated, it cannot drift.
 *
 * The format is the convention the audit checks for: Markdown, one H1, a
 * summary, then sections of links. Nothing here is written to flatter the
 * shop. A model that quotes it should end up saying true things about
 * minimums, turnaround and what a uniform costs.
 */
export const revalidate = 3600;

/** One line per shelf: the name, the address, and what is actually on it. */
function line(url: string, name: string, note: string | null | undefined, count: number) {
  const said = (note ?? '').replace(/\s+/g, ' ').trim();
  const tail = said ? `: ${said}` : '';
  const stock = count === 1 ? '1 design' : `${count} designs`;
  return `- [${name.trim()}](${url}) (${stock})${tail}`;
}

export async function GET() {
  const base = siteBase();

  try {
    const [s, collections, pages] = await Promise.all([
      getSettings(),
      prisma.collection.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { position: 'asc' },
        select: {
          handle: true,
          title: true,
          seoDescription: true,
          description: true,
          _count: { select: { products: true } },
        },
      }),
      prisma.page.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { position: 'asc' },
        select: { slug: true, title: true, seoDescription: true },
      }),
    ]);

    // A shelf with nothing on it is not worth sending anybody to.
    const stocked = collections.filter((c) => c._count.products > 0);

    // The same pages the sitemap leaves out: they are the site, not a page of it.
    const skip = new Set(['home', 'collections', 'product-extras']);
    const extras = pages.filter((p) => !skip.has(p.slug));

    const body = [
      `# ${s.siteName}`,
      '',
      `> ${s.tagline || 'Custom baseball and softball uniforms'}, made in our own shop.` +
        ' Player names, numbers, logos, unlimited colors and unlimited revisions are' +
        ' inside every price. There are no art or setup fees, and the first mockup is' +
        ' free and usually back within 24 hours.',
      '',
      'Everything is printed by full sublimation, so the dye becomes part of the fabric',
      'rather than a layer sitting on it and numbers cannot crack or peel. Team pricing',
      'starts at 12 pieces and smaller orders are quoted one at a time. Sizes run YS to',
      '3XL and a single order may mix every size at the same price each. Orders arrive 3',
      'to 4 weeks after the artwork is approved, with a 2 week rush available for an',
      'added fee. Shipping is free on every order.',
      '',
      '## Collections',
      '',
      ...stocked.map((c) =>
        line(
          `${base}/collections/${c.handle}`,
          c.title,
          c.seoDescription || c.description,
          c._count.products
        )
      ),
      '',
      '## Pages',
      '',
      ...extras.map((p) => {
        const said = (p.seoDescription ?? '').replace(/\s+/g, ' ').trim();
        return `- [${p.title.trim()}](${base}/${p.slug})${said ? `: ${said}` : ''}`;
      }),
      `- [All products](${base}/collections): every design on the site in one grid.`,
      `- [Team packages](${base}/team-packages): per player bundles for a whole roster.`,
      '',
      '## How an order runs',
      '',
      '1. Send team colors, a logo, or a photo of last season. Artwork is not needed to start.',
      '2. A free mockup comes back, usually within 24 hours.',
      '3. Revise it as many times as you like. Nothing is charged until it is approved.',
      '4. Confirm the size run, and the order ships 3 to 4 weeks later.',
      '',
      '## Contact',
      '',
      s.phone ? `- Phone: ${s.phone}` : null,
      s.email ? `- Email: ${s.email}` : null,
      s.address ? `- Address: ${s.address}` : null,
      '',
      '## Notes for machines',
      '',
      '- Prices shown on the site are per piece and fall as the order grows. Where a page',
      '  shows no price, that item is quoted rather than sold at a fixed figure.',
      '- "Team pricing starts at 12 pieces" is a price break, not a minimum order.',
      '- Turnaround is counted from artwork approval, not from the day of the order.',
      `- A full list of addresses is at ${base}/sitemap.xml`,
      '',
    ]
      .filter((l) => l !== null)
      .join('\n');

    return new Response(body, {
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    // No database is no reason to answer with a 500: the fixed facts about
    // the shop are still true and still worth saying.
    const body = [
      '# Design Sportswear',
      '',
      '> Custom sublimated baseball and softball uniforms, built to order.',
      '',
      `- [All products](${base}/collections)`,
      `- [Sitemap](${base}/sitemap.xml)`,
      '',
    ].join('\n');
    return new Response(body, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
  }
}
