'use client';

import { useEffect, useState } from 'react';
import { edText } from '@/components/blocks/primitives';
import { sportFromUrl } from './LeadForm';

/**
 * The landing page's headline, matched to the ad that was clicked.
 *
 * One page serves baseball and softball. The ad's final URL says which
 * (?sport=softball), and the headline is swapped for that sport's after load —
 * the page is cached for everyone, so it cannot be drawn per visitor on the
 * server. With no sport in the address, or JavaScript off, the shared
 * headline stays.
 */
export function SportHeading({
  heading,
  bySport,
  bid,
}: {
  heading: string;
  /** { Baseball: "Custom Baseball Jerseys…", Softball: "…" } — blanks ignored. */
  bySport: Record<string, string>;
  bid?: string;
}) {
  const [text, setText] = useState(heading);
  const [path, setPath] = useState('heading');

  useEffect(() => {
    const filled = Object.keys(bySport).filter((k) => bySport[k]?.trim());
    const sport = sportFromUrl(filled);
    if (sport) {
      setText(bySport[sport]);
      setPath(`heading${sport}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1
      className="h-display text-white"
      style={{ fontSize: 'clamp(32px,4.4vw,58px)', lineHeight: 0.98 }}
      {...edText(bid, path)}
    >
      {text}
    </h1>
  );
}
