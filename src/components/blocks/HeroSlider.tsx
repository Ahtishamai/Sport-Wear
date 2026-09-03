'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type HeroSlide = {
  image?: string;
  /** Where an image swap is written: `image` for the block's own photo, or
   *  `slides.0.image` for an extra one. */
  path: string;
};

/**
 * The hero, with or without a slider.
 *
 * Only the photograph changes. The badge, headline and sub-headline are the
 * block's own and stay put across every slide, so there is one place to edit
 * the words rather than a copy per photo.
 *
 * One photo renders exactly as the hero always did — no controls, no timer.
 */
export function HeroSlider({
  slides,
  bid,
  badge,
  heading,
  body,
  height,
  seconds,
  parallax,
  priority,
  children,
}: {
  slides: HeroSlide[];
  bid?: string;
  badge?: string;
  heading?: string;
  body?: string;
  height: number;
  seconds: number;
  parallax: boolean;
  priority?: boolean;
  children: React.ReactNode;
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const ms = Math.max(2, seconds) * 1000;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => window.clearInterval(t);
  }, [count, seconds, paused]);

  // Respect a visitor who has asked for less motion: show the first slide and
  // leave the controls for them to move it themselves.
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPaused(q.matches);
    apply();
    q.addEventListener('change', apply);
    return () => q.removeEventListener('change', apply);
  }, []);

  // The words never move, so they always edit the block's own fields.
  const edit = (field: string) =>
    bid ? { 'data-edit': `block:${bid}:${field}`, 'data-edit-kind': 'text' } : {};

  return (
    <section
      className="hero-band relative flex items-center overflow-hidden bg-ink py-16 md:py-0"
      style={{ ['--hero-height' as string]: `${height}px` }}
      data-hero
      data-reveal-root
      onMouseEnter={() => count > 1 && setPaused(true)}
      onMouseLeave={() => count > 1 && setPaused(false)}
    >
      {/* Every slide stays mounted and crossfades, so switching never shows a
          blank frame while the next photo loads. */}
      {slides.map((s, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            i === index ? 'opacity-100' : 'opacity-0'
          )}
          {...(bid && i === index
            ? { 'data-edit': `block:${bid}:${s.path}`, 'data-edit-kind': 'image' }
            : {})}
        >
          {s.image ? (
            <Image
              src={s.image}
              alt=""
              fill
              priority={priority && i === 0}
              sizes="100vw"
              data-parallax={parallax ? '0.18' : undefined}
              className="h-full w-full object-cover"
              style={{ transform: 'scale(1.14)' }}
            />
          ) : null}
        </div>
      ))}

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

      <div className="gutter relative w-full" style={{ textShadow: '0 2px 18px rgba(16,17,20,.65)' }}>
        {badge && (
          <span
            className="mb-5 inline-block bg-brand px-3 py-2 text-[10px] font-bold uppercase leading-snug tracking-[.12em] text-ink md:mb-6 md:px-[15px] md:py-[9px] md:text-[12px] md:tracking-[.16em]"
            {...edit('badge')}
          >
            {badge}
          </span>
        )}

        <h1
          className="h-display max-w-[900px] text-white"
          style={{ fontSize: 'clamp(30px,7vw,70px)' }}
          {...edit('heading')}
        >
          {heading}
        </h1>

        {body && (
          <p
            className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-ondark md:mt-6 md:text-[19px]"
            {...edit('body')}
          >
            {body}
          </p>
        )}

        {children}

        {count > 1 && (
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-white transition-colors hover:border-brand hover:bg-brand hover:text-ink"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-white transition-colors hover:border-brand hover:bg-brand hover:text-ink"
            >
              ›
            </button>

            <span className="ml-1 flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === index ? 'w-7 bg-brand' : 'w-2 bg-white/45 hover:bg-white/70'
                  )}
                />
              ))}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
