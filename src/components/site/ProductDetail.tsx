'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ProductDetail as Product } from '@/lib/queries';
import { activeTier, cn, money, sumQty, unitPriceFor } from '@/lib/utils';
import { useQuote } from './QuoteProvider';
import { ImagePlaceholder } from '@/components/blocks/primitives';

export function ProductDetail({
  product,
  reviewCount = 128,
  rating = 4.9,
  urgencyLine,
}: {
  product: Product;
  reviewCount?: number;
  rating?: number;
  urgencyLine?: string | null;
}) {
  const { open } = useQuote();
  const [view, setView] = useState(0);
  const [sport, setSport] = useState(product.sports[0] ?? 'Baseball');
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState<Record<string, number>>(() => ({ ...product.defaultQty }));
  const [spec, setSpec] = useState(product.specs[0]?.q ?? '');

  const units = sumQty(qty);
  const tiers = product.volumeTiers;
  const tierIdx = activeTier(tiers, units);
  const unitPrice = unitPriceFor(product.basePrice, tiers, units);
  const estTotal = unitPrice * units;

  const images = product.images.length ? product.images : [];
  const colorway = product.colorways[color];

  const quotePayload = useMemo(
    () => ({
      productId: product.id,
      productTitle: product.title,
      colorway: colorway?.name,
      sizeRun: qty,
      totalUnits: units,
      unitPrice,
      estTotal,
      sport,
    }),
    [product.id, product.title, colorway?.name, qty, units, unitPrice, estTotal, sport]
  );

  const requestQuote = () =>
    open(`${product.title} — ${units} unit${units === 1 ? '' : 's'}`, quotePayload);

  return (
    <>
      <div className="gutter grid gap-13 pb-[70px] pt-6 lg:grid-cols-[1.02fr_.98fr] lg:gap-13">
        {/* ------------------------------------------------------ gallery */}
        <div className="lg:sticky lg:top-[110px] lg:self-start">
          <div
            className="relative overflow-hidden border border-hairline bg-plate"
            style={{ aspectRatio: '4 / 3.4' }}
          >
            {images[view] ? (
              <Image
                src={images[view].url}
                alt={images[view].alt || product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <ImagePlaceholder label="Product photo" />
            )}
            <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
              {product.badge && (
                <span className="bg-brand px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-ink">
                  {product.badge}
                </span>
              )}
              <span className="bg-ink px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-white">
                Free mockup in 24h
              </span>
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {images.slice(0, 4).map((im, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setView(i)}
                  aria-label={`View ${i + 1}`}
                  aria-pressed={view === i}
                  className="relative aspect-square overflow-hidden border-2 bg-plate transition-colors"
                  style={{ borderColor: view === i ? '#101114' : '#E6E6E2' }}
                >
                  <Image
                    src={im.url}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {[
              { v: '3–4 wks', l: 'Standard build' },
              { v: '2 wks', l: 'Rush option' },
              { v: '$0', l: 'Art & setup fees' },
            ].map((t) => (
              <div key={t.l} className="border border-hairline bg-surface px-2 py-4 text-center">
                <div className="font-display text-[16px] font-black leading-none">{t.v}</div>
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[.1em] text-muted">
                  {t.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------ buy box */}
        <div>
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            <span className="tracking-[1px] text-gold" aria-hidden="true">
              ★★★★★
            </span>
            <span className="font-medium text-body">
              {rating} · {reviewCount} team reviews
            </span>
            {urgencyLine && (
              <>
                <span aria-hidden="true" className="text-hairline">
                  |
                </span>
                <span className="font-medium text-success">{urgencyLine}</span>
              </>
            )}
          </div>

          <h1 className="h-display mt-4" style={{ fontSize: 'clamp(30px,3.8vw,50px)' }}>
            {product.title}
          </h1>

          <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-body">
            {product.description}
          </p>

          {/* price + volume tiers */}
          <div className="mt-7 border border-hairline bg-surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                  Starting at
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-[44px] font-black leading-none">
                    {money(unitPrice)}
                  </span>
                  <span className="text-[14px] font-semibold text-muted">per unit</span>
                </div>
              </div>
              <p className="max-w-[260px] text-right text-[13px] leading-relaxed text-muted">
                Final price depends on quantity, fabric and add-ons — confirmed in your quote.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 border-t border-hairline pt-5 sm:grid-cols-4">
              {tiers.map((t, i) => (
                <div
                  key={t.label}
                  className="border px-3 py-3 text-center transition-colors"
                  style={{
                    borderColor: i === tierIdx ? '#101114' : '#E6E6E2',
                    background: i === tierIdx ? '#FFF6CC' : '#FFFFFF',
                  }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-muted">
                    {t.label}
                  </div>
                  <div className="mt-1.5 font-display text-[18px] font-black leading-none">
                    {money(Math.max(0, product.basePrice - t.discount))}
                  </div>
                  {t.savingsLabel && (
                    <div className="mt-1 text-[11px] font-semibold text-success">
                      {t.savingsLabel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* sport */}
          <Group label="Sport">
            <div className="flex flex-wrap gap-2.5">
              {product.sports.map((s) => {
                const on = sport === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSport(s)}
                    aria-pressed={on}
                    className="rounded-[2px] border px-5 py-3 text-[13px] font-bold uppercase tracking-[.06em] transition-colors"
                    style={{
                      borderColor: on ? '#101114' : '#D8D8D3',
                      background: on ? '#FFD100' : '#FFFFFF',
                      color: on ? '#101114' : '#55575E',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Group>

          {/* colorway */}
          <Group label="Team colorway">
            <div className="flex flex-wrap items-center gap-3.5">
              {product.colorways.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(i)}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === i}
                  className="h-[42px] w-[42px] rounded-full transition-shadow"
                  style={{
                    background: `linear-gradient(135deg, ${c.from} 50%, ${c.to} 50%)`,
                    boxShadow: `0 0 0 2px ${color === i ? '#101114' : '#E0E0DB'}`,
                  }}
                />
              ))}
              <span className="text-[13px] text-muted">or send us your exact hex / Pantone</span>
            </div>
            <p className="mt-3 text-[13px] font-semibold text-ink">{colorway?.name}</p>
          </Group>

          {/* size run */}
          <div className="mt-7 border border-hairline bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[.14em]">
                Size run
              </h2>
              <Link
                href="/size-chart"
                className="text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
              >
                Size chart
              </Link>
            </div>

            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' }}
            >
              {product.sizes.map((s) => {
                const v = qty[s] || 0;
                return (
                  <label
                    key={s}
                    className="cursor-text border px-2 py-2.5 text-center transition-colors"
                    style={{
                      borderColor: v ? '#101114' : '#E6E6E2',
                      background: v ? '#FFF6CC' : '#FFFFFF',
                    }}
                  >
                    <span className="block text-[11px] font-bold uppercase text-muted">{s}</span>
                    <input
                      type="number"
                      min={0}
                      value={v}
                      onChange={(e) =>
                        setQty((p) => ({ ...p, [s]: Math.max(0, Number(e.target.value) || 0) }))
                      }
                      aria-label={`${s} quantity`}
                      className="no-spin mt-1 w-full border-0 bg-transparent text-center font-display text-[20px] font-black outline-none"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-4">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                  Total units
                </span>
                <span className="font-display text-[22px] font-black">{units}</span>
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                  Estimated
                </span>
                <span className="font-display text-[25px] font-black">{money(estTotal)}</span>
                <span className="ml-2 text-[13px] text-muted">at {money(unitPrice)}/unit</span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={requestQuote}
              className="btn btn-yellow btn-xl min-w-[240px] flex-1"
            >
              Request a quote
            </button>
            <button
              type="button"
              onClick={() => open(`Sample request — ${product.title}`, quotePayload)}
              className="btn btn-outline btn-xl"
            >
              Order a sample
            </button>
          </div>

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {product.trustPoints.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[14px] font-medium text-body">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-5 bg-brand px-6 py-5">
            <span className="font-display text-[30px] font-black leading-none">24h</span>
            <div>
              <div className="font-display text-[14px] font-extrabold uppercase tracking-[.04em]">
                See your kit before you commit
              </div>
              <p className="mt-1 text-[13px] leading-snug text-brand-on">
                Free unlimited revisions until the design is exactly what your team wants.
              </p>
            </div>
          </div>

          {/* spec accordion */}
          {product.specs.length > 0 && (
            <div className="mt-9 border-t-2 border-ink">
              {product.specs.map((s) => {
                const isOpen = spec === s.q;
                return (
                  <div key={s.q} className="border-b border-hairline">
                    <h3>
                      <button
                        type="button"
                        onClick={() => setSpec(isOpen ? '' : s.q)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-0.5 py-5 text-left"
                      >
                        <span className="font-display text-[15px] font-extrabold uppercase tracking-[.06em]">
                          {s.q}
                        </span>
                        <span aria-hidden="true" className="text-[20px] leading-none text-brand-text">
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                    </h3>
                    {isOpen && (
                      <p className="max-w-[640px] pb-5 text-[15px] leading-[1.65] text-body">
                        {s.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ sticky bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-[55] border-t border-hairline bg-[rgba(255,255,255,.97)] backdrop-blur-[12px]"
        style={{ boxShadow: '0 -8px 24px -18px rgba(16,17,20,.5)' }}
      >
        <div className="gutter flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <div className="truncate font-display text-[16px] font-extrabold uppercase">
              {product.title}
            </div>
            <div className="text-[13px] text-muted">
              {units} units · est. {money(estTotal)}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] font-medium text-body sm:block">
              Free mockup in 24h
            </span>
            <button type="button" onClick={requestQuote} className="btn btn-yellow btn-md">
              Request a quote
            </button>
          </div>
        </div>
      </div>
      <div aria-hidden="true" style={{ height: 74 }} />
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <h2 className="mb-3 font-display text-[13px] font-extrabold uppercase tracking-[.14em]">
        {label}
      </h2>
      {children}
    </div>
  );
}
