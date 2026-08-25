import { prisma, plain } from '@/lib/db';
import { AdminPage } from '@/components/admin/ui';
import { NavigationEditor } from '@/components/admin/NavigationEditor';

export const dynamic = 'force-dynamic';

export default async function NavigationPage() {
  const [items, pages, collections] = await Promise.all([
    prisma.navItem.findMany({ orderBy: { position: 'asc' } }),
    prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true },
      orderBy: { title: 'asc' },
    }),
    prisma.collection.findMany({
      where: { status: 'PUBLISHED' },
      select: { handle: true, title: true },
      orderBy: { position: 'asc' },
    }),
  ]);

  const suggestions = [
    { label: 'Home', href: '/' },
    { label: 'Collections', href: '/collections' },
    { label: 'Team packages', href: '/team-packages' },
    ...collections.map((c) => ({ label: c.title, href: `/collections/${c.handle}` })),
    ...pages
      .filter((p) => !['home', 'collections', 'team-packages', 'product-extras'].includes(p.slug))
      .map((p) => ({ label: p.title, href: `/${p.slug}` })),
  ];

  return (
    <AdminPage
      title="Navigation"
      description="The header menu and the two footer link columns."
    >
      <NavigationEditor items={plain(items)} suggestions={suggestions} />
    </AdminPage>
  );
}
