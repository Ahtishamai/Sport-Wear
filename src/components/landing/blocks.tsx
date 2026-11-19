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
import { LeadForm } from './LeadForm';

/**
 * Blocks made for paid-traffic landing pages (/lp/…), and usable on any page.
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
          <h1
            className="h-display text-white"
            style={{ fontSize: 'clamp(32px,4.4vw,58px)', lineHeight: 0.98 }}
            {...edText(bid, 'heading')}
          >
            {p.heading}
          </h1>
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
      <ul className="mx-auto grid max-w-[1080px] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiers.map((t, i) => (
          <li
            key={i}
            className={cn(
              'relative flex flex-col items-center border px-3 pb-5 pt-6 text-center',
              t.highlight ? 'border-ink bg-brand' : 'border-hairline bg-white'
            )}
          >
            {t.highlight && t.tag && (
              <span
                className="absolute -top-3 bg-ink px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.1em] text-white"
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
            <span className="mt-1 text-[12px] font-medium text-muted">per jersey</span>
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
          <a href={`#${FORM_ANCHOR}`} className="btn btn-yellow btn-lg">
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
