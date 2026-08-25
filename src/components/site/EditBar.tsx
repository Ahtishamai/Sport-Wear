'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/** Maps a public URL to the admin screen that edits it. */
export function adminEditHref(pathname: string) {
  if (pathname === '/') return '/admin/pages/home/edit';
  const product = pathname.match(/^\/products\/([^/]+)/);
  if (product) return `/admin/products/${product[1]}`;
  const collection = pathname.match(/^\/collections\/([^/]+)/);
  if (collection) return `/admin/collections/${collection[1]}`;
  if (pathname === '/collections') return '/admin/collections';
  if (pathname === '/team-packages') return '/admin/packages';
  const slug = pathname.replace(/^\//, '').split('/')[0];
  return slug ? `/admin/pages/${slug}/edit` : '/admin';
}

type Me = { name: string } | null;

/**
 * Front-of-site admin bar. Self-fetches the session so the public pages stay
 * statically cacheable (no cookie read during render).
 */
export function EditBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.user) setMe({ name: d.user.name });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!me || hidden) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[150] flex items-center gap-1 rounded-full border border-white/15 bg-ink px-2 py-1.5 text-white shadow-lg print:hidden">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-ink">
        {me.name.slice(0, 2).toUpperCase()}
      </span>
      <Link
        href={adminEditHref(pathname)}
        className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/10"
      >
        Edit this page
      </Link>
      <span aria-hidden="true" className="h-4 w-px bg-white/20" />
      <Link
        href="/admin"
        className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/10"
      >
        Dashboard
      </Link>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Hide the admin bar"
        className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
