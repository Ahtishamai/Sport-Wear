import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { BlockRenderer } from '@/components/blocks/Renderer';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [page, s] = await Promise.all([getPage('home'), getSettings()]);
  return {
    title: page?.seoTitle || s.defaultSeoTitle,
    description: page?.seoDescription || s.defaultSeoDescription,
    alternates: { canonical: '/' },
  };
}

export default async function HomePage() {
  const page = await getPage('home');
  if (!page) notFound();
  return <BlockRenderer blocks={page.blocks} />;
}
