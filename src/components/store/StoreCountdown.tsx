'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function remainingAt(target: number): Remaining {
  const ms = target - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1_000) % 60,
    done: false,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Deadline clock for the store hero.
 *
 * The tiles stay blank on the server and until the first tick lands, because
 * a time rendered during SSR is already stale by the time it reaches the
 * browser and React would flag the mismatch. `closesAtLabel` is formatted on
 * the server instead, so the exact deadline is in the HTML for shoppers who
 * never run the timer — and for search engines.
 */
export function StoreCountdown({
  closesAtISO,
  closesAtLabel,
}: {
  closesAtISO: string;
  closesAtLabel: string | null;
}) {
  const target = useMemo(() => new Date(closesAtISO).getTime(), [closesAtISO]);
  const [left, setLeft] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    // Every tick reads the clock afresh rather than decrementing, so a tab
    // that was throttled or asleep comes back showing the right number.
    const tick = () => setLeft(remainingAt(target));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target)) return null;

  const done = left?.done ?? false;
  // The last day is the one that changes behaviour, so it is the one that
  // gets the warmer treatment.
  const urgent = !!left && !done && left.days === 0;

  const units: [string, string][] = [
    ['Days', left ? pad(left.days) : '--'],
    ['Hrs', left ? pad(left.hours) : '--'],
    ['Min', left ? pad(left.minutes) : '--'],
    ['Sec', left ? pad(left.seconds) : '--'],
  ];

  return (
    <div className="w-full md:w-auto">
      <span
        className={cn(
          'micro block md:text-right',
          done ? 'text-ondark-3' : 'text-brand'
        )}
      >
        {done ? 'Ordering has closed' : 'Ordering closes in'}
      </span>

      {done ? (
        <p className="mt-2.5 rounded-[3px] border border-white/15 bg-white/[0.06] px-4 py-3 text-[13px] leading-none text-ondark md:text-right">
          This store is no longer taking orders.
        </p>
      ) : (
        <div
          role="group"
          aria-label={
            closesAtLabel ? `Ordering closes ${closesAtLabel}` : 'Ordering deadline'
          }
          className="mt-2.5 flex gap-2 md:justify-end"
        >
          {units.map(([label, value]) => (
            <div
              key={label}
              aria-hidden="true"
              className={cn(
                'min-w-[62px] flex-1 rounded-[3px] border px-3 py-2.5 text-center transition-colors duration-300 md:flex-none',
                urgent
                  ? 'border-brand/45 bg-brand/10'
                  : 'border-white/12 bg-white/[0.07]'
              )}
            >
              <span className="block font-display text-[26px] font-black leading-none tabular-nums text-brand">
                {value}
              </span>
              <span className="mt-1.5 block text-[10px] font-semibold uppercase leading-none tracking-[.14em] text-ondark-4">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {closesAtLabel && !done && (
        <span className="mt-2.5 block text-[12px] leading-none text-ondark-3 md:text-right">
          {closesAtLabel}
        </span>
      )}
    </div>
  );
}
