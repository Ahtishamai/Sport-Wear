import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { BlockRenderer } from '@/components/blocks/Renderer';

export const revalidate = 300;

const RESERVED = new Set(['home', 'collections', 'products', 'team-packages', 'admin', 'api']);

export async function generateStaticParams() {
  try {
    const pages = await prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
    });
    return pages.filter((p) => !RESERVED.has(p.slug)).map((p) => ({ slug: p.slug }));
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
  if (!page) return {};
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
  if (!page) notFound();

  return (
    <BlockRenderer
      blocks={page.blocks}
      context={{ breadcrumb: [{ label: 'Home', href: '/' }, { label: page.title }] }}
    />
  );
}
