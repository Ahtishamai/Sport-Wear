'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { BG_CLASS, edText, Eyebrow, type Bg } from './primitives';

type StageState = 'complete' | 'in-progress' | 'pending';

type TrackedOrder = {
  orderId: string;
  teamName: string;
  lastUpdated: string;
  stages: { label: string; state: StageState }[];
  status: 'Completed' | 'In production' | 'Not started';
  note: string;
};

type Copy = {
  heading: string;
  intro: string;
  placeholder: string;
  help: string;
};

export function OrderTrackingBlock({
  p,
  bid,
  copy,
}: {
  p: Record<string, any>;
  bid?: string;
  copy: Copy;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = value.trim();
    if (!id) return;

    setBusy(true);
    setMessage('');
    setOrder(null);
    try {
      const res = await fetch(`/api/track?order=${encodeURIComponent(id)}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.found) setOrder(json.order);
      else setMessage(json.message || json.error || 'We could not look that up right now.');
    } catch {
      setMessage('We could not reach the tracking service. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-reveal-root
      className={cn(BG_CLASS[(p.background as Bg) ?? 'white'], 'gutter py-[76px] md:py-[88px]')}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <Eyebrow bid={bid} path="eyebrow">
            {p.eyebrow}
          </Eyebrow>
          <h2 className="h-section" {...edText(bid, 'heading')}>
            {p.heading || copy.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-relaxed text-body">
            {p.body || copy.intro}
          </p>
        </div>

        <form onSubmit={submit} className="mx-auto mt-9 flex max-w-[820px] flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="order-number">
            Order number
          </label>
          <input
            id="order-number"
            name="order"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={copy.placeholder}
            autoComplete="off"
            spellCheck={false}
            className="field flex-1 !py-4 text-[16px] uppercase tracking-[.04em]"
          />
          <button type="submit" disabled={busy || !value.trim()} className="btn btn-yellow btn-lg shrink-0">
            {busy ? 'Checking…' : 'Track order'}
          </button>
        </form>

        <p className="mt-3 text-center text-[13px] text-muted">{copy.help}</p>

        {message && (
          <div
            role="status"
            className="mx-auto mt-8 max-w-[820px] border border-hairline bg-surface px-6 py-6 text-center"
          >
            <p className="text-[15px] leading-relaxed text-body">{message}</p>
          </div>
        )}

        {order && <OrderCard order={order} />}
      </div>
    </section>
  );
}

function OrderCard({ order }: { order: TrackedOrder }) {
  const tone =
    order.status === 'Completed'
      ? 'bg-[#E4F4EA] text-[#1F8A4C]'
      : order.status === 'In production'
        ? 'bg-brand-tint text-brand-deep'
        : 'bg-plate text-body';

  return (
    <article className="mt-9 border border-hairline bg-white">
      <header className="grid grid-cols-2 gap-5 border-b border-hairline px-6 py-6 lg:grid-cols-4 md:px-8">
        <Fact label="Order ID" value={order.orderId} strong />
        {order.teamName && <Fact label="Team name" value={order.teamName} strong />}
        {order.lastUpdated && <Fact label="Last updated" value={order.lastUpdated} strong />}
        <div>
          <span className="field-label">Status</span>
          <span
            className={cn(
              'inline-block rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-[.08em]',
              tone
            )}
          >
            {order.status}
          </span>
        </div>
      </header>

      <div className="px-6 py-8 md:px-8">
        <h3 className="font-display text-[15px] font-extrabold uppercase tracking-[.12em]">
          Order progress
        </h3>

        {/* A vertical list on phones, where five labels cannot sit side by side;
            the horizontal stepper from sm upwards. */}
        <ol
          className="mt-8 grid sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
          style={{ '--steps': order.stages.length } as React.CSSProperties}
        >
          {order.stages.map((stage, i) => (
            <li
              key={stage.label}
              className="relative flex items-start gap-4 pb-7 last:pb-0 sm:flex-col sm:items-center sm:gap-0 sm:pb-0"
            >
              {/* connector to the next step */}
              {i < order.stages.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-[17px] top-[38px] h-[calc(100%-38px)] w-[2px]',
                    'sm:left-1/2 sm:top-[17px] sm:h-[2px] sm:w-full',
                    stage.state === 'complete' ? 'bg-brand' : 'bg-hairline'
                  )}
                />
              )}

              <span
                className={cn(
                  'relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                  stage.state === 'complete' && 'border-brand bg-brand text-ink',
                  stage.state === 'in-progress' && 'border-brand bg-white text-brand-text',
                  stage.state === 'pending' && 'border-hairline bg-white text-faint'
                )}
              >
                {stage.state === 'complete' ? (
                  <Icon name="check" size={17} strokeWidth={2.6} />
                ) : stage.state === 'in-progress' ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-hairline-2" />
                )}
              </span>

              <div className="pt-1.5 sm:mt-3 sm:pt-0 sm:text-center">
                <span className="block text-[13px] font-semibold">{stage.label}</span>
                <span
                  className={cn(
                    'mt-0.5 block text-[12px]',
                    stage.state === 'complete' && 'text-success',
                    stage.state === 'in-progress' && 'text-brand-text',
                    stage.state === 'pending' && 'text-muted'
                  )}
                >
                  {stage.state === 'complete'
                    ? 'Complete'
                    : stage.state === 'in-progress'
                      ? 'In progress'
                      : 'Pending'}
                </span>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-9 flex gap-3.5 border border-hairline bg-surface px-5 py-4">
          <span className="mt-0.5 shrink-0 text-ink">
            <Icon name="truck" size={19} />
          </span>
          <span>
            <span className="block text-[14px] leading-relaxed">
              <strong className="font-semibold">Latest update:</strong> {order.note}
            </span>
            {order.lastUpdated && (
              <span className="mt-1 block text-[12px] text-muted">{order.lastUpdated}</span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <span className={cn('block text-[15px]', strong && 'font-semibold text-ink')}>{value}</span>
    </div>
  );
}
