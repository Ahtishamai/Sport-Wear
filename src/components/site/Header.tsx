'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useQuote } from './QuoteProvider';
import { edSetting } from '@/components/blocks/primitives';

export type NavLink = { id: string; label: string; href: string; newTab?: boolean };

/**
 * Announcement bar — a continuous marquee at every width.
 *
 * The list is rendered six times and the animation travels exactly half the
 * track, so the loop is seamless with no jump at the wrap. Half the track has
 * to be at least as wide as the viewport or a gap appears at the wrap-around;
 * six copies covers displays up to ~3500px, where four fell short on
 * ultra-wide monitors. Each copy carries its own trailing gap as padding, so
 * the halfway point lands exactly on a copy boundary.
 */
export function AnnouncementBar({ items }: { items: string[] }) {
  if (!items.length) return null;

  // Only the first copy is editable and announced; the rest exist purely to
  // fill the track, so they carry no edit targets and no duplicate text for
  // screen readers.
  const Row = ({ live }: { live?: boolean }) => (
    <div
      aria-hidden={live ? undefined : true}
      className="flex shrink-0 items-center gap-4 pr-4 md:gap-[26px] md:pr-[26px]"
    >
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-4 md:gap-[26px]">
          <span {...(live ? edSetting(`announcement.${i}`) : {})}>{t}</span>
          <span aria-hidden="true" className="text-brand">
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="bg-ink text-white">
      <div className="marquee-mask pause-on-hover overflow-hidden py-2 md:py-[11px]">
        <div
          data-marquee
          className="animate-marq flex w-max whitespace-nowrap text-[11px] font-semibold uppercase tracking-[.08em] md:text-[13px] md:tracking-[.06em]"
          style={{ animationDuration: '48s' }}
        >
          <Row live />
          <Row />
          <Row />
          <Row />
          <Row />
          <Row />
        </div>
      </div>
    </div>
  );
}

/** Falls back to the site name if the logo file is missing, rather than
 *  rendering a broken-image icon in the header. */
function Logo({
  src,
  siteName,
  className,
  priority,
}: {
  src: string;
  siteName: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="font-display text-[15px] font-black uppercase leading-none tracking-[.06em] sm:text-[17px]">
        {siteName}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={siteName}
      width={200}
      height={40}
      priority={priority}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function Header({
  nav,
  logo,
  phone,
  phoneHref,
  siteName,
}: {
  nav: NavLink[];
  logo: string;
  phone: string;
  phoneHref: string;
  siteName: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { open } = useQuote();

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="sticky top-0 z-[60] border-b border-hairline bg-[rgba(255,255,255,.94)] backdrop-blur-[14px]">
      {/* One row at every width — never wraps. */}
      <div className="flex items-center gap-3 px-4 py-2.5 md:gap-7 md:px-10 md:py-3.5">
        <Link
          href="/"
          aria-label={`${siteName} — home`}
          className="flex shrink-0 items-center"
          {...edSetting('logoDark', 'image')}
        >
          <Logo
            src={logo}
            siteName={siteName}
            priority
            className="h-[26px] w-auto max-w-[120px] object-contain sm:max-w-[170px] md:h-[30px]"
          />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-7 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              target={n.newTab ? '_blank' : undefined}
              rel={n.newTab ? 'noopener noreferrer' : undefined}
              data-active={isActive(n.href)}
              className="nav-link whitespace-nowrap text-[14px] font-semibold uppercase tracking-[.04em] text-body transition-colors hover:text-ink data-[active=true]:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-4">
          <a
            href={phoneHref}
            className="hidden whitespace-nowrap text-[15px] font-semibold text-ink md:block"
          >
            <span {...edSetting('phone')}>{phone}</span>
          </a>

          {/* Call button — phones only, where tapping to call beats reading a number. */}
          <a
            href={phoneHref}
            aria-label={`Call ${phone}`}
            className="flex h-10 w-10 items-center justify-center border border-hairline text-ink transition-colors hover:border-ink md:hidden"
          >
            <Icon name="phone" size={17} />
          </a>

          <button
            type="button"
            onClick={() => open('Custom team kit')}
            className="btn btn-yellow whitespace-nowrap px-3 py-2.5 text-[11px] tracking-[.06em] sm:px-4 md:px-[22px] md:py-[13px] md:text-[13px] md:tracking-[.1em]"
          >
            <span className="sm:hidden">Quote</span>
            <span className="hidden sm:inline">Request a quote</span>
          </button>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center text-ink lg:hidden"
          >
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgba(16,17,20,.45)] backdrop-blur-[3px]"
          />
          <div className="animate-slide-in relative ml-auto flex h-full w-[86%] max-w-[360px] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
              <Logo
                src={logo}
                siteName={siteName}
                className="h-[26px] w-auto max-w-[150px] object-contain"
              />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex flex-col overflow-y-auto px-5">
              {nav.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  data-active={isActive(n.href)}
                  className="flex items-center justify-between border-b border-hairline py-4 text-[15px] font-semibold uppercase tracking-[.04em] text-ink data-[active=true]:text-brand-text"
                >
                  {n.label}
                  <Icon name="arrowRight" size={16} />
                </Link>
              ))}
            </nav>

            <div className="mt-auto space-y-3 border-t border-hairline p-5">
              <a
                href={phoneHref}
                className="flex items-center gap-2.5 text-[16px] font-semibold text-ink"
              >
                <Icon name="phone" size={17} />
                {phone}
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  open('Custom team kit');
                }}
                className="btn btn-yellow btn-lg w-full"
              >
                Request a quote
              </button>
              <p className="text-center text-[12px] text-muted">
                Free mockup in 24 hours · No deposit
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
