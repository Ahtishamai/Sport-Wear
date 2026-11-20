import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import {
  edImage,
  edText,
  Section,
  SectionHeading,
  type Bg,
  type CardProduct,
} from '@/components/blocks/primitives';
import type { OfferProduct } from '@/lib/queries';
import { LeadForm } from './LeadForm';
import { SportHeading } from './SportHeading';

/**
 * Blocks made for paid-traffic landing pages (lib/landing.ts), usable on any page.
 *
 * A visitor from an ad decides in seconds, so the order of the page is the
 * argument: what it is and what it costs them (nothing, to find out), the form
 * on the first screen, then the reasons to believe it. Every block writes its
 * words from props, so all of it is edited in the page builder.
 */

type P = Record<string, any>;

export type LeadContext = {
  /** Which page a lead came from, e.g. "landing:custom-baseball-jerseys". */
  source: string;
  phone?: string;
  phoneHref?: string;
};

/** Where every "get a quote" button on a landing page scrolls to. */
export const FORM_ANCHOR = 'get-quote';

/** Where "Shop now" scrolls to: the product offer on a page that sells. */
export const SHOP_ANCHOR = 'shop';

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

// -------------------------------------------------------------------- offer hero

/**
 * A landing hero for a page that sells rather than collects leads: the
 * product, its lowest price, and one button down to the products.
 *
 * The price is the lowest the collection's own bulk pricing reaches, worked
 * out from the products (see getOfferProducts) rather than typed, so it moves
 * when the prices do.
 */
export function OfferHeroBlock({
  p,
  bid,
  priority,
  from,
  fallbackImage,
  lead,
  rating,
}: {
  p: P;
  bid?: string;
  priority?: boolean;
  /** The shop's Google rating, when there is one to show. */
  rating?: { value: number; count: number } | null;
  /** Lowest price across the collection; null when prices are hidden. */
  from: number | null;
  fallbackImage?: string | null;
  lead: LeadContext;
}) {
  const bullets = list(p.bullets);
  const image = p.image || fallbackImage;

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="gutter relative grid gap-8 py-10 md:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:py-16">
        <div>
          {p.badge && (
            <span
              className="mb-5 inline-flex bg-brand px-3 py-1.5 font-display text-[12px] font-extrabold uppercase tracking-[.12em] text-ink"
              {...edText(bid, 'badge')}
            >
              {p.badge}
            </span>
          )}
          {rating && (
            <p className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] font-semibold text-white/90">
              <span className="tracking-[2px] text-brand" aria-hidden="true">
                ★★★★★
              </span>
              <span>
                {rating.value.toFixed(1)} on Google
                {rating.count > 0 ? ` · ${rating.count.toLocaleString('en-US')} reviews` : ''}
              </span>
            </p>
          )}
          <h1
            className="h-display text-white"
            style={{ fontSize: 'clamp(34px,4.6vw,62px)', lineHeight: 0.96 }}
            {...edText(bid, 'heading')}
          >
            {p.heading}
          </h1>
          {p.body && (
            <p
              className="mt-5 max-w-[580px] text-[17px] leading-relaxed text-white/85 md:text-[18px]"
              {...edText(bid, 'body')}
            >
              {p.body}
            </p>
          )}

          {/* The price is shown only when the block asks for it. */}
          {p.showPrice === true && from !== null && (
            <p className="mt-6 flex items-baseline gap-3">
              <span className="text-[14px] font-semibold uppercase tracking-[.12em] text-white/70">
                {p.priceLabel || 'Starting at'}
              </span>
              <span className="font-display text-[44px] font-black leading-none text-brand md:text-[52px]">
                {money(from)}
              </span>
              {p.priceNote && <span className="text-[15px] font-semibold text-white/80">{p.priceNote}</span>}
            </p>
          )}

          {bullets.length > 0 && (
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] font-semibold">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                    <Icon name="check" size={13} strokeWidth={3} />
                  </span>
                  <span {...edText(bid, `bullets.${i}`)}>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={`#${SHOP_ANCHOR}`} className="btn btn-yellow btn-lg w-full sm:w-auto">
              <span {...edText(bid, 'ctaLabel')}>{p.ctaLabel || 'Shop now'}</span>
            </a>
            {lead.phone && lead.phoneHref && (
              <a href={lead.phoneHref} className="btn btn-ghost-light btn-lg w-full sm:w-auto">
                Call {lead.phone}
              </a>
            )}
          </div>
        </div>

        {image && (
          // The product photographs are 3:2 (two jerseys side by side). A square
          // box cut both of them off at the edges; this one is their own shape,
          // and `contain` keeps the whole photo even if one is not.
          <div className="relative aspect-[3/2] w-full overflow-hidden bg-[#0b0c0e]">
            <Image
              src={image}
              alt={p.imageAlt || p.heading || ''}
              fill
              priority={priority}
              sizes="(min-width:1024px) 45vw, 100vw"
              className="object-contain"
              {...edImage(bid, 'image')}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- product offer

/**
 * The collection's products, each with its full bulk price list and a button
 * straight to its product page, where it is put in the cart.
 *
 * The prices are the product's own volume tiers, so what a card says is what
 * the cart charges. With prices switched off (site-wide or on the product)
 * the card shows "Price on request" and no figures.
 */
export function ProductOfferBlock({
  p,
  bid,
  products,
  showPrices,
}: {
  p: P;
  bid?: string;
  products: OfferProduct[];
  showPrices: boolean;
}) {
  return (
    <Section id={SHOP_ANCHOR} background={(p.background as Bg) ?? 'white'} className="scroll-mt-20">
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} body={p.body} align="center" bid={bid} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((d) => {
          const priced = showPrices && d.showPrice && d.tiers.length > 0;
          const lowest = d.from;
          return (
            <li
              key={d.id}
              className="group flex flex-col border border-hairline bg-white transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,.12)]"
            >
              <a href={`/products/${d.handle}`} className="relative block aspect-[3/2] overflow-hidden bg-[#0b0c0e]">
                {d.image && (
                  <Image
                    src={d.image}
                    alt={d.title}
                    fill
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </a>
              <div className="flex flex-1 flex-col p-4 md:p-5">
                <h3 className="font-display text-[16px] font-extrabold uppercase leading-tight">
                  <a href={`/products/${d.handle}`} className="hover:underline">
                    {d.title}
                  </a>
                </h3>

                {priced ? (
                  <>
                    <p className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[13px] font-medium text-muted">Starting at</span>
                      <span className="font-display text-[26px] font-black leading-none">{money(lowest)}</span>
                      <span className="text-[13px] font-medium text-muted">each</span>
                    </p>

                    <table className="mt-4 w-full text-[14px]">
                      <caption className="mb-1.5 text-left font-display text-[11px] font-extrabold uppercase tracking-[.14em] text-muted">
                        Bulk pricing
                      </caption>
                      <tbody>
                        {d.tiers.map((t) => {
                          const best = t.price === lowest;
                          return (
                            <tr key={t.label} className={cn('border-t border-hairline', best && 'bg-brand-tint')}>
                              <td className="px-2 py-1.5 text-body">{t.label} pcs</td>
                              <td className={cn('px-2 py-1.5 text-right font-semibold text-ink', best && 'font-extrabold')}>
                                {money(t.price)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="mt-2 text-[14px] font-semibold text-muted">Price on request</p>
                )}

                <a
                  href={`/products/${d.handle}`}
                  className={cn('btn mt-5 w-full py-3.5 text-[13px]', d.sellOnline && priced ? 'btn-yellow' : 'btn-outline')}
                >
                  {d.sellOnline && priced ? p.buttonLabel || 'Order now' : 'View details'}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      {p.footnote && (
        <p className="mt-7 text-center text-[14px] text-muted" {...edText(bid, 'footnote')}>
          {p.footnote}
        </p>
      )}
    </Section>
  );
}

/** Baseball / Softball buttons on the form, when the block asks for them. */
const sportChoices = (p: P) => (p.askSport ? ['Baseball', 'Softball'] : undefined);

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : [];

// -------------------------------------------------------------------- hero

export function LeadHeroBlock({
  p,
  bid,
  priority,
  lead,
}: {
  p: P;
  bid?: string;
  priority?: boolean;
  lead: LeadContext;
}) {
  const bullets = list(p.bullets);
  const chips = list(p.chips);

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {p.image && (
        <Image
          src={p.image}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover opacity-30"
          {...edImage(bid, 'image')}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/60"
      />

      <div className="gutter relative grid gap-8 py-10 md:py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:py-16">
        <div>
          {p.badge && (
            <span
              className="mb-5 inline-flex items-center gap-2 bg-brand px-3 py-1.5 font-display text-[12px] font-extrabold uppercase tracking-[.12em] text-ink"
              {...edText(bid, 'badge')}
            >
              {p.badge}
            </span>
          )}
          <SportHeading
            heading={p.heading}
            bySport={{ Baseball: p.headingBaseball ?? '', Softball: p.headingSoftball ?? '' }}
            bid={bid}
          />
          {p.body && (
            <p
              className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-white/85 md:text-[19px]"
              {...edText(bid, 'body')}
            >
              {p.body}
            </p>
          )}

          {bullets.length > 0 && (
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {bullets.map((b, i) => (
                // The first three carry the offer; on a phone the rest wait
                // below, so the form is reached in one thumb-scroll.
                <li
                  key={i}
                  className={cn('flex items-start gap-2.5 text-[15px] font-semibold', i > 2 && 'hidden sm:flex')}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                    <Icon name="check" size={13} strokeWidth={3} />
                  </span>
                  <span {...edText(bid, `bullets.${i}`)}>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {p.proof && (
            <p className="mt-7 flex items-center gap-2.5 text-[14px] font-semibold text-white/90">
              <Icon name="users" size={18} />
              <span {...edText(bid, 'proof')}>{p.proof}</span>
            </p>
          )}

          {chips.length > 0 && (
            <ul className="mt-5 hidden flex-wrap gap-2 lg:flex">
              {chips.map((c, i) => (
                <li
                  key={i}
                  className="border border-white/20 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[.08em] text-white/80"
                  {...edText(bid, `chips.${i}`)}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          id={FORM_ANCHOR}
          className="scroll-mt-24 bg-white p-5 text-ink shadow-[0_24px_60px_rgba(0,0,0,.35)] sm:p-7"
        >
          {p.formHeading && (
            <h2 className="h-display text-[24px] md:text-[28px]" {...edText(bid, 'formHeading')}>
              {p.formHeading}
            </h2>
          )}
          {p.formBody && (
            <p className="mb-5 mt-2 text-[14px] leading-relaxed text-body" {...edText(bid, 'formBody')}>
              {p.formBody}
            </p>
          )}
          <LeadForm
            idPrefix={`lh-${bid ?? 'x'}`}
            subject={p.subject || 'Custom jerseys'}
            sport={p.sport || 'Baseball'}
            sports={sportChoices(p)}
            source={lead.source}
            ctaLabel={p.ctaLabel || undefined}
            reassurance={p.reassurance || undefined}
            phone={lead.phone}
            phoneHref={lead.phoneHref}
          />
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- design showcase

/**
 * The designs, as a wall of pictures rather than a shop grid.
 *
 * On a landing page a product card's "View details" is an exit. Here each
 * design's button is "Use this design": it scrolls to the form and writes the
 * design's name into it (LeadForm listens for `data-design`), so the shopper
 * stays on the page and the shop learns which design they meant. Two columns
 * on a phone, so eight designs are two screens rather than eight.
 */
export function DesignShowcaseBlock({
  p,
  bid,
  products,
  showPrice,
}: {
  p: P;
  bid?: string;
  products: CardProduct[];
  showPrice: boolean;
}) {
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} body={p.body} align="center" bid={bid} />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {products.map((d) => {
          const name = shortName(d.title);
          const priced = showPrice && d.showPrice !== false && d.basePrice > 0;
          return (
            <li key={d.id} className="flex flex-col border border-hairline bg-white">
              <div className="relative aspect-square bg-plate">
                {d.image && (
                  <Image src={d.image} alt={d.title} fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-3 md:p-4">
                <span className="font-display text-[14px] font-extrabold uppercase leading-tight md:text-[15px]">
                  {name}
                </span>
                <span className="mt-1 text-[13px] text-muted">
                  {priced ? `From $${Math.round(d.basePrice)}` : 'Price on request'}
                </span>
                <a
                  href={`#${FORM_ANCHOR}`}
                  data-design={d.title}
                  className="btn btn-outline mt-3 w-full px-2 py-2.5 text-[12px]"
                >
                  {p.buttonLabel || 'Use this design'}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      {p.footnote && (
        <p className="mt-6 text-center text-[14px] text-muted" {...edText(bid, 'footnote')}>
          {p.footnote}
        </p>
      )}
    </Section>
  );
}

/** "Design #1 - Jerseys V Neck Fully customizable" → "Design #1 · V Neck". */
function shortName(title: string) {
  const t = String(title ?? '');
  const num = t.match(/design\s*#\s*\d+/i)?.[0]?.replace(/\s+/g, ' ');
  const cut = /v[\s-]?neck/i.test(t) ? 'V-neck' : /crew/i.test(t) ? 'Crew neck' : '';
  if (num) return [num.replace(/^design/i, 'Design'), cut].filter(Boolean).join(' · ');
  return t.replace(/\s*[-–—]?\s*fully customi[sz]able\s*/i, '').trim() || t;
}

// -------------------------------------------------------------------- price ladder

export function PriceLadderBlock({ p, bid }: { p: P; bid?: string }) {
  const tiers: P[] = (Array.isArray(p.tiers) ? p.tiers : []).filter((t: P) => t?.qty && t?.price);

  return (
    <Section background={(p.background as Bg) ?? 'surface'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} body={p.body} align="center" bid={bid} />
      {/* As many columns as there are steps, up to seven, so four steps
          fill a row instead of huddling at one end of a seven-wide grid. */}
      <ul
        className={cn(
          // Room above each card for its "Save …" tag.
          'mx-auto grid grid-cols-2 gap-x-3 gap-y-6 pt-3',
          tiers.length <= 4
            ? 'max-w-[860px] sm:grid-cols-4'
            : 'max-w-[1080px] sm:grid-cols-4 lg:grid-cols-7'
        )}
      >
        {tiers.map((t, i) => (
          <li
            key={i}
            className={cn(
              'relative flex flex-col items-center border px-3 pb-5 pt-6 text-center',
              t.highlight ? 'border-ink bg-brand' : 'border-hairline bg-white'
            )}
          >
            {t.tag && (
              <span
                className={cn(
                  'absolute -top-3 whitespace-nowrap px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.1em]',
                  t.highlight ? 'bg-ink text-white' : 'bg-brand text-ink'
                )}
                {...edText(bid, `tiers.${i}.tag`)}
              >
                {t.tag}
              </span>
            )}
            <span className="text-[13px] font-semibold text-body" {...edText(bid, `tiers.${i}.qty`)}>
              {t.qty}
            </span>
            <span className="mt-1 font-display text-[30px] font-black leading-none" {...edText(bid, `tiers.${i}.price`)}>
              {t.price}
            </span>
            <span className="mt-1 text-[12px] font-medium text-muted">{p.unit || 'per jersey'}</span>
          </li>
        ))}
      </ul>
      {p.note && (
        <p className="mx-auto mt-6 max-w-[640px] text-center text-[14px] text-muted" {...edText(bid, 'note')}>
          {p.note}
        </p>
      )}
      {p.ctaLabel && (
        <div className="mt-8 text-center">
          <a href={p.ctaHref || `#${FORM_ANCHOR}`} className="btn btn-yellow btn-lg">
            <span {...edText(bid, 'ctaLabel')}>{p.ctaLabel}</span>
          </a>
        </div>
      )}
    </Section>
  );
}

// -------------------------------------------------------------------- faq

/**
 * Questions typed into the block itself, not drawn from the FAQ collection,
 * so a landing page can answer exactly what its ad raised. Plain
 * <details>/<summary>: opens without a line of JavaScript.
 */
export function FaqListBlock({ p, bid }: { p: P; bid?: string }) {
  const items: P[] = (Array.isArray(p.items) ? p.items : []).filter((x: P) => x?.q && x?.a);
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} align="center" bid={bid} />
      <div className="mx-auto max-w-[820px] divide-y divide-hairline border-y border-hairline">
        {items.map((f, i) => (
          <details key={i} className="group py-1" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-display text-[17px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
              <span {...edText(bid, `items.${i}.q`)}>{f.q}</span>
              <span className="shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">
                <Icon name="plus" size={18} />
              </span>
            </summary>
            <p className="pb-5 text-[15px] leading-relaxed text-body" {...edText(bid, `items.${i}.a`)}>
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------- closing form

export function LeadFormBlock({ p, bid, lead }: { p: P; bid?: string; lead: LeadContext }) {
  const points = list(p.points);
  return (
    <section className="gutter bg-ink py-14 text-white md:py-20" data-reveal-root>
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          {p.eyebrow && (
            <div className="eyebrow mb-3 text-brand" {...edText(bid, 'eyebrow')}>
              {p.eyebrow}
            </div>
          )}
          <h2 className="h-display text-[30px] text-white md:text-[42px]" {...edText(bid, 'heading')}>
            {p.heading}
          </h2>
          {p.body && (
            <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-white/80" {...edText(bid, 'body')}>
              {p.body}
            </p>
          )}
          {points.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {points.map((b, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <Icon name="check" size={16} strokeWidth={3} className="text-brand" />
                  <span {...edText(bid, `points.${i}`)}>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {lead.phone && lead.phoneHref && (
            <p className="mt-7 text-[15px] text-white/80">
              Rather talk?{' '}
              <a href={lead.phoneHref} className="font-semibold text-white underline underline-offset-2">
                Call {lead.phone}
              </a>
            </p>
          )}
        </div>
        <div className="bg-white p-5 text-ink sm:p-7">
          <LeadForm
            idPrefix={`lf-${bid ?? 'x'}`}
            subject={p.subject || 'Custom jerseys'}
            sport={p.sport || 'Baseball'}
            sports={sportChoices(p)}
            source={lead.source}
            ctaLabel={p.ctaLabel || undefined}
            reassurance={p.reassurance || undefined}
            phone={lead.phone}
            phoneHref={lead.phoneHref}
          />
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- comparison

/**
 * Ours against the usual way, row by row — the strongest single argument a
 * pinstripe page has, set out so it can be read in five seconds. Every row is
 * a claim typed in the page builder, so it must be one the shop stands by.
 */
export function CompareTableBlock({ p, bid }: { p: P; bid?: string }) {
  const rows: P[] = (Array.isArray(p.rows) ? p.rows : []).filter((r: P) => r?.feature);
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} body={p.body} align="center" bid={bid} />
      <div className="mx-auto max-w-[920px] overflow-hidden border border-hairline">
        <div className="grid grid-cols-2 bg-ink text-white sm:grid-cols-[1.1fr_1fr_1fr]">
          <div className="hidden px-3 py-3.5 sm:block md:px-5" />
          <div
            className="bg-brand px-3 py-3.5 text-center font-display text-[12px] font-extrabold uppercase tracking-[.08em] text-ink md:px-5 md:text-[14px]"
            {...edText(bid, 'oursLabel')}
          >
            {p.oursLabel || 'Ours'}
          </div>
          <div
            className="px-3 py-3.5 text-center font-display text-[12px] font-extrabold uppercase tracking-[.08em] text-white/80 md:px-5 md:text-[14px]"
            {...edText(bid, 'theirsLabel')}
          >
            {p.theirsLabel || 'Others'}
          </div>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            // On a phone the row's name runs across the top and the two answers sit
            // side by side under it; three columns of wrapped words read badly.
            className={cn('grid grid-cols-2 border-t border-hairline sm:grid-cols-[1.1fr_1fr_1fr]', i % 2 ? 'bg-surface' : 'bg-white')}
          >
            <div className="col-span-2 px-3 pb-1 pt-3.5 text-[12px] font-extrabold uppercase tracking-[.06em] text-ink sm:col-span-1 sm:py-4 sm:text-[13px] sm:normal-case sm:tracking-normal md:px-5 md:text-[15px]" {...edText(bid, `rows.${i}.feature`)}>
              {r.feature}
            </div>
            <div className="flex items-start gap-2 bg-brand-tint px-3 py-4 text-[13px] font-semibold text-ink md:px-5 md:text-[14px]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
                <Icon name="check" size={12} strokeWidth={3} />
              </span>
              <span {...edText(bid, `rows.${i}.ours`)}>{r.ours}</span>
            </div>
            <div className="flex items-start gap-2 px-3 py-4 text-[13px] text-body md:px-5 md:text-[14px]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ececE8] text-muted">
                <Icon name="close" size={11} strokeWidth={2.6} />
              </span>
              <span {...edText(bid, `rows.${i}.theirs`)}>{r.theirs}</span>
            </div>
          </div>
        ))}
      </div>
      {p.ctaLabel && (
        <div className="mt-9 text-center">
          <a href={p.ctaHref || `#${SHOP_ANCHOR}`} className="btn btn-yellow btn-lg">
            <span {...edText(bid, 'ctaLabel')}>{p.ctaLabel}</span>
          </a>
        </div>
      )}
    </Section>
  );
}

// -------------------------------------------------------------------- trust bar

/**
 * Four reasons to trust the shop, small enough to sit straight under the
 * hero without pushing the products off the first scroll: two by two on a
 * phone, one row on a wide screen, icon beside the words rather than above.
 */
export function TrustBarBlock({ p, bid }: { p: P; bid?: string }) {
  const items: P[] = (Array.isArray(p.items) ? p.items : []).filter((x: P) => x?.title);
  return (
    <section
      className={cn('gutter border-b border-hairline py-5 md:py-7', p.background === 'surface' ? 'bg-surface' : 'bg-white')}
    >
      {/* Columns to suit the count, so three reasons leave no gap: four sit
          two by two on a phone, an odd number one per row. */}
      <ul
        className={cn(
          'mx-auto grid max-w-[1180px] gap-x-4 gap-y-5',
          items.length % 2 === 0 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3',
          items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
        )}
      >
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-ink md:h-11 md:w-11">
              <Icon name={it.icon || 'check'} size={20} />
            </span>
            <span className="min-w-0">
              <span
                className="block font-display text-[13px] font-extrabold uppercase leading-tight tracking-[.03em] md:text-[14px]"
                {...edText(bid, `items.${i}.title`)}
              >
                {it.title}
              </span>
              {it.body && (
                <span className="mt-0.5 block text-[12px] leading-snug text-muted md:text-[13px]" {...edText(bid, `items.${i}.body`)}>
                  {it.body}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
