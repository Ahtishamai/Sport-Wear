import { getSettings } from '@/lib/settings';
import { getNav } from '@/lib/queries';
import { QuoteProvider } from '@/components/site/QuoteProvider';
import { AnnouncementBar, Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { ScrollProgress, SiteEffects } from '@/components/site/SiteEffects';
import { EditBar } from '@/components/site/EditBar';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, nav] = await Promise.all([getSettings(), getNav()]);

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
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollProgress />
      <SiteEffects />
      {settings.announcementEnabled && <AnnouncementBar items={settings.announcement} />}
      <Header
        nav={nav.header}
        logo={settings.logoDark}
        phone={settings.phone}
        phoneHref={settings.phoneHref}
        siteName={settings.siteName}
      />
      <main id="main">{children}</main>
      <Footer settings={settings} shop={nav.footerShop} company={nav.footerCompany} />
      <EditBar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: settings.siteName,
            description: settings.defaultSeoDescription,
            telephone: settings.phone,
            email: settings.email,
            address: { '@type': 'PostalAddress', streetAddress: settings.address },
            url: process.env.NEXT_PUBLIC_SITE_URL,
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '1000',
            },
          }),
        }}
      />
    </QuoteProvider>
  );
}
