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
    setPath(window.location.pathname);

    // Once per address per tab. A visitor pressing back and forward over a
    // broken link should not make it look like a hundred people did.
    const key = 'ds-404:' + here;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* a locked-down browser just reports it again */
    }

    const body = JSON.stringify({ path: window.location.pathname, from: document.referrer || null });
    fetch('/api/not-found', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* the report is a nicety; never bother the visitor about it */
    });
  }, []);

  if (!path) return null;
  return (
    <p className="micro mt-3 text-faint">
      You asked for <span className="font-mono text-body">{path}</span>
    </p>
  );
}
