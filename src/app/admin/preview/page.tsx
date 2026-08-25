import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import {
  getCollectionCards,
  getPackages,
  getProductsForBlock,
  getNav,
  getReviews,
} from '@/lib/queries';
import { QuoteProvider } from '@/components/site/QuoteProvider';
import { AnnouncementBar, Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { LivePreview, type PreviewData } from '@/components/admin/LivePreview';
import { normalizeBlocks } from '@/components/blocks/Renderer';
import type { CardProduct } from '@/components/blocks/primitives';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/**
 * Chromeless render surface for the page builder's iframe. Everything the
 * blocks might need is loaded once and handed to the client renderer, so
 * prop edits re-render instantly without another round trip.
 */
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/admin/login');

  const { slug } = await searchParams;

  const [page, settings, products, featured, packages, reviews, collections, nav, faqRows] =
    await Promise.all([
      slug ? prisma.page.findUnique({ where: { slug } }) : null,
      getSettings(),
      getProductsForBlock({ source: 'newest', limit: 24 }),
      getProductsForBlock({ source: 'featured', limit: 12 }),
      getPackages(8),
      getReviews(12),
      getCollectionCards(24),
      getNav(),
      prisma.faq.findMany({ where: { published: true }, orderBy: { position: 'asc' } }),
    ]);

  const byCollection: Record<string, CardProduct[]> = {};
  for (const c of collections) {
    byCollection[c.handle] = await getProductsForBlock({
      source: 'collection',
      collectionHandle: c.handle,
      limit: 12,
    });
  }

  const faqs: PreviewData['faqs'] = {};
  for (const f of faqRows) {
    (faqs[f.group] ??= []).push({ id: f.id, question: f.question, answer: f.answer });
  }

  const data: PreviewData = {
    products,
    featured,
    byCollection,
    packages,
    reviews,
    faqs,
    collections,
    contact: {
      phone: settings.phone,
      phoneHref: settings.phoneHref,
      email: settings.email,
      address: settings.address,
    },
  };

  return (
    <QuoteProvider
      settings={{
        quoteHeadline: settings.quoteHeadline,
        quoteEyebrow: settings.quoteEyebrow,
        quoteReassurance: settings.quoteReassurance,
        quoteSuccessTitle: settings.quoteSuccessTitle,
        quoteSuccessBody: settings.quoteSuccessBody,
        deadlineOptions: settings.deadlineOptions,
        sportOptions: settings.sportOptions,
      }}
    >
      {settings.announcementEnabled && <AnnouncementBar items={settings.announcement} />}
      <Header
        nav={nav.header}
        logo={settings.logoDark}
        phone={settings.phone}
        phoneHref={settings.phoneHref}
        siteName={settings.siteName}
      />
      <LivePreview initialBlocks={normalizeBlocks(page?.blocks)} data={data} />
      <Footer settings={settings} shop={nav.footerShop} company={nav.footerCompany} />
    </QuoteProvider>
  );
}
