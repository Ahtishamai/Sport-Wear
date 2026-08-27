import Link from 'next/link';
import Image from 'next/image';
import { cn, money } from '@/lib/utils';
import { QuoteButton } from '@/components/site/QuoteButton';

// ------------------------------------------------------------------ inline editing

/**
 * `data-edit` marks an element as editable from the live site (see InlineEditor).
 * The value encodes exactly which block prop the element renders, so a save
 * needs no page context: `block:<blockId>:<propPath>`.
 */
export function edText(bid: string | undefined, path: string) {
  return bid ? { 'data-edit': `block:${bid}:${path}`, 'data-edit-kind': 'text' } : {};
}

export function edImage(bid: string | undefined, path: string) {
  return bid ? { 'data-edit': `block:${bid}:${path}`, 'data-edit-kind': 'image' } : {};
}

export function edSetting(path: string, kind: 'text' | 'image' = 'text') {
  return { 'data-edit': `setting:${path}`, 'data-edit-kind': kind };
}

export type EditableProps = { bid?: string };

// ------------------------------------------------------------------ layout

export type Bg = 'white' | 'surface' | 'ink' | 'yellow';

export const BG_CLASS: Record<Bg, string> = {
  white: 'bg-white text-ink',
  surface: 'bg-surface text-ink',
  ink: 'bg-ink text-white',
  yellow: 'bg-brand text-ink',
};

export function Section({
  background = 'white',
  className,
  children,
  bordered,
  id,
}: {
  background?: Bg;
  className?: string;
  children: React.ReactNode;
  bordered?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      data-reveal-root
      className={cn(
        BG_CLASS[background] ?? BG_CLASS.white,
        bordered && 'border-y border-hairline',
        'gutter py-[76px] md:py-[88px]',
        className
      )}
    >
      {children}
    </section>
  );
}

export function Eyebrow({
  children,
  onDark,
  className,
  bid,
  path,
}: {
  children?: React.ReactNode;
  onDark?: boolean;
  className?: string;
  bid?: string;
  path?: string;
}) {
  if (!children) return null;
  return (
    <div
      {...(path ? edText(bid, path) : {})}
      className={cn('eyebrow mb-3.5', onDark ? 'text-brand' : 'text-brand-text', className)}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  heading,
  body,
  align = 'left',
  onDark,
  className,
  bid,
  paths,
}: {
  eyebrow?: string;
  heading?: string;
  body?: string;
  align?: 'left' | 'center';
  onDark?: boolean;
  className?: string;
  bid?: string;
  paths?: { eyebrow?: string; heading?: string; body?: string };
}) {
  if (!eyebrow && !heading && !body) return null;
  return (
    <div className={cn(align === 'center' && 'text-center', 'mb-10', className)}>
      <Eyebrow onDark={onDark} bid={bid} path={paths?.eyebrow ?? 'eyebrow'}>
        {eyebrow}
      </Eyebrow>
      {heading && (
        <h2 className="h-section" {...edText(bid, paths?.heading ?? 'heading')}>
          {heading}
        </h2>
      )}
      {body && (
        <p
          {...edText(bid, paths?.body ?? 'body')}
          className={cn(
            'mt-4 max-w-[640px] text-[17px] leading-relaxed',
            onDark ? 'text-ondark-2' : 'text-body',
            align === 'center' && 'mx-auto'
          )}
        >
          {body}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ tiles

/** Photo tile with a gradient scrim and an overlaid label block. */
export function PhotoTile({
  eyebrow,
  title,
  links,
  image,
  href,
  align = 'left',
  height = 380,
  priority,
  bid,
  ep,
}: {
  eyebrow?: string;
  title: string;
  links?: string[];
  image?: string;
  href?: string;
  align?: 'left' | 'right';
  height?: number;
  priority?: boolean;
  bid?: string;
  /** edit path prefix for this tile, e.g. `tiles.0` */
  ep?: string;
}) {
  const path = (field: string) => (ep ? `${ep}.${field}` : field);

  const inner = (
    <div
      className="group zoom-wrap tile-h relative block w-full bg-plate"
      style={{ ["--tile-h"]: `${height}px` } as React.CSSProperties}
      {...edImage(bid, path('image'))}
    >
      {image ? (
        <Image
          src={image}
          alt={title}
          fill
          priority={priority}
          sizes="(max-width: 900px) 100vw, 50vw"
          className="zoom-img object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            align === 'left'
              ? 'linear-gradient(90deg, rgba(16,17,20,.8) 0%, rgba(16,17,20,.35) 45%, rgba(16,17,20,.05) 100%)'
              : 'linear-gradient(270deg, rgba(16,17,20,.8) 0%, rgba(16,17,20,.35) 45%, rgba(16,17,20,.05) 100%)',
        }}
      />
      <div
        className={cn(
          'absolute top-0 max-w-[80%] px-[34px] py-8',
          align === 'right' && 'right-0 text-right'
        )}
      >
        {eyebrow && (
          <div className="eyebrow mb-2.5 text-brand" {...edText(bid, path('eyebrow'))}>
            {eyebrow}
          </div>
        )}
        <h3
          className="h-display text-white"
          style={{ fontSize: 'clamp(28px,2.9vw,42px)', lineHeight: 0.98 }}
          {...edText(bid, path('title'))}
        >
          {title}
        </h3>
        {links && links.length > 0 && (
          <div className="mt-3 text-[12px] font-semibold uppercase tracking-[.12em] text-white/[.88]">
            {links.join(' | ')}
          </div>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ------------------------------------------------------------------ catalog cards
// These render live catalog records, so they are edited in Admin → Products,
// not inline. They deliberately carry no data-edit attributes.

export type CardProduct = {
  id: string;
  handle: string;
  title: string;
  basePrice: number;
  badge?: string | null;
  categoryLabel?: string;
  image?: string | null;
};

export function ProductPlateCard({ p }: { p: CardProduct }) {
  return (
    <Link href={`/products/${p.handle}`} className="group block">
      <div className="zoom-wrap relative h-[300px] border border-hairline bg-surface sm:h-[400px]">
        {p.image ? (
          <Image
            src={p.image}
            alt={p.title}
            fill
            sizes="(max-width: 900px) 50vw, 25vw"
            className="zoom-img object-contain p-6"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      <h3 className="mt-5 text-center font-display text-[19px] font-extrabold uppercase leading-tight">
        {p.title}
      </h3>
      <p className="mt-1.5 text-center text-[16px] font-semibold text-muted">
        From{' '}
        <span className="font-display text-[22px] font-black text-ink">{money(p.basePrice)}</span>
      </p>
    </Link>
  );
}

export function ProductCatalogCard({ p }: { p: CardProduct }) {
  return (
    <Link
      href={`/products/${p.handle}`}
      className="group flex flex-col border border-hairline bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-ink hover:shadow-card-hover"
    >
      <div className="zoom-wrap relative h-[250px] border-b border-hairline bg-plate">
        {p.image ? (
          <Image
            src={p.image}
            alt={p.title}
            fill
            sizes="(max-width: 700px) 100vw, 300px"
            className="zoom-img object-cover"
          />
        ) : (
          <ImagePlaceholder />
        )}
        {p.badge && (
          <span className="absolute left-3 top-3 bg-brand px-[9px] py-[7px] text-[10px] font-bold uppercase tracking-[.14em] text-ink">
            {p.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[17px] font-extrabold uppercase leading-tight">{p.title}</h3>
        <p className="mt-1.5 text-[13px] text-muted">{p.categoryLabel}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <span className="block text-[12px] font-medium text-faint">From</span>
            <span className="font-display text-[23px] font-black leading-none">
              {money(p.basePrice)}
            </span>
          </div>
          <span className="btn btn-outline px-4 py-2.5 text-[11px] group-hover:border-ink group-hover:bg-brand group-hover:text-ink">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
}

export type CardPackage = {
  id: string;
  handle: string;
  tag: string;
  name: string;
  price: number;
  note?: string | null;
  items: string[];
  imageUrl?: string | null;
  highlight: boolean;
};

export function PackageCard({ pk }: { pk: CardPackage }) {
  const hl = pk.highlight;
  return (
    <article
      className="flex flex-col border"
      style={{
        background: hl ? '#FFD100' : '#FFFFFF',
        borderColor: hl ? '#FFD100' : '#E6E6E2',
      }}
    >
      <div
        className="zoom-wrap relative h-[340px] border-b"
        style={{ borderColor: hl ? 'rgba(16,17,20,.15)' : '#E6E6E2', background: '#F0F0ED' }}
      >
        {pk.imageUrl ? (
          <Image
            src={pk.imageUrl}
            alt={`${pk.tag} — ${pk.name}`}
            fill
            sizes="(max-width: 900px) 100vw, 25vw"
            className="zoom-img object-cover"
          />
        ) : (
          <ImagePlaceholder label="Package photo" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-8 py-[34px]">
        <div
          className="mb-3 text-[11px] font-bold uppercase tracking-[.16em]"
          style={{ color: hl ? 'rgba(16,17,20,.6)' : '#8A7300' }}
        >
          {pk.tag}
        </div>
        <h3 className="h-display text-[28px]">{pk.name}</h3>
        <ul className="mt-5 space-y-2.5">
          {pk.items.map((it, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[15px] font-medium leading-snug"
              style={{ color: hl ? 'rgba(16,17,20,.72)' : '#55575E' }}
            >
              <span aria-hidden="true" style={{ color: hl ? '#101114' : '#1F8A4C' }}>
                ✓
              </span>
              {it}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex items-baseline gap-2">
          <span className="font-display text-[46px] font-black leading-none">
            {money(pk.price)}
          </span>
          <span className="text-[13px] font-semibold text-muted">/ player</span>
        </div>
        {pk.note && (
          <p
            className="mt-2 text-[13px] font-medium"
            style={{ color: hl ? 'rgba(16,17,20,.66)' : '#8A8C93' }}
          >
            {pk.note}
          </p>
        )}
        <QuoteButton
          subject={`${pk.tag} — ${money(pk.price)}/player`}
          className="btn mt-6 w-full py-[18px] text-[14px]"
          style={
            hl
              ? { background: '#101114', color: '#FFFFFF', borderColor: '#101114' }
              : { background: 'transparent', color: '#101114', borderColor: '#101114' }
          }
        >
          Request quote
        </QuoteButton>
      </div>
    </article>
  );
}

export function ImagePlaceholder({ label = 'Photo' }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-plate-2 text-[12px] font-semibold uppercase tracking-[.14em] text-faint">
      {label}
    </div>
  );
}

// ------------------------------------------------------------------ text

/** Minimal inline markdown: **bold**, [text](href), and blank-line paragraphs. */
export function RichText({
  text,
  className,
  bid,
  path,
}: {
  text?: string;
  className?: string;
  bid?: string;
  path?: string;
}) {
  if (!text) return null;
  const paragraphs = String(text).split(/\n\s*\n/);

  // In edit mode the whole body is one editable region, so keep the raw source
  // in a single element when a path is supplied.
  if (bid && path) {
    return (
      <div className={cn('prose-ds', className)} {...edText(bid, path)} data-edit-multiline="true">
        {paragraphs.map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(p) }} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('prose-ds', className)}>
      {paragraphs.map((p, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(p) }} />
      ))}
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function inlineMarkdown(src: string) {
  return escapeHtml(src)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_m, label: string, href: string) =>
        /^(https?:|mailto:|tel:|\/|#)/.test(href)
          ? `<a href="${href}">${label}</a>`
          : `${label}`
    )
    .replace(/\n/g, '<br />');
}
