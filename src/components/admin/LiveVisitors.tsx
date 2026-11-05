'use client';

import { useEffect, useState } from 'react';

/**
 * The number of people on the site, kept fresh.
 *
 * It polls one small endpoint rather than reloading the screen, and only
 * while the tab is actually in front of somebody. A traffic screen left
 * open on a second monitor for a week would otherwise ask the database for
 * a connection every thirty seconds, forever, out of an allowance of five
 * hundred an hour for the whole shop.
 */
export function LiveVisitors({
  initial,
  seconds = 30,
}: {
  initial: { visitors: number; views: number };
  seconds?: number;
}) {
  const [live, setLive] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/admin/live', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as { visitors: number; views: number };
        if (!cancelled) {
          setLive(next);
          setStale(false);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    }

    const id = setInterval(poll, seconds * 1000);
    // Catch up the moment somebody comes back to the tab.
    document.addEventListener('visibilitychange', poll);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [seconds]);

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="flex items-baseline gap-2.5">
        <span
          aria-hidden="true"
          className={live.visitors > 0 ? 'inline-block h-2.5 w-2.5 rounded-full bg-[#16A34A]' : 'inline-block h-2.5 w-2.5 rounded-full bg-[#C9CAC6]'}
        />
        <span className="font-display text-[34px] font-black leading-none">{live.visitors}</span>
      </span>
      <span className="text-[13px] text-[#6B6D74]">
        {live.visitors === 1 ? 'person on the site' : 'people on the site'} in the last 5 minutes
        {live.views > 0 && `, ${live.views} ${live.views === 1 ? 'page' : 'pages'} between them`}
        {stale && ' · figure is not updating'}
      </span>
    </div>
  );
}
