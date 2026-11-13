'use client';

import { useEffect, useState } from 'react';

/**
 * Reports the dead end, and prints it for the visitor.
 *
 * Both jobs are the browser's because only the browser knows for certain
 * which address was asked for: this page may be served from a cache, and the
 * page that linked here is never in the request the server saw.
 */
export function NotFoundBeacon() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    const here = window.location.pathname + window.location.search;
    const path = window.location.pathname;
    setPath(path);

    /*
     * Tell the admin bar this address is a dead end.
     *
     * Only the browser knows for certain which address was asked for, and
     * the bar lives in the layout rather than in this page, so the two are
     * not in a position to hand anything to each other directly. Both the
     * attribute and the event are set because neither can know which of them
     * mounts first: the attribute answers a bar that arrives late, the event
     * wakes one that was already there.
     */
    document.documentElement.dataset.deadEnd = path;
    window.dispatchEvent(new CustomEvent('ds:dead-end', { detail: path }));

    // Once per address per tab. A visitor pressing back and forward over a
    // broken link should not make it look like a hundred people did.
    const key = 'ds-404:' + here;
    let seen = false;
    try {
      seen = !!sessionStorage.getItem(key);
      if (!seen) sessionStorage.setItem(key, '1');
    } catch {
      /* a locked-down browser just reports it again */
    }

    if (!seen) {
      fetch('/api/not-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, from: document.referrer || null }),
        keepalive: true,
      }).catch(() => {
        /* the report is a nicety; never bother the visitor about it */
      });
    }

    return () => {
      delete document.documentElement.dataset.deadEnd;
      window.dispatchEvent(new CustomEvent('ds:dead-end', { detail: null }));
    };
  }, []);

  if (!path) return null;
  return (
    <p className="micro mt-3 text-faint">
      You asked for <span className="font-mono text-body">{path}</span>
    </p>
  );
}
