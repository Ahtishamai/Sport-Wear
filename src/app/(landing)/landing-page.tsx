import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { landingCmsSlug } from '@/lib/landing';
import { pageDescription, pageTitle } from '@/lib/seo';
import { BlockRenderer } from '@/components/blocks/Renderer';

/**
 * What every landing page route does: draw the CMS page "lp-<path>" and say
 * what it is called. See lib/landing.ts.
 *
 * Asked not to be indexed: it exists for paid clicks and repeats what the
 * collection pages say, and a second page competing with them in search would
 * only split their ranking. Google Ads reviews the page regardless.
 */
export async function landingMetadata(path: string): Promise<Metadata> {
  const [page, s] = await Promise.all([getPage(landingCmsSlug(path)), getSettings()]);
  if (!page) return {};
  const title = pageTitle(page.seoTitle || page.title, s.siteName);
  const description = pageDescription(page.seoDescription, s.defaultSeoDescription);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${path}` },
    openGraph: { title, description, images: page.ogImage ? [page.ogImage] : undefined },
    robots: { index: false, follow: false },
  };
}

export async function LandingPage({ path }: { path: string }) {
  const page = await getPage(landingCmsSlug(path));
  if (!page) notFound();
  return <BlockRenderer blocks={page.blocks} context={{ leadSource: `landing:${path}` }} />;
}
