import Image from 'next/image';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/settings';
import { Icon } from '@/components/site/Icon';
import { SocialIcon } from '@/components/site/SocialIcon';
import { FORM_ANCHOR } from './blocks';

/**
 * The footer of the pinstripe landing page.
 *
 * It looks like the shop's footer, but it has no menu of other collections:
 * those columns are links out of the page, to shirts, pants and bags, and
 * this page is about one collection. In their place it repeats what the page
 * promises and gives every way to get in touch. It keeps what Google Ads
 * wants a landing page to show: the business's name, address, phone number,
 * email and privacy policy.
 */
export function LandingFooter({ s }: { s: SiteSettings }) {
  const year = new Date().getFullYear();
  const promises = [
    'Stripe printed into the fabric — never peels or frays',
    'Any two colors, at no extra cost',
    'Team name & numbers included',
    'Youth to adult 3XL, one price',
    'From $45 a jersey',
  ];

  return (
    <footer className="bg-ink text-white">
      <div className="gutter grid gap-10 pb-10 pt-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1.2fr_1fr] lg:pt-[66px]">
        <div>
          {s.logoLight ? (
            <Image src={s.logoLight} alt={s.siteName} width={180} height={32} className="h-8 w-auto object-contain" />
          ) : (
            <span className="font-display text-[18px] font-black uppercase tracking-[.06em]">{s.siteName}</span>
          )}
          <p className="mt-5 max-w-[340px] text-[15px] leading-relaxed text-ondark-3">
            Custom pinstripe baseball and softball uniforms, printed into the fabric in your team
            colors. Free mockup in 24 hours, delivered in 3–4 weeks.
          </p>
          {s.social?.length > 0 && (
            <div className="mt-6 flex gap-2.5">
              {s.social.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  title={link.label}
                  className="flex h-[38px] w-[38px] items-center justify-center overflow-hidden border border-white/20 text-[13px] font-semibold text-ondark-3 transition-opacity hover:border-brand hover:opacity-80"
                >
                  <SocialIcon link={link} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-5 font-display text-[12px] font-extrabold uppercase tracking-[.16em] text-white">
            Pinstripe uniforms
          </h3>
          <ul className="space-y-2.5">
            {promises.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[15px] font-medium text-ondark-3">
                <Icon name="check" size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-brand" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-display text-[12px] font-extrabold uppercase tracking-[.16em] text-white">
            Get in touch
          </h3>
          <ul className="space-y-1.5 text-[15px] font-medium text-ondark-3">
            {s.phone && s.phoneHref && (
              <li>
                <a href={s.phoneHref} className="inline-flex items-center gap-2 py-0.5 transition-colors hover:text-brand">
                  <Icon name="phone" size={16} />
                  {s.phone}
                </a>
              </li>
            )}
            {s.email && (
              <li>
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 py-0.5 transition-colors hover:text-brand">
                  <Icon name="mail" size={16} />
                  {s.email}
                </a>
              </li>
            )}
            {s.address && (
              <li className="flex items-start gap-2 leading-relaxed">
                <Icon name="pin" size={16} className="mt-1 shrink-0" />
                {s.address}
              </li>
            )}
          </ul>
          <a href={`#${FORM_ANCHOR}`} className="btn btn-yellow btn-md mt-6">
            Get my free mockup
          </a>
        </div>
      </div>

      <div className="border-t border-white/12">
        <div className="gutter flex flex-wrap items-center justify-between gap-3 py-5 text-[13px] font-medium text-ondark-4">
          <span>
            © {year} {s.siteName}
            {s.footerMeta ? ` · ${s.footerMeta}` : ''}
          </span>
          <Link href="/privacy-policy" className="transition-colors hover:text-white">
            Privacy policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
