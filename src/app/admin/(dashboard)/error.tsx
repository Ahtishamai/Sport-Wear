'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * What an admin sees when a screen throws.
 *
 * Without this, Next shows a bare white page reading "Application error: a
 * server-side exception has occurred" and a digest number — which tells the
 * person looking at it nothing, and does not even leave the rest of the admin
 * reachable. The digest is the only thing that ties the screen to a line in
 * the server log, so it is kept, but put where it belongs: at the bottom, next
 * to the instruction to quote it.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin]', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[560px] px-6 py-20 text-center">
      <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FBE7E8] text-[22px] text-[#C42027]">
        !
      </span>

      <h1 className="font-display text-[26px] font-black uppercase tracking-[.02em] text-ink">
        This screen could not load
      </h1>

      <p className="mt-3 text-[15px] leading-relaxed text-[#6B6D74]">
        Something went wrong on the server, so nothing was changed. Try again — if it keeps
        happening, it is usually the database being briefly unreachable, or an update that has been
        deployed without its database change.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-[2px] border border-ink bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#26272c]"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-[2px] border border-[#D6D6D1] bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink"
        >
          Back to the dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-[12px] text-[#8A8C93]">
          Quote this if you ask for help: <code className="font-semibold">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
