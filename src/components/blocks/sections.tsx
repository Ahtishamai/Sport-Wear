import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { QuoteButton } from '@/components/site/QuoteButton';
import {
  BG_CLASS,
  edImage,
  edText,
  Eyebrow,
  ImagePlaceholder,
  PackageCard,
  PhotoTile,
  ProductCatalogCard,
  ProductPlateCard,
  RichText,
  Section,
  SectionHeading,
  type Bg,
  type CardPackage,
  type CardProduct,
} from './primitives';

type P = Record<string, any>;
type TileP = React.ComponentProps<typeof PhotoTile>;

/** Every block component receives the id of the block it is rendering, so its
 *  text and images can be edited in place on the live site. */
export type BlockComponentProps = { p: P; bid?: string; priority?: boolean };

// -------------------------------------------------------------------- hero

export function HeroBlock({ p, bid, priority }: BlockComponentProps) {
  // Both fields are lists, so the hero takes as many buttons as are added
  // rather than only the first of each.
  const primary: { label?: string; href?: string }[] = Array.isArray(p.primary) ? p.primary : [];
  const secondary: { label?: string; href?: string }[] = Array.isArray(p.secondary)
    ? p.secondary
    : [];
  const height = Math.max(380, Number(p.height) || 720);
  return (
    <section
      className="hero-band relative flex items-center overflow-hidden bg-ink py-16 md:py-0"
      // Phones hug the content (padding does the work); the designed fixed
      // height applies from tablet up — see .hero-band.
      style={{ ['--hero-height' as string]: `${height}px` }}
      data-hero
      data-reveal-root
    >
      <div className="absolute inset-0" {...edImage(bid, 'image')}>
        {p.image ? (
          <Image
            src={p.image}
            alt=""
            fill
            priority={priority}
            sizes="100vw"
            data-parallax={p.parallax === false ? undefined : '0.18'}
            className="h-full w-full object-cover"
            style={{ transform: 'scale(1.14)' }}
          />
        ) : null}
      </div>
      {/* The designed left-to-right scrim only protects text that sits in the
          left column. On phones the copy spans the full width, so it gets a
          top-to-bottom scrim instead. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(16,17,20,.82) 0%, rgba(16,17,20,.74) 55%, rgba(16,17,20,.86) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(16,17,20,.92) 0%, rgba(16,17,20,.72) 42%, rgba(16,17,20,.35) 100%)',
        }}
      />
      <div
        className="gutter relative w-full"
        style={{ textShadow: '0 2px 18px rgba(16,17,20,.65)' }}
      >
        {p.badge && (
          <span
            className="mb-5 inline-block bg-brand px-3 py-2 text-[10px] font-bold uppercase leading-snug tracking-[.12em] text-ink md:mb-6 md:px-[15px] md:py-[9px] md:text-[12px] md:tracking-[.16em]"
            {...edText(bid, 'badge')}
          >
            {p.badge}
          </span>
        )}
        <h1
          className="h-display max-w-[900px] text-white"
          style={{ fontSize: 'clamp(30px,7vw,70px)' }}
          {...edText(bid, 'heading')}
        >
          {p.heading}
        </h1>
        {p.body && (
          <p
            className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-ondark md:mt-6 md:text-[19px]"
            {...edText(bid, 'body')}
          >
            {p.body}
          </p>
        )}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3.5 md:mt-8">
          {primary.map((b, i) =>
            b?.label ? (
              <CtaLink
                key={`p-${i}`}
                href={b.href}
                className="btn btn-yellow btn-lg w-full sm:w-auto"
                bid={bid}
                path={`primary.${i}.label`}
              >
                {b.label}
              </CtaLink>
            ) : null
          )}
          {secondary.map((b, i) =>
            b?.label ? (
              <CtaLink
                key={`s-${i}`}
                href={b.href}
                className="btn btn-ghost-light btn-lg w-full sm:w-auto"
                bid={bid}
                path={`secondary.${i}.label`}
              >
                {b.label}
              </CtaLink>
            ) : null
          )}
        </div>
        {p.proof && (
          <div className="mt-7 flex items-center gap-3 md:mt-8">
            <span className="text-[15px] tracking-[1px] text-brand" aria-hidden="true">
              ★★★★★
            </span>
            <span className="text-[14px] font-semibold text-white" {...edText(bid, 'proof')}>
              {p.proof}
            </span>
          </div>
        )}
      </div>
      {(p.cornerYear || p.cornerLabel) && (
        <div className="absolute bottom-0 left-0 bg-brand px-5 py-[13px]">
          <div className="font-display text-[22px] font-black leading-none" {...edText(bid, 'cornerYear')}>
            {p.cornerYear}
          </div>
          <div
            className="mt-1 text-[11px] font-bold uppercase tracking-[.14em] text-brand-on"
            {...edText(bid, 'cornerLabel')}
          >
            {p.cornerLabel}
          </div>
        </div>
      )}
    </section>
  );
}

export function PageHeaderBlock({
  p,
  bid,
  breadcrumb,
}: BlockComponentProps & { breadcrumb?: { label: string; href?: string }[] }) {
  const dark = p.theme === 'dark';
  return (
    <section
      data-reveal-root
      className={cn(
        'gutter border-b',
        dark ? 'border-transparent bg-ink text-white' : 'border-hairline bg-surface text-ink'
      )}
      style={{ paddingTop: dark ? 56 : 36, paddingBottom: dark ? 60 : 44 }}
    >
      {p.showBreadcrumb !== false && breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-muted">
            {breadcrumb.map((b, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {b.href ? (
                  <Link href={b.href} className="transition-colors hover:text-ink">
                    {b.label}
                  </Link>
                ) : (
                  <span className={dark ? 'text-ondark-2' : undefined}>{b.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span aria-hidden="true">/</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <Eyebrow onDark={dark} bid={bid} path="eyebrow">
        {p.eyebrow}
      </Eyebrow>
      <h1
        className="h-display"
        style={{ fontSize: 'clamp(34px,4.6vw,62px)', lineHeight: 0.98 }}
        {...edText(bid, 'heading')}
      >
        {p.heading}
      </h1>
      {p.body && (
        <p
          {...edText(bid, 'body')}
          className={cn(
            'mt-5 max-w-[720px] text-[17px] leading-relaxed md:text-[18px]',
            dark ? 'text-ondark-2' : 'text-body'
          )}
        >
          {p.body}
        </p>
      )}
      {p.image && (
        <div
          className="zoom-wrap relative mt-9 w-full bg-plate"
          style={{ height: 'clamp(200px,22vw,280px)' }}
          {...edImage(bid, 'image')}
        >
          <Image src={p.image} alt="" fill sizes="100vw" className="object-cover" />
        </div>
      )}
    </section>
  );
}

// -------------------------------------------------------------------- proof

/**
 * The USP strip. Sits in its own padded band rather than welded to the hero,
 * with real gaps between cells and a compact type scale so it reads as a
 * supporting row instead of competing with the headline.
 */
export function StatStripBlock({ p, bid }: BlockComponentProps) {
  const items: P[] = p.items ?? [];
  if (!items.length) return null;

  return (
    <section
      data-reveal-root
      className={cn(
        BG_CLASS[(p.background as Bg) ?? 'white'],
        'gutter py-8 md:py-11'
      )}
    >
      <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
        {items.map((s, i) => (
          <div
            key={i}
            className={cn(
              'border px-4 py-4 text-center md:px-5 md:py-5 lg:text-left',
              s.highlight ? 'border-brand bg-brand' : 'border-hairline bg-white'
            )}
          >
            <div
              className="font-display text-[22px] font-black leading-none md:text-[26px]"
              data-count={s.count ? String(s.count) : undefined}
              data-suffix={s.suffix || undefined}
              {...edText(bid, `items.${i}.value`)}
            >
              {s.value}
            </div>
            <div
              className="mt-2 text-[10px] font-semibold uppercase leading-snug tracking-[.1em] md:text-[11px]"
              style={{ color: s.highlight ? '#5C4E00' : '#8A8C93' }}
              {...edText(bid, `items.${i}.label`)}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Free-form stat grid — any number of cells, used for "By the numbers". */
export function NumbersGridBlock({ p, bid }: BlockComponentProps) {
  const items: P[] = p.items ?? [];
  if (!items.length) return null;
  const onDark = p.background === 'ink';
  return (
    <Section background={(p.background as Bg) ?? 'ink'}>
      <SectionHeading
        eyebrow={p.eyebrow}
        heading={p.heading}
        body={p.body}
        align={p.align ?? 'center'}
        onDark={onDark}
        bid={bid}
      />
      <div
        className="grid gap-px border border-hairline/20"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${Number(p.minWidth) || 220}px, 1fr))`,
          background: onDark ? 'rgba(255,255,255,.14)' : '#E6E6E2',
        }}
      >
        {items.map((s, i) => (
          <div
            key={i}
            className={cn('px-6 py-8 text-center', onDark ? 'bg-ink' : 'bg-white')}
          >
            <div
              className={cn(
                'font-display text-[34px] font-black leading-none md:text-[40px]',
                onDark ? 'text-brand' : 'text-ink'
              )}
              data-count={s.count ? String(s.count) : undefined}
              data-suffix={s.suffix || undefined}
              {...edText(bid, `items.${i}.value`)}
            >
              {s.value}
            </div>
            <div
              className={cn(
                'mt-3 text-[13px] font-semibold leading-snug',
                onDark ? 'text-ondark-2' : 'text-body'
              )}
              {...edText(bid, `items.${i}.label`)}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function MarqueeBlock({ p }: BlockComponentProps) {
  const items: string[] = p.items ?? [];
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <section className="overflow-hidden border-b border-hairline bg-white py-4">
      <div
        data-marquee
        className="animate-marq flex w-max items-center gap-6 whitespace-nowrap"
        style={{ animationDuration: `${Number(p.speed) || 28}s` }}
      >
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-6">
            <span className="text-[13px] font-semibold uppercase tracking-[.2em] text-faint">
              {t}
            </span>
            <span aria-hidden="true" className="text-brand">
              ✦
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

export type ReviewItem = {
  id: string;
  text: string;
  name: string;
  role: string;
  initials: string;
  rating: number;
};

export function ReviewsBlock({
  p,
  bid,
  reviews,
}: BlockComponentProps & { reviews: ReviewItem[] }) {
  if (!reviews.length) return null;
  const row = [...reviews, ...reviews];
  return (
    <section data-reveal-root className="overflow-hidden bg-white py-[76px] md:py-[88px]">
      <div className="gutter mb-10 text-center">
        <Eyebrow bid={bid} path="eyebrow">
          {p.eyebrow}
        </Eyebrow>
        {p.heading && (
          <h2 className="h-section" {...edText(bid, 'heading')}>
            {p.heading}
          </h2>
        )}
        {p.ratingLine && (
          <p className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-[15px] font-medium text-body">
            <span className="tracking-[1px] text-gold" aria-hidden="true">
              ★★★★★
            </span>
            <span {...edText(bid, 'ratingLine')}>{p.ratingLine}</span>
          </p>
        )}
      </div>
      <div className="marquee-mask pause-on-hover overflow-hidden">
        <div
          data-marquee
          className="animate-revscroll flex w-max gap-5"
          style={{ animationDuration: `${Number(p.speed) || 46}s` }}
        >
          {row.map((r, i) => (
            <article
              key={`${r.id}-${i}`}
              className="w-[360px] shrink-0 border border-hairline bg-white px-7 py-[30px] shadow-review"
            >
              <div className="flex items-start justify-between">
                <span className="tracking-[1px] text-gold" aria-hidden="true">
                  {'★'.repeat(r.rating || 5)}
                </span>
                <span
                  aria-hidden="true"
                  className="font-display text-[40px] font-black leading-none"
                  style={{ color: 'rgba(255,209,0,.55)' }}
                >
                  &rdquo;
                </span>
              </div>
              <p className="mt-4 text-[16px] leading-[1.65] text-quote">{r.text}</p>
              <div className="mt-6 flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-brand">
                  {r.initials}
                </span>
                <span>
                  <span className="block text-[14px] font-bold">{r.name}</span>
                  <span className="block text-[12px] text-muted">{r.role}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- commerce

export function FeaturedTilesBlock({ p, bid }: BlockComponentProps) {
  const tiles: P[] = p.tiles ?? [];
  const [a, b, c, d] = tiles;
  return (
    <Section>
      <SectionHeading heading={p.heading} align={p.align ?? 'center'} bid={bid} />
      <div className="grid gap-3 lg:grid-cols-3">
        {a && <PhotoTile {...(a as TileP)} height={680} priority bid={bid} ep="tiles.0" />}
        {b && <PhotoTile {...(b as TileP)} height={680} bid={bid} ep="tiles.1" />}
        <div className="grid gap-3">
          {c && <PhotoTile {...(c as TileP)} height={334} bid={bid} ep="tiles.2" />}
          {d && <PhotoTile {...(d as TileP)} height={334} bid={bid} ep="tiles.3" />}
        </div>
      </div>
    </Section>
  );
}

export function TileGroupsBlock({ p, bid }: BlockComponentProps) {
  const groups: P[] = p.groups ?? [];
  return (
    <Section>
      <div className="grid gap-11 lg:grid-cols-2">
        {groups.map((g, i) => (
          <div key={i}>
            <h2 className="h-section mb-7" {...edText(bid, `groups.${i}.heading`)}>
              {g.heading}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(g.tiles ?? []).map((t: P, j: number) => (
                <PhotoTile
                  key={j}
                  {...(t as TileP)}
                  height={380}
                  bid={bid}
                  ep={`groups.${i}.tiles.${j}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function CategoryCardsBlock({ p, bid }: BlockComponentProps) {
  const cards: P[] = p.cards ?? [];
  return (
    <Section>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} bid={bid} />
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c, i) => (
          <Link key={i} href={c.href || '/collections'} className="group block border border-hairline">
            <div
              className="zoom-wrap tile-h relative bg-plate"
              style={{ ['--tile-h']: `${Number(p.height) || 460}px` } as React.CSSProperties}
              {...edImage(bid, `cards.${i}.image`)}
            >
              {c.image ? (
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                  className="zoom-img object-cover"
                />
              ) : (
                <ImagePlaceholder />
              )}
            </div>
            <div className="border-t border-hairline p-8">
              <h3 className="h-display text-[26px]" {...edText(bid, `cards.${i}.title`)}>
                {c.title}
              </h3>
              <p
                className="mt-3 text-[16px] leading-relaxed text-body"
                {...edText(bid, `cards.${i}.body`)}
              >
                {c.body}
              </p>
              <span className="mt-5 inline-block border-b-2 border-brand pb-1 text-[13px] font-semibold uppercase tracking-[.1em]">
                <span {...edText(bid, `cards.${i}.linkLabel`)}>
                  {c.linkLabel || `Explore ${c.title}`}
                </span>{' '}
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function ProductGridBlock({
  p,
  bid,
  products,
}: BlockComponentProps & { products: CardProduct[] }) {
  if (!products.length) return null;
  const catalog = p.cardStyle === 'catalog';
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <SectionHeading heading={p.heading} align={p.align ?? 'center'} bid={bid} />
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${catalog ? 258 : 260}px, 1fr))`,
        }}
      >
        {products.map((pr) =>
          catalog ? (
            <ProductCatalogCard key={pr.id} p={pr} />
          ) : (
            <ProductPlateCard key={pr.id} p={pr} />
          )
        )}
      </div>
      {p.ctaLabel && (
        <div className="mt-12 text-center">
          <CtaLink
            href={p.ctaHref || '/collections'}
            className="btn btn-ink btn-lg"
            bid={bid}
            path="ctaLabel"
          >
            {p.ctaLabel}
          </CtaLink>
        </div>
      )}
    </Section>
  );
}

export function PackagesGridBlock({
  p,
  bid,
  packages,
}: BlockComponentProps & { packages: CardPackage[] }) {
  if (!packages.length) return null;
  return (
    <Section background={(p.background as Bg) ?? 'surface'} bordered={p.background !== 'ink'}>
      <SectionHeading
        eyebrow={p.eyebrow}
        heading={p.heading}
        body={p.body}
        onDark={p.background === 'ink'}
        bid={bid}
      />
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
      >
        {packages.map((pk) => (
          <PackageCard key={pk.id} pk={pk} />
        ))}
      </div>
    </Section>
  );
}

export type CollectionCard = {
  id: string;
  handle: string;
  title: string;
  subtitle?: string | null;
  thumbUrl?: string | null;
  count: number;
};

export function CollectionListBlock({
  p,
  bid,
  collections,
}: BlockComponentProps & { collections: CollectionCard[] }) {
  if (!collections.length) return null;
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} bid={bid} />
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.handle}`}
            className="group border border-hairline transition-all duration-200 hover:-translate-y-[3px] hover:border-ink hover:shadow-card-hover"
          >
            <div className="zoom-wrap relative h-[240px] border-b border-hairline bg-plate">
              {c.thumbUrl ? (
                <Image
                  src={c.thumbUrl}
                  alt={c.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 33vw"
                  className="zoom-img object-cover"
                />
              ) : (
                <ImagePlaceholder />
              )}
            </div>
            <div className="p-6">
              <h3 className="font-display text-[19px] font-extrabold uppercase">{c.title}</h3>
              <p className="mt-1.5 text-[13px] text-muted">
                {c.count} {c.count === 1 ? 'product' : 'products'}
                {c.subtitle ? ` · ${c.subtitle}` : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------- conversion

export function StepsBlock({ p, bid }: BlockComponentProps) {
  const steps: P[] = p.steps ?? [];
  return (
    <Section background={(p.background as Bg) ?? 'white'} className="md:py-[92px]">
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} align="center" bid={bid} />
      <div
        className="grid gap-7"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}
      >
        {steps.map((s, i) => (
          <div key={i}>
            <div className="mb-5 flex items-center gap-3.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center bg-brand font-display text-[15px] font-black">
                {i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center border border-hairline text-ink">
                <Icon name={s.icon || 'star'} size={22} />
              </span>
            </div>
            <h3
              className="font-display text-[19px] font-extrabold uppercase leading-tight"
              {...edText(bid, `steps.${i}.title`)}
            >
              {s.title}
            </h3>
            <p
              className="mt-2.5 text-[15px] leading-relaxed text-body"
              {...edText(bid, `steps.${i}.body`)}
            >
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function IconFeaturesBlock({ p, bid }: BlockComponentProps) {
  const items: P[] = p.items ?? [];
  const size = (p.size as string) ?? 'compact';
  const large = size === 'large';
  const standard = size === 'standard' || large;
  const onDark = p.background === 'ink';

  const minWidth = large ? 340 : standard ? 280 : 230;

  return (
    <Section
      background={(p.background as Bg) ?? 'white'}
      className={standard ? undefined : '!py-12'}
    >
      <SectionHeading
        eyebrow={p.eyebrow}
        heading={p.heading}
        body={p.body}
        align={p.align ?? (standard ? 'center' : 'left')}
        onDark={onDark}
        bid={bid}
      />
      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}
      >
        {items.map((f, i) => (
          <div
            key={i}
            className={cn(
              'border',
              onDark ? 'border-white/12 bg-white/[.04]' : 'border-hairline bg-surface',
              large ? 'px-8 py-9' : standard ? 'px-7 py-8' : 'px-6 py-7'
            )}
          >
            <span
              className={cn(
                'mb-4 flex items-center justify-center bg-brand text-ink',
                large ? 'h-[56px] w-[56px]' : 'h-[46px] w-[46px]'
              )}
            >
              <Icon name={f.icon || 'star'} size={large ? 26 : 22} />
            </span>
            <h3
              className={cn(
                'font-display font-extrabold uppercase leading-tight',
                large ? 'text-[20px]' : standard ? 'text-[18px]' : 'text-[16px]',
                onDark && 'text-white'
              )}
              {...edText(bid, `items.${i}.title`)}
            >
              {f.title}
            </h3>
            <p
              className={cn(
                'mt-2.5 leading-relaxed',
                large ? 'text-[15px]' : 'text-[14px]',
                onDark ? 'text-ondark-2' : 'text-body'
              )}
              {...edText(bid, `items.${i}.body`)}
            >
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function CtaBandBlock({ p, bid }: BlockComponentProps) {
  const primary = p.primary?.[0];
  const secondary = p.secondary?.[0];
  return (
    <section data-reveal-root className="relative overflow-hidden bg-ink">
      <div className="absolute inset-0" {...edImage(bid, 'image')}>
        {p.image ? (
          <Image
            src={p.image}
            alt=""
            fill
            sizes="100vw"
            data-parallax="0.22"
            className="h-full w-full object-cover opacity-[.14]"
            style={{ transform: 'scale(1.14)' }}
          />
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, #101114 30%, rgba(16,17,20,.55) 100%)',
        }}
      />
      <div className="gutter relative py-[96px] text-center">
        <h2 className="h-section mx-auto max-w-[820px] text-white" {...edText(bid, 'heading')}>
          {p.heading}
        </h2>
        {p.body && (
          <p
            className="mx-auto mt-5 max-w-[620px] text-[18px] leading-relaxed text-ondark-2"
            {...edText(bid, 'body')}
          >
            {p.body}
          </p>
        )}
        <div className="mt-9 flex flex-wrap justify-center gap-3.5">
          {primary?.label && (
            <CtaLink href={primary.href} className="btn btn-yellow btn-lg" bid={bid} path="primary.0.label">
              {primary.label}
            </CtaLink>
          )}
          {secondary?.label && (
            <CtaLink
              href={secondary.href}
              className="btn btn-ghost-light btn-lg"
              bid={bid}
              path="secondary.0.label"
            >
              {secondary.label}
            </CtaLink>
          )}
        </div>
      </div>
    </section>
  );
}

export function QuoteCalloutBlock({ p, bid }: BlockComponentProps) {
  return (
    <Section className="!py-12">
      <div className="flex flex-wrap items-center gap-6 bg-brand px-6 py-5 md:px-8">
        {p.big && (
          <span className="font-display text-[30px] font-black leading-none" {...edText(bid, 'big')}>
            {p.big}
          </span>
        )}
        <div className="flex-1 min-w-[220px]">
          <div
            className="font-display text-[14px] font-extrabold uppercase tracking-[.04em]"
            {...edText(bid, 'heading')}
          >
            {p.heading}
          </div>
          {p.body && (
            <p className="mt-1.5 text-[14px] leading-snug text-brand-on" {...edText(bid, 'body')}>
              {p.body}
            </p>
          )}
        </div>
        <QuoteButton subject={p.subject || 'Custom team kit'} className="btn btn-ink btn-md">
          <span {...edText(bid, 'ctaLabel')}>{p.ctaLabel || 'Request a quote'}</span>
        </QuoteButton>
      </div>
    </Section>
  );
}

// -------------------------------------------------------------------- content

export function RichTextBlock({ p, bid }: BlockComponentProps) {
  const narrow = p.width !== 'full';
  const onDark = p.background === 'ink';
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <div
        className={cn(
          narrow && 'mx-auto max-w-[820px]',
          p.align === 'center' && 'text-center'
        )}
      >
        <Eyebrow onDark={onDark} bid={bid} path="eyebrow">
          {p.eyebrow}
        </Eyebrow>
        {p.heading && (
          <h2 className="h-section mb-6" {...edText(bid, 'heading')}>
            {p.heading}
          </h2>
        )}
        <RichText
          text={p.body}
          bid={bid}
          path="body"
          className={cn('text-[17px] leading-[1.65]', onDark ? 'text-ondark-2' : 'text-body')}
        />
      </div>
    </Section>
  );
}

export function ImageTextBlock({ p, bid }: BlockComponentProps) {
  const onDark = p.background === 'ink';
  const cta = p.cta?.[0];
  const media = (
    <div className="zoom-wrap relative min-h-[380px] bg-plate" {...edImage(bid, 'image')}>
      {p.image ? (
        <Image src={p.image} alt="" fill sizes="(max-width: 900px) 100vw, 50vw" className="object-cover" />
      ) : (
        <ImagePlaceholder />
      )}
    </div>
  );
  const copy = (
    <div className="flex flex-col justify-center">
      <Eyebrow onDark={onDark} bid={bid} path="eyebrow">
        {p.eyebrow}
      </Eyebrow>
      {p.heading && (
        <h2 className="h-section mb-5" {...edText(bid, 'heading')}>
          {p.heading}
        </h2>
      )}
      <RichText
        text={p.body}
        bid={bid}
        path="body"
        className={cn('text-[17px] leading-[1.65]', onDark ? 'text-ondark-2' : 'text-body')}
      />
      {(p.bullets ?? []).length > 0 && (
        <ul className="mt-6 space-y-2.5">
          {(p.bullets as string[]).map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] font-medium">
              <span aria-hidden="true" className="text-success">
                ✓
              </span>
              <span {...edText(bid, `bullets.${i}`)}>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {cta?.label && (
        <div className="mt-8">
          <CtaLink href={cta.href} className="btn btn-ink btn-lg" bid={bid} path="cta.0.label">
            {cta.label}
          </CtaLink>
        </div>
      )}
    </div>
  );

  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <div className="grid items-stretch gap-10 lg:grid-cols-2">
        {p.side === 'right' ? (
          <>
            {copy}
            {media}
          </>
        ) : (
          <>
            {media}
            {copy}
          </>
        )}
      </div>
    </Section>
  );
}

export function GalleryBlock({ p, bid }: BlockComponentProps) {
  const images: P[] = p.images ?? [];
  if (!images.length) return null;
  return (
    <Section background={(p.background as Bg) ?? 'white'} className="!py-14">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow bid={bid} path="eyebrow">
            {p.eyebrow}
          </Eyebrow>
          {p.heading && (
            <h2
              className="font-display text-[24px] font-extrabold uppercase"
              {...edText(bid, 'heading')}
            >
              {p.heading}
            </h2>
          )}
        </div>
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {images.map((im, i) => (
          <div
            key={i}
            className="zoom-wrap relative bg-plate"
            style={{ height: Number(p.height) || 260 }}
            {...edImage(bid, `images.${i}.image`)}
          >
            {im.image ? (
              <Image
                src={im.image}
                alt={im.alt || ''}
                fill
                sizes="(max-width: 900px) 50vw, 25vw"
                className="zoom-img object-cover"
              />
            ) : (
              <ImagePlaceholder />
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function TeamGridBlock({ p, bid }: BlockComponentProps) {
  const people: P[] = p.people ?? [];
  if (!people.length) return null;
  return (
    <Section background={(p.background as Bg) ?? 'white'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} bid={bid} />
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {people.map((m, i) => (
          <div key={i} className="border border-hairline">
            <div className="zoom-wrap relative h-[300px] bg-plate" {...edImage(bid, `people.${i}.image`)}>
              {m.image ? (
                <Image
                  src={m.image}
                  alt={m.name}
                  fill
                  sizes="(max-width: 900px) 50vw, 25vw"
                  className="zoom-img object-cover"
                />
              ) : (
                <ImagePlaceholder label="Portrait" />
              )}
            </div>
            <div className="p-6">
              <h3
                className="font-display text-[17px] font-extrabold uppercase"
                {...edText(bid, `people.${i}.name`)}
              >
                {m.name}
              </h3>
              <p
                className="mt-1 text-[13px] font-semibold uppercase tracking-[.1em] text-brand-text"
                {...edText(bid, `people.${i}.role`)}
              >
                {m.role}
              </p>
              {m.bio && (
                <p
                  className="mt-3 text-[14px] leading-relaxed text-body"
                  {...edText(bid, `people.${i}.bio`)}
                >
                  {m.bio}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function TimelineBlock({ p, bid }: BlockComponentProps) {
  const items: P[] = p.items ?? [];
  if (!items.length) return null;
  return (
    <Section background={(p.background as Bg) ?? 'surface'}>
      <SectionHeading eyebrow={p.eyebrow} heading={p.heading} bid={bid} />
      <ol className="border-t-2 border-ink">
        {items.map((it, i) => (
          <li
            key={i}
            className="grid gap-4 border-b border-hairline-2 bg-white px-6 py-7 md:grid-cols-[160px_1fr]"
          >
            <span
              className="font-display text-[28px] font-black leading-none"
              {...edText(bid, `items.${i}.year`)}
            >
              {it.year}
            </span>
            <div>
              <h3
                className="font-display text-[17px] font-extrabold uppercase"
                {...edText(bid, `items.${i}.title`)}
              >
                {it.title}
              </h3>
              <p
                className="mt-2 max-w-[760px] text-[15px] leading-relaxed text-body"
                {...edText(bid, `items.${i}.body`)}
              >
                {it.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function MapEmbedBlock({ p, bid }: BlockComponentProps) {
  if (!p.src) return null;
  return (
    <Section background={(p.background as Bg) ?? 'white'} className="!py-14">
      {p.heading && (
        <h2 className="h-section mb-7" {...edText(bid, 'heading')}>
          {p.heading}
        </h2>
      )}
      <div className="border border-hairline">
        <iframe
          src={p.src}
          title={p.heading || 'Map'}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
          style={{ height: Number(p.height) || 420, border: 0 }}
        />
      </div>
    </Section>
  );
}

export function SpacerBlock({ p }: BlockComponentProps) {
  return (
    <div className={BG_CLASS[(p.background as Bg) ?? 'white']}>
      <div className="gutter" style={{ paddingTop: Number(p.height) || 0 }}>
        {p.rule && <hr className="border-0 border-t border-hairline" />}
      </div>
      <div style={{ height: Number(p.height) || 0 }} />
    </div>
  );
}

export function HtmlBlock({ p }: BlockComponentProps) {
  return (
    <Section background={(p.background as Bg) ?? 'white'} className="!py-10">
      <div dangerouslySetInnerHTML={{ __html: String(p.html ?? '') }} />
    </Section>
  );
}

// -------------------------------------------------------------------- helpers

/** Renders as a quote-opening button for "#quote", otherwise a link. */
export function CtaLink({
  href,
  className,
  children,
  bid,
  path,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
  bid?: string;
  path?: string;
}) {
  const label = path ? <span {...edText(bid, path)}>{children}</span> : children;

  if (!href || href === '#quote') {
    return (
      <QuoteButton className={className} subject="Custom team kit">
        {label}
      </QuoteButton>
    );
  }
  if (/^(https?:|mailto:|tel:)/.test(href)) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
