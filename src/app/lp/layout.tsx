import Image from 'next/image';
import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { QuoteProvider } from '@/components/site/QuoteProvider';
import { SiteEffects } from '@/components/site/SiteEffects';
import { EditBar } from '@/components/site/EditBar';
import { Beacon } from '@/components/site/Beacon';
import { Icon } from '@/components/site/Icon';
import { FORM_ANCHOR } from '@/components/landing/blocks';

/**
 * The frame around an ad landing page (/lp/…).
 *
 * Deliberately not the shop's header and footer. Somebody who clicked an ad
 * has one thing to do here, and every menu link is a way to wander off before
 * doing it. What stays is what earns trust or converts: the logo, a phone
 * number that dials, one button to the form — and, at the foot, the address,
 * contact details and privacy policy that Google Ads requires a landing page
 * to show.
 */
export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const year = new Date().getFullYear();

  return (
    <QuoteProvider
      settings={{
        quoteHeadline: s.quoteHeadline,
        quoteEyebrow: s.quoteEyebrow,
        quoteReassurance: s.quoteReassurance,
        quoteSuccessTitle: s.quoteSuccessTitle,
        quoteSuccessBody: s.quoteSuccessBody,
        deadlineOptions: s.deadlineOptions,
        sportOptions: s.sportOptions,
      }}
    >
      <SiteEffects />

      <header className="sticky top-0 z-50 border-b border-hairline bg-white/95 backdrop-blur">
        <div className="gutter flex h-[64px] items-center justify-between gap-4 md:h-[72px]">
          {/* Not a link: the home page is a door out of the funnel. */}
          <span className="flex items-center">
            {s.logoDark ? (
              <Image src={s.logoDark} alt={s.siteName} width={150} height={30} priority className="h-auto w-[110px] md:w-[140px]" />
            ) : (
              <span className="font-display text-[16px] font-black uppercase tracking-[.06em]">{s.siteName}</span>
            )}
          </span>
          <div className="flex items-center gap-2.5 md:gap-4">
            {s.phone && s.phoneHref && (
              <a
                href={s.phoneHref}
                className="flex items-center gap-2 text-[15px] font-semibold text-ink"
                aria-label={`Call ${s.phone}`}
              >
                <span className="flex h-10 w-10 items-center justify-center border border-hairline">
                  <Icon name="phone" size={18} />
                </span>
                <span className="hidden md:inline">{s.phone}</span>
              </a>
            )}
            <a href={`#${FORM_ANCHOR}`} className="btn btn-yellow btn-md hidden sm:inline-flex">
              Get free mockup
            </a>
          </div>
        </div>
      </header>

      {/* Room at the foot on phones for the bar below. */}
      <main id="main" className="pb-[76px] md:pb-0">
        {children}
      </main>

      <footer className="gutter border-t border-white/10 bg-ink py-8 text-[13px] text-white/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {s.siteName}
            {s.address ? ` · ${s.address}` : ''}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {s.phone && s.phoneHref && (
              <a href={s.phoneHref} className="hover:text-white">
                {s.phone}
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} className="hover:text-white">
                {s.email}
              </a>
            )}
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy policy
            </Link>
          </p>
        </div>
      </footer>

      {/* On a phone the form scrolls away; these two never do. */}
      <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-[auto_1fr] gap-2 border-t border-hairline bg-white p-2.5 shadow-[0_-8px_24px_rgba(0,0,0,.08)] md:hidden">
        {s.phoneHref && (
          <a
            href={s.phoneHref}
            className="btn btn-outline flex h-[52px] items-center gap-2 px-4"
            aria-label={`Call ${s.phone}`}
          >
            <Icon name="phone" size={18} />
            Call
          </a>
        )}
        <a href={`#${FORM_ANCHOR}`} className="btn btn-yellow flex h-[52px] items-center justify-center text-[15px]">
          Get my free mockup
        </a>
      </div>

      <EditBar />
      <Beacon />
    </QuoteProvider>
  );
}
