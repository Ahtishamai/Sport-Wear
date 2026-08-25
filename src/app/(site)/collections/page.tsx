import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import { CatalogView, type CatalogSearchParams } from '@/components/site/CatalogView';
import { getPage } from '@/lib/queries';
import { BlockRenderer } from '@/components/blocks/Renderer';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const [page, s] = await Promise.all([getPage('collections'), getSettings()]);
  return {
    title: page?.seoTitle || 'Sportswear collection',
    description:
      page?.seoDescription ||
      'Browse every custom baseball and softball uniform, pant, jacket and bag we make. Free mockup in 24 hours.',
    alternates: { canonical: '/collections' },
  };
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const sp = await searchParams;
  const page = await getPage('collections');

  return (
    <>
      <CatalogView
        handle="all"
        title={page?.title || 'Sportswear collection'}
        intro={
          (page?.seoDescription as string | null) ||
          'Every piece is fully customizable — sublimated in-house, with names, numbers and logos included. Pick a style and request a quote; we reply with a free mockup in 24 hours.'
        }
        searchParams={sp}
      />
      {page && <BlockRenderer blocks={page.blocks} />}
    </>
  );
}
