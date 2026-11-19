import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { BlockRenderer } from '@/components/blocks/Renderer';
import { pageDescription, pageTitle } from '@/lib/seo';

/**
 * An ad landing page: /lp/custom-baseball-jerseys is the CMS page with the
 * slug "lp-custom-baseball-jerseys", built and edited in the page builder like
 * any other page, drawn inside the stripped-down frame in ../layout.tsx.
 *
 * Asked not to be indexed. It exists for paid clicks and repeats what the
 * collection pages say, and a second page competing with them in search would
 * only split their ranking. Google Ads reviews the page regardless.
 */
export const revalidate = 300;

const cmsSlug = (slug: string) => `lp-${slug}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page, s] = await Promise.all([getPage(cmsSlug(slug)), getSettings()]);
  if (!page) return {};
  const title = pageTitle(page.seoTitle || page.title, s.siteName);
  const description = pageDescription(page.seoDescription, s.defaultSeoDescription);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/lp/${slug}` },
    openGraph: { title, description, images: page.ogImage ? [page.ogImage] : undefined },
    robots: { index: false, follow: false },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(cmsSlug(slug));
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} context={{ leadSource: `landing:${slug}` }} />;
}
