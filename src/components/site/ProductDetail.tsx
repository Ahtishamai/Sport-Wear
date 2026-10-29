'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ProductDetail as Product } from '@/lib/queries';
import { activeTier, cn, money, tierPrice, unitPriceFor } from '@/lib/utils';
import { useQuote } from './QuoteProvider';
import { useShopCart } from '@/components/shop/CartProvider';
import { ImagePlaceholder } from '@/components/blocks/primitives';

/** Team orders are made as a run, so they start at ten. */
const TEAM_MINIMUM = 10;

/**
 * What to call one of these on the page.
 *
 * "10 shirts or more" in front of a rolling bag reads as a mistake, so the
 * word follows the product. It comes from the collections the product is in,
 * which is where the shop already says what kind of thing it is.
 */
const NOUNS: [RegExp, [string, string]][] = [
  [/bag/, ['bag', 'bags']],
  [/jacket|hoodie/, ['jacket', 'jackets']],
  [/pant|short/, ['pair', 'pairs']],
  [/shirt|jersey/, ['shirt', 'shirts']],
];

function unitNoun(product: { collections: { handle: string; title: string }[]; title: string }): [string, string] {
  const haystack = [...product.collections.map((c) => c.handle + ' ' + c.title), product.title]
    .join(' ')
    .toLowerCase();
  return NOUNS.find(([re]) => re.test(haystack))?.[1] ?? ['item', 'items'];
}

export function ProductDetail({
  product,
  reviewCount = 128,
  rating = 4.9,
  urgencyLine,
  showPrices = true,
}: {
  product: Product;
  reviewCount?: number;
  rating?: number;
  /** Off hides every figure on this page — see Admin → Site settings → Pricing. */
  showPrices?: boolean;
  urgencyLine?: string | null;
}) {
  const { open } = useQuote();
  const [view, setView] = useState(0);
  const [sport, setSport] = useState(product.sports[0] ?? 'Baseball');
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState<Record<string, number>>(() => ({ ...product.defaultQty }));
  const [spec, setSpec] = useState(product.specs[0]?.q ?? '');

  // Sold outright, or quoted? Switched per product in the admin, under
  // Status & pricing. Off, this page does what it has always done: ask for a
  // size run and send it over as a quote, with no choice to make and no cart.
  const sellsOnline = product.sellOnline === true;

  // One person buying for themselves, or a coach kitting out a roster. They
  // need different things asked of them: one size and a count, against a
  // size run and the team's name.
  const [mode, setMode] = useState<'individual' | 'team'>('individual');
  const [teamName, setTeamName] = useState('');
  // Printed on the shirt: the team across the chest, the number on the back.
  // Each is asked for only where it is ticked on the product, so a bag is
  // never asked for a squad number.
  const [number, setNumber] = useState('');
  const asksTeamName = product.askTeamName === true;
  const asksNumber = product.askNumber === true;
  const [oneSize, setOneSize] = useState(product.sizes[0] ?? '');
  const [oneQty, setOneQty] = useState(1);
  // A bag comes in one size, so a team buying them is asked how many, not
  // how many of each. A quote starts at one; a team order at ten.
  const [teamQty, setTeamQty] = useState(product.sellOnline ? TEAM_MINIMUM : 1);
  const { add: addLines } = useShopCart();
  const [added, setAdded] = useState(false);

  const hasSizes = product.sizes.length > 0;
  const noun = unitNoun(product);

  // A box per size, or one size and a count. A quote-only product keeps the
  // size run whoever is buying it, which is the shape a quote has always had.
  const perSize = !sellsOnline || mode === 'team';

  /** What is being ordered, as lines of size and count. */
  const lines = perSize
    ? hasSizes
      ? Object.entries(qty)
          .filter(([size, n]) => size && Number(n) > 0)
          .map(([size, n]) => ({ size, quantity: Number(n) }))
      : [{ size: '', quantity: teamQty }]
    : [{ size: hasSizes ? oneSize : '', quantity: oneQty }];

  const sizeRun = Object.fromEntries(lines.map((l) => [l.size || 'One size', l.quantity]));
  const units = lines.reduce((n, l) => n + l.quantity, 0);
  // The ten only binds a team order being bought outright. Nothing stops
  // anyone asking for a quote on two.
  const shortOfMinimum = sellsOnline && mode === 'team' && units < TEAM_MINIMUM;
  const tiers = product.volumeTiers;
  const tierIdx = activeTier(tiers, units);
  const unitPrice = unitPriceFor(product.basePrice, tiers, units);
  const estTotal = unitPrice * units;

  // Two switches hide a price and either one is enough: the site-wide setting,
  // and this product's own. A product sold only by quote must not show a figure
  // because prices happen to be on everywhere else.
  const priced = showPrices && product.showPrice !== false;
  // Sold outright only where it is switched on and there is a real figure
  // behind it; a $0 product is one nobody has priced yet, not a free one.
  const sellable = sellsOnline && priced && unitPrice > 0;

  const images = product.images.length ? product.images : [];
  const colorway = product.colorways[color];

  const quotePayload = useMemo(
    () => ({
      productId: product.id,
      productTitle: product.title,
      colorway: colorway?.name,
      sizeRun,
      totalUnits: units,
      unitPrice,
      estTotal,
      sport,
      // Left unsaid on a quote-only product, where nobody chose: the quote
      // form then asks for the team the way it did before this choice existed.
      orderType: sellsOnline ? mode : undefined,
      teamName: asksTeamName ? teamName.trim() : '',
      // A team order is a run of shirts, so one number only belongs on an
      // individual one; the roster's numbers are settled on the mockup.
      number: asksNumber && mode === 'individual' ? number.trim() : '',
    }),
    [
      product.id,
      product.title,
      colorway?.name,
      sizeRun,
      units,
      unitPrice,
      estTotal,
      sport,
      sellsOnline,
      mode,
      teamName,
      number,
      asksTeamName,
      asksNumber,
    ]
  );

  /**
   * Into the cart, one line per size.
   *
   * A team order is a run of sizes, and each size is its own line so it can be
   * changed later without unpicking the rest.
   */
  const addToCart = () => {
    if (shortOfMinimum || !sellable) return;
    const common = {
      productId: product.id,
      handle: product.handle,
      title: product.title,
      image: images[0]?.url ?? null,
      sport,
      colorway: colorway?.name ?? '',
      teamName: asksTeamName ? teamName.trim() : '',
      number: asksNumber && mode === 'individual' ? number.trim() : '',
      orderType: mode,
      unitPrice,
    };
    addLines(
      Object.entries(sizeRun)
        .filter(([size, n]) => size && Number(n) > 0)
        .map(([size, n]) => ({ ...common, size, quantity: Number(n) }))
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 4000);
  };

  const requestQuote = () => {
    if (shortOfMinimum) return;
    const what = perSize
      ? `${teamName.trim() ? teamName.trim() + ' — ' : ''}${units} ${units === 1 ? noun[0] : noun[1]}`
      : `${units} × ${oneSize}`;
    open(`${product.title} — ${what}`, quotePayload);
  };

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
                // Contained: the whole item has to be visible here above all.
                // These photos run from tall wheeled bags to wide jerseys, so
                // any fixed crop cuts something off the shopper came to see.
                className="object-contain p-4"
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
                    className="object-contain p-1.5"
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

          {/* price + volume tiers, or the quote panel that replaces them */}
          {!priced && (
            <div className="mt-7 border border-hairline bg-surface p-6">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                    Pricing
                  </div>
                  <div className="mt-2 font-display text-[30px] font-black leading-none">
                    Request a quote
                  </div>
                </div>
                <button type="button" onClick={requestQuote} className="btn btn-yellow btn-md">
                  Get my price
                </button>
              </div>
              <p className="mt-4 border-t border-hairline pt-4 text-[13px] leading-relaxed text-muted">
                This one is priced to your roster, fabric and add-ons. Tell us what you need and we
                will send a firm per-unit price with a free mockup — no deposit, no obligation.
              </p>
            </div>
          )}

          {priced && (
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
                    {money(tierPrice(product.basePrice, t))}
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
          )}

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

          {/* who it is for, then how many */}
          <div className="mt-7 border border-hairline bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[.14em]">
                How many do you need?
              </h2>
              {hasSizes && (
                <Link
                  href="/size-chart"
                  className="text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
                >
                  Size chart
                </Link>
              )}
            </div>

            {/* One control, two halves — it reads as a choice rather than two buttons. */}
            {sellsOnline && (
            <div
              className="mb-5 grid grid-cols-2 overflow-hidden border border-ink"
              role="group"
              aria-label="Who is this order for"
            >
              {(
                [
                  ['individual', 'Individual', `Just for me`],
                  ['team', 'Team', `${TEAM_MINIMUM} ${noun[1]} or more`],
                ] as const
              ).map(([value, label, hint], i) => {
                const on = mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    aria-pressed={on}
                    className={cn(
                      'px-4 py-3 text-center transition-colors',
                      i === 0 && 'border-r border-ink',
                      on ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-surface'
                    )}
                  >
                    <span className="block font-display text-[14px] font-extrabold uppercase tracking-[.08em]">
                      {label}
                    </span>
                    <span className={cn('mt-0.5 block text-[12px]', on ? 'text-white/70' : 'text-muted')}>
                      {hint}
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {(asksTeamName || (asksNumber && !perSize)) && (
              <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                {asksTeamName && (
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                      Team name
                    </span>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Springfield Thunder 14U"
                      maxLength={40}
                      className="w-full border border-hairline px-4 py-3 text-[15px] outline-none focus:border-ink"
                    />
                  </label>
                )}
                {asksNumber && !perSize && (
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                      Number
                    </span>
                    <input
                      value={number}
                      onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                      inputMode="numeric"
                      placeholder="23"
                      aria-label="Number printed on the shirt"
                      className="w-full border border-hairline px-4 py-3 text-center text-[15px] outline-none focus:border-ink sm:w-[110px]"
                    />
                  </label>
                )}
                {asksNumber && perSize && (
                  <p className="self-end pb-3 text-[12.5px] text-muted sm:max-w-[220px]">
                    Names and numbers for the roster are collected with your mockup.
                  </p>
                )}
              </div>
            )}

            {!perSize ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className={hasSizes ? undefined : 'hidden'}>
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                    Size
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setOneSize(s)}
                        aria-pressed={oneSize === s}
                        className="border px-3.5 py-2 text-[13px] font-bold uppercase transition-colors"
                        style={{
                          borderColor: oneSize === s ? '#101114' : '#E6E6E2',
                          background: oneSize === s ? '#FFF6CC' : '#FFFFFF',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                    How many
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={oneQty}
                    onChange={(e) => setOneQty(Math.max(1, Number(e.target.value) || 1))}
                    aria-label={`How many ${noun[1]}`}
                    className="w-[120px] border border-hairline px-4 py-2.5 text-center font-display text-[20px] font-black outline-none focus:border-ink"
                  />
                </label>
              </div>
            ) : !hasSizes ? (
              /* One size, so a team order is simply a count — starting at ten. */
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                  How many {noun[1]}
                </span>
                <span className="flex items-center gap-3">
                  <input
                    type="number"
                    min={TEAM_MINIMUM}
                    value={teamQty}
                    onChange={(e) => setTeamQty(Math.max(1, Number(e.target.value) || 1))}
                    aria-label={`How many ${noun[1]}`}
                    className="w-[140px] border border-hairline px-4 py-2.5 text-center font-display text-[22px] font-black outline-none focus:border-ink"
                  />
                  {sellsOnline && (
                    <span className="text-[13px] text-muted">
                      Team orders start at {TEAM_MINIMUM} {noun[1]}.
                    </span>
                  )}
                </span>
              </label>
            ) : (
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
            )}

            {shortOfMinimum && (
              <p
                role="status"
                className="mt-4 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] font-medium text-[#C42027]"
              >
                Team orders start at {TEAM_MINIMUM} {noun[1]} — {TEAM_MINIMUM - units} more to go. Fewer than
                that? Switch to Individual.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-4">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                  {perSize ? `Total ${noun[1]}` : noun[1].replace(/^./, (c) => c.toUpperCase())}
                </span>
                <span className="font-display text-[22px] font-black">{units}</span>
              </div>
              {priced && (
                <div className="text-right">
                  <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
                    Estimated
                  </span>
                  <span className="font-display text-[25px] font-black">{money(estTotal)}</span>
                  <span className="ml-2 text-[13px] text-muted">at {money(unitPrice)}/unit</span>
                </div>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap gap-3">
            {/*
              Buying outright only makes sense where it is switched on and
              there is a price to charge. Anything else keeps the quote button,
              which is how everything here has always been sold.
            */}
            {sellable ? (
              <>
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={shortOfMinimum}
                  className="btn btn-yellow btn-xl min-w-[240px] flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {shortOfMinimum
                    ? `Add ${TEAM_MINIMUM - units} more ${noun[1]}`
                    : added
                      ? 'Added to cart ✓'
                      : `Add ${units} to cart · ${money(estTotal)}`}
                </button>
                <button
                  type="button"
                  onClick={requestQuote}
                  disabled={shortOfMinimum}
                  className="btn btn-outline btn-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Request a quote
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={requestQuote}
                  disabled={shortOfMinimum}
                  className="btn btn-yellow btn-xl min-w-[240px] flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {shortOfMinimum ? `Add ${TEAM_MINIMUM - units} more ${noun[1]}` : 'Request a quote'}
                </button>
                <button
                  type="button"
                  onClick={() => open(`Sample request — ${product.title}`, quotePayload)}
                  className="btn btn-outline btn-xl"
                >
                  Order a sample
                </button>
              </>
            )}
          </div>
          {added && (
            <p role="status" className="mt-3 text-[14px] font-medium text-success">
              In your cart.{' '}
              <Link href="/cart" className="underline underline-offset-2">
                Go to cart
              </Link>
            </p>
          )}

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
              {sellsOnline && mode === 'team' ? 'Team · ' : ''}
              {units} {units === 1 ? noun[0] : noun[1]}
              {priced ? ` · est. ${money(estTotal)}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] font-medium text-body sm:block">
              Free mockup in 24h
            </span>
            <button
              type="button"
              onClick={requestQuote}
              disabled={shortOfMinimum}
              className="btn btn-yellow btn-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {shortOfMinimum ? `Add ${TEAM_MINIMUM - units} more ${noun[1]}` : 'Request a quote'}
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
