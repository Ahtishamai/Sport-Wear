'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CHANNEL_COLOR, CHANNEL_LABEL, type Channel } from '@/lib/traffic';

export type Snapshot = {
  visitors: number;
  views: number;
  today: { visitors: number; sessions: number; views: number };
  channels: { channel: Channel; sessions: number; views: number }[];
  available: boolean;
};

/**
 * Who is on the site now, and what sent everybody who came today.
 *
 * Refreshes itself, but only while somebody is actually looking at the tab.
 * A dashboard left open on a second monitor would otherwise ask the
 * database for a connection every half minute for a week, out of an
 * allowance of five hundred an hour for the whole shop.
 */
export function LiveTraffic({
  initial,
  seconds = 30,
}: {
  initial: Snapshot;
  seconds?: number;
}) {
  const [snap, setSnap] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/admin/live', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as Snapshot;
        if (!cancelled) {
          setSnap(next);
          setStale(false);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    }

    const id = setInterval(poll, seconds * 1000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [seconds]);

  // Only the channels that actually sent somebody today, biggest first.
  const active = snap.channels
    .filter((c) => c.sessions > 0 || c.views > 0)
    .sort((a, b) => b.sessions - a.sessions || b.views - a.views);
  const total = active.reduce((a, c) => a + c.sessions, 0);

  return (
    /*
     * The sources column is capped rather than left to fill the window.
     * On a wide screen a 7% share was drawing a bar most of a metre long,
     * which reads as a lot of something rather than a little.
     */
    <div className="grid gap-6 md:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] md:gap-8">
      <div>
        <div className="flex items-baseline gap-2.5">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              snap.visitors > 0 ? 'bg-[#16A34A]' : 'bg-[#C9CAC6]'
            }`}
          />
          <span className="font-display text-[40px] font-black leading-none">{snap.visitors}</span>
        </div>
        <p className="mt-2 text-[13px] text-[#6B6D74]">
          {snap.visitors === 1 ? 'person on the site' : 'people on the site'} in the last 5 minutes
          {snap.views > 0 && `, ${snap.views} ${snap.views === 1 ? 'page' : 'pages'} between them`}
          {stale && ' · not updating'}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[#EFEFEC] pt-3 text-[13px]">
          <div>
            <dt className="text-[#6B6D74]">Visitors</dt>
            <dd className="font-display text-[19px] font-black">{snap.today.visitors}</dd>
          </div>
          <div>
            <dt className="text-[#6B6D74]">Visits</dt>
            <dd className="font-display text-[19px] font-black">{snap.today.sessions}</dd>
          </div>
          <div>
            <dt className="text-[#6B6D74]">Pages</dt>
            <dd className="font-display text-[19px] font-black">{snap.today.views}</dd>
          </div>
        </dl>
        <p className="mt-1 text-[12px] text-[#6B6D74]">So far today.</p>
      </div>

      <div className="min-w-0 xl:max-w-[760px]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.1em] text-[#6B6D74]">
          What sent them, today
        </p>
        {active.length === 0 ? (
          <p className="text-[13px] text-[#6B6D74]">
            Nobody has arrived yet today. Sources appear here as soon as somebody does.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {active.map((c) => {
              const share = total ? Math.round((c.sessions / total) * 100) : 0;
              return (
                <li key={c.channel}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0"
                        style={{ background: CHANNEL_COLOR[c.channel] }}
                      />
                      <span className="truncate font-semibold">{CHANNEL_LABEL[c.channel]}</span>
                    </span>
                    <span className="whitespace-nowrap">
                      <span className="font-semibold">{c.sessions}</span>
                      <span className="ml-1.5 text-[#6B6D74]">
                        {c.sessions === 1 ? 'visit' : 'visits'} · {share}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-[#EFEFEC]">
                    <div
                      className="h-full"
                      style={{ width: `${share}%`, background: CHANNEL_COLOR[c.channel] }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/admin/traffic"
          className="mt-4 inline-block text-[12px] font-semibold hover:text-brand-text"
        >
          Yesterday, 7 days, 30 days and every source →
        </Link>
      </div>
    </div>
  );
}
