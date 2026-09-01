import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { getTeamStore, getStoreSlugs } from '@/lib/store-queries';
import { StoreFront } from '@/components/store/StoreFront';

export const revalidate = 300;

const RESERVED = new Set(['home', 'collections', 'products', 'team-packages', 'admin', 'api']);

export async function generateStaticParams() {
  try {
    const pages = await prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
    });
    const stores = await getStoreSlugs();
    return [...pages.map((p) => p.slug), ...stores]
      .filter((slug) => !RESERVED.has(slug))
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page, s] = await Promise.all([getPage(slug), getSettings()]);
  if (!page) {
    const store = await getTeamStore(slug);
    if (!store) return {};
    return {
      title: store.seoTitle || `${store.header.name} team store`,
      description:
        store.seoDescription ||
        `Order ${store.header.name} custom uniforms and team apparel online.`,
      alternates: { canonical: `/${slug}` },
      robots: { index: false, follow: true },
    };
  }
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || s.defaultSeoDescription,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: page.seoTitle || page.title,
      description: page.seoDescription || s.defaultSeoDescription,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const page = await getPage(slug);

  // A slug with no CMS page may belong to a team store, which lives at the
  // root so teams can be given a short link such as /mid-illini-bandits.
  if (!page) {
    const store = await getTeamStore(slug);
    if (!store) notFound();
    return <StoreFront store={store.header} items={store.items} />;
  }

  return (
    <BlockRenderer
      blocks={page.blocks}
      context={{ breadcrumb: [{ label: 'Home', href: '/' }, { label: page.title }] }}
    />
  );
}
