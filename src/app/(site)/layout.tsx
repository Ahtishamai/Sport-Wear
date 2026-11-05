import { getSettings } from '@/lib/settings';
import { getNav, getNavCollections } from '@/lib/queries';
import { QuoteProvider } from '@/components/site/QuoteProvider';
import { ShopCartProvider } from '@/components/shop/CartProvider';
import { AnnouncementBar, Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { ScrollProgress, SiteEffects } from '@/components/site/SiteEffects';
import { EditBar } from '@/components/site/EditBar';
import { Beacon } from '@/components/site/Beacon';
import { JsonLd } from '@/components/site/JsonLd';
import { businessLd, websiteLd } from '@/lib/schema';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, nav, collections] = await Promise.all([
    getSettings(),
    getNav(),
    getNavCollections(),
  ]);

  return (
    // The cart follows the shopper around the catalogue, so it lives here.
    <ShopCartProvider>
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
        collections={collections}
        logo={settings.logoDark}
        phone={settings.phone}
        phoneHref={settings.phoneHref}
        siteName={settings.siteName}
      />
      <main id="main">{children}</main>
      <Footer settings={settings} shop={nav.footerShop} company={nav.footerCompany} />
      <EditBar />
      {/* Counts the view. Never runs in the admin, which is a layout of its own. */}
      <Beacon />

      {/* One business and one site, declared once; see lib/schema.ts. */}
      <JsonLd data={businessLd(settings)} />
      <JsonLd data={websiteLd(settings.siteName)} />
    </QuoteProvider>
    </ShopCartProvider>
  );
}
