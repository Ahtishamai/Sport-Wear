import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { BlockRenderer } from '@/components/blocks/Renderer';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage('team-packages');
  return {
    title: page?.seoTitle || 'Team packages',
    description:
      page?.seoDescription ||
      'Per-player uniform packages that cover the whole season — fully customizable and quoted with no deposit.',
    alternates: { canonical: '/team-packages' },
  };
}

export default async function TeamPackagesPage() {
  const page = await getPage('team-packages');
  if (!page) notFound();
  return (
    <BlockRenderer
      blocks={page.blocks}
      context={{ breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Team packages' }] }}
    />
  );
}
