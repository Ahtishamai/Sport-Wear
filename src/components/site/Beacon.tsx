'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Tells the shop a page was looked at.
 *
 * A page view cannot be counted while the page renders, because the pages
 * are cached: one render of a collection page is served to everybody who
 * asks for it that minute. Only the browser knows a person arrived.
 *
 * The one subtlety is that attribution belongs to the visit, not to the
 * page. Somebody arrives from a ChatGPT answer, then clicks through to
 * three products. Those three clicks carry a referrer from the shop's own
 * pages, and taken on their own they would be filed as direct, quietly
 * turning one AI visit into one AI view and three direct ones.
 *
 * So the referrer and the address of the first page are kept for as long as
 * the tab is open, and every view in that visit is sent with them. The
 * whole visit is credited to the thing that actually sent it.
 */
export function Beacon() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const url = pathname + window.location.search;

    // One beacon per page, however many times React re-runs this.
    if (sent.current === url) return;
    sent.current = url;

    let session = '';
    let referrer = '';
    let landing = url;
    try {
      session = sessionStorage.getItem('ds_s') ?? '';
      if (!session) {
        // A new tab is a new visit. crypto.randomUUID is in every browser
        // this shop supports; the fallback is for the ones it is not.
        session =
          typeof crypto?.randomUUID === 'function'
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random().toString(36).slice(2);
        sessionStorage.setItem('ds_s', session);
        sessionStorage.setItem('ds_r', document.referrer || '');
        sessionStorage.setItem('ds_l', url);
      }
      referrer = sessionStorage.getItem('ds_r') ?? '';
      landing = sessionStorage.getItem('ds_l') ?? url;
    } catch {
      // Private browsing can refuse storage. Count the view anyway and let
      // it be one visit of one page rather than nothing at all.
      session = 'nostore';
      referrer = document.referrer || '';
    }

    // Two addresses, because they answer different questions. `path` is
    // the page being read now, which is what the page report counts.
    // `landing` is where the visit began, which is where the campaign tags
    // are and therefore how the visit is attributed.
    const body = JSON.stringify({ path: url, landing, referrer, session });

    // sendBeacon survives the page being closed, which a fetch does not.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/visit', new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch {
      // Fall through to fetch.
    }
    void fetch('/api/visit', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
