'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SessionUser } from '@/lib/auth';
import { Icon } from '@/components/site/Icon';
import type { AreaKey } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { ToastProvider } from './ui';

const NAV: {
  group: string;
  items: { label: string; href: string; icon: string; area?: AreaKey }[];
}[] = [
  {
    group: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin', icon: 'star' }],
  },
  {
    group: 'Leads',
    items: [
      { label: 'Quote requests', href: '/admin/quotes', icon: 'tag', area: 'orders' },
      { label: 'Contact messages', href: '/admin/contacts', icon: 'mail', area: 'orders' },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: 'shield', area: 'catalog' },
      { label: 'Collections', href: '/admin/collections', icon: 'palette', area: 'catalog' },
      { label: 'Team packages', href: '/admin/packages', icon: 'truck', area: 'catalog' },
    ],
  },
  {
    group: 'Team stores',
    items: [
      { label: 'Stores', href: '/admin/stores', icon: 'shield', area: 'stores' },
      { label: 'Store orders', href: '/admin/store-orders', icon: 'truck', area: 'orders' },
    ],
  },
  {
    group: 'Content',
    items: [
      { label: 'Pages', href: '/admin/pages', icon: 'chat', area: 'content' },
      { label: 'Reviews', href: '/admin/reviews', icon: 'star', area: 'content' },
      { label: 'FAQs', href: '/admin/faqs', icon: 'clock', area: 'content' },
      { label: 'Media', href: '/admin/media', icon: 'art', area: 'content' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { label: 'Navigation', href: '/admin/navigation', icon: 'ruler', area: 'settings' },
      { label: 'Site settings', href: '/admin/settings', icon: 'factory', area: 'settings' },
      { label: 'Users', href: '/admin/users', icon: 'check', area: 'users' },
    ],
  },
];

export function AdminShell({
  user,
  areas,
  children,
}: {
  user: SessionUser;
  areas: AreaKey[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Only show what this account can actually open. Groups left with nothing
  // in them disappear rather than sitting there as empty headings.
  const visibleNav = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.area || areas.includes(it.area)),
  })).filter((g) => g.items.length > 0);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#F4F4F2]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col bg-ink text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Link href="/admin" className="font-display text-[15px] font-black uppercase tracking-[.08em]">
            Design<span className="text-brand">SW</span>
          </Link>
          <button
            type="button"
            className="p-1 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {visibleNav.map((g) => (
            <div key={g.group} className="mb-6">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-white/35">
                {g.group}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded px-3 py-2 text-[13.5px] font-medium transition-colors',
                        isActive(it.href)
                          ? 'bg-brand text-ink'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon name={it.icon} size={16} />
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            target="_blank"
            className="mb-3 flex items-center gap-2 text-[12.5px] font-medium text-white/70 hover:text-brand"
          >
            <Icon name="arrowRight" size={14} />
            View the site
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-ink">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{user.name}</span>
              <span className="block truncate text-[11px] text-white/50">{user.role}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="rounded p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-[#E3E3DF] bg-white px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="p-1">
            <Icon name="menu" size={22} />
          </button>
          <span className="font-display text-[14px] font-black uppercase">Admin</span>
        </div>
        <div className="min-w-0 flex-1">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </div>
    </div>
  );
}
