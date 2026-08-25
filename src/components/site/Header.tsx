'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useQuote } from './QuoteProvider';

export type NavLink = { id: string; label: string; href: string; newTab?: boolean };

export function AnnouncementBar({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="bg-ink px-5 py-[11px] text-white">
      <div className="flex flex-wrap items-center justify-center gap-x-[26px] gap-y-1 text-center text-[13px] font-semibold uppercase tracking-[.06em]">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-[26px]">
            {t}
            {i < items.length - 1 && (
              <span aria-hidden="true" className="text-brand">
                ✦
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
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
      <div className="flex flex-wrap items-center gap-7 px-5 py-3.5 md:px-10">
        <Link href="/" aria-label={`${siteName} — home`} className="shrink-0">
          <Image
            src={logo}
            alt={siteName}
            width={160}
            height={30}
            priority
            className="h-[30px] w-auto object-contain"
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

        <div className="ml-auto flex items-center gap-4">
          <a
            href={phoneHref}
            className="hidden whitespace-nowrap text-[15px] font-semibold text-ink md:block"
          >
            {phone}
          </a>
          <button
            type="button"
            onClick={() => open('Custom team kit')}
            className="btn btn-yellow btn-md text-[13px] max-sm:px-4 max-sm:py-3 max-sm:text-[11px]"
          >
            Request a quote
          </button>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="p-1 lg:hidden"
          >
            <Icon name="menu" size={26} />
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
          <div className="animate-slide-in relative ml-auto flex h-full w-[85%] max-w-[360px] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <Image
                src={logo}
                alt={siteName}
                width={140}
                height={26}
                className="h-[26px] w-auto object-contain"
              />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2">
                <Icon name="close" size={22} />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col p-5">
              {nav.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  className="border-b border-hairline py-4 text-[15px] font-semibold uppercase tracking-[.04em] text-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3 p-5">
              <a href={phoneHref} className="block text-[16px] font-semibold text-ink">
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
