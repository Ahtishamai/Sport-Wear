'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

/** Loaded only when an admin actually turns editing on. */
const InlineEditor = dynamic(() => import('./InlineEditor').then((m) => m.InlineEditor), {
  ssr: false,
});

/** Loaded only on a page that turned out to be a dead end. */
const DeadEndBar = dynamic(() => import('./DeadEndBar').then((m) => m.DeadEndBar), {
  ssr: false,
});

/** Maps a public URL to the admin screen that edits it. */
export function adminEditHref(pathname: string) {
  if (pathname === '/') return '/admin/pages/home/edit';
  const product = pathname.match(/^\/products\/([^/]+)/);
  if (product) return `/admin/products/${product[1]}`;
  const collection = pathname.match(/^\/collections\/([^/]+)/);
  if (collection) return `/admin/collections/${collection[1]}`;
  if (pathname === '/collections') return '/admin/collections';
  if (pathname === '/team-packages') return '/admin/pages/team-packages/edit';
  const slug = pathname.replace(/^\//, '').split('/')[0];
  return slug ? `/admin/pages/${slug}/edit` : '/admin';
}

type Me = { name: string } | null;

/**
 * Front-of-site admin bar. Self-fetches the session so public pages stay
 * statically cacheable (no cookie read during render).
 */
export function EditBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [hidden, setHidden] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deadEnd, setDeadEnd] = useState<string | null>(null);
  const [ignored, setIgnored] = useState(false);

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

  /*
   * Whether this page turned out to be a dead end.
   *
   * The 404 view says so, because only the browser knows for certain which
   * address was asked for. Both the attribute and the event are read: the
   * attribute catches a page that was already rendered when this mounted,
   * the event catches one that renders afterwards.
   */
  useEffect(() => {
    const read = () => setDeadEnd(document.documentElement.dataset.deadEnd ?? null);
    const onSignal = (e: Event) =>
      setDeadEnd((e as CustomEvent<string | null>).detail ?? null);

    read();
    window.addEventListener('ds:dead-end', onSignal);
    return () => window.removeEventListener('ds:dead-end', onSignal);
  }, [pathname]);

  // Leaving the page cancels edit mode, and a dismissal only covers the page
  // it was made on.
  useEffect(() => {
    setEditing(false);
    setIgnored(false);
  }, [pathname]);

  if (!me) return null;

  if (editing) return <InlineEditor onExit={() => setEditing(false)} />;

  // A dead end is the one thing worth interrupting for: there is nothing on
  // this page to edit, and mending it is the only reason an admin is here.
  if (deadEnd && !ignored) {
    return <DeadEndBar path={deadEnd} onDone={() => setIgnored(true)} />;
  }

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[150] flex items-center gap-1 rounded-full border border-white/15 bg-ink px-2 py-1.5 text-white shadow-lg print:hidden">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-ink">
        {me.name.slice(0, 2).toUpperCase()}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-bold text-ink transition-opacity hover:opacity-90"
      >
        <Icon name="pencil" size={13} />
        Edit content
      </button>
      <Link
        href={adminEditHref(pathname)}
        className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/10"
      >
        Sections
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
