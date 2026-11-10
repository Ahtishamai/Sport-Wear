import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { pageDescription, pageTitle } from '@/lib/seo';
import { freshnessMeta, webPageLd } from '@/lib/schema';
import { JsonLd } from '@/components/site/JsonLd';

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
    // The same two dates the home page's structured data and the sitemap give.
    other: page ? freshnessMeta(page) : {},
  };
}

export default async function HomePage() {
  const page = await getPage('home');
  if (!page) notFound();
  return (
    <>
      <BlockRenderer blocks={page.blocks} />
      <JsonLd
        data={webPageLd({
          path: '/',
          name: page.title,
          description: page.seoDescription,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        })}
      />
    </>
  );
}
