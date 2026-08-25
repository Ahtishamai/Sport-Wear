import Link from 'next/link';
import Image from 'next/image';
import type { SiteSettings } from '@/lib/settings';
import type { NavLink } from './Header';
import { QuoteButton } from './QuoteButton';
import { edSetting } from '@/components/blocks/primitives';

export function Footer({
  settings,
  shop,
  company,
}: {
  settings: SiteSettings;
  shop: NavLink[];
  company: NavLink[];
}) {
  return (
    <footer className="bg-ink text-white" data-reveal-root>
      <div className="mx-auto grid max-w-[1320px] gap-9 px-5 pt-[66px] pb-10 md:px-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="inline-block" {...edSetting('logoLight', 'image')}>
          <Image
            src={settings.logoLight}
            alt={settings.siteName}
            width={180}
            height={32}
            className="h-8 w-auto object-contain"
          />
          </div>
          <p className="mt-5 max-w-[300px] text-[15px] leading-relaxed text-ondark-3" {...edSetting('footerBlurb')}>
            {settings.footerBlurb}
          </p>
          <div className="mt-6 flex gap-2.5">
            {settings.social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-[38px] w-[38px] items-center justify-center border border-white/20 text-[13px] font-semibold text-ondark-3 transition-colors hover:border-brand hover:text-brand"
              >
                {s.short}
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Shop" links={shop} />
        <FooterCol title="Company" links={company} />

        <div>
          <h3 className="mb-5 font-display text-[12px] font-extrabold uppercase tracking-[.16em] text-white">
            Get in touch
          </h3>
          <ul className="space-y-2.5 text-[15px] font-medium text-ondark-3">
            <li>
              <a href={settings.phoneHref} className="transition-colors hover:text-brand">
                <span {...edSetting('phone')}>{settings.phone}</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${settings.email}`}
                className="transition-colors hover:text-brand"
              >
                <span {...edSetting('email')}>{settings.email}</span>
              </a>
            </li>
            <li className="leading-relaxed" {...edSetting('address')}>
              {settings.address}
            </li>
          </ul>
          <QuoteButton className="btn btn-yellow btn-md mt-6" subject="Custom team kit">
            Request a quote
          </QuoteButton>
        </div>
      </div>

      <div className="border-t border-white/12">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-[13px] font-medium text-ondark-4 md:px-10">
          <span {...edSetting('copyright')}>{settings.copyright}</span>
          <span {...edSetting('footerMeta')}>{settings.footerMeta}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h3 className="mb-5 font-display text-[12px] font-extrabold uppercase tracking-[.16em] text-white">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.id}>
            <Link
              href={l.href}
              className="text-[15px] font-medium text-ondark-3 transition-colors hover:text-brand"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
