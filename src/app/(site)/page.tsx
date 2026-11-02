import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { pageDescription, pageTitle } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [page, s] = await Promise.all([getPage('home'), getSettings()]);
  const title = pageTitle(page?.seoTitle || s.defaultSeoTitle, s.siteName);
  const description = pageDescription(page?.seoDescription, s.defaultSeoDescription);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description },
  };
}

export default async function HomePage() {
  const page = await getPage('home');
  if (!page) notFound();
  return <BlockRenderer blocks={page.blocks} />;
}
