'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scroll-reveal, parallax, scroll-progress bar and count-up numbers.
 * One passive scroll listener, rAF-throttled — as specified in the handoff.
 */
export function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------------------------------------------------------- reveal
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.classList.add('rv-in');
                io?.unobserve(e.target);
              });
            },
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
          )
        : null;

    const observeReveals = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal-root]').forEach((sec) => {
        const kids = Array.from(sec.children).filter(
          (n): n is HTMLElement => n.nodeType === 1
        );
        const targets = kids.length > 1 ? kids : [sec];
        targets.forEach((t, i) => {
          if (t.hasAttribute('data-rv')) return;
          t.setAttribute('data-rv', '');
          t.style.transitionDelay = `${Math.min(i * 70, 350)}ms`;
          if (reduced) {
            t.classList.add('rv-in');
            return;
          }
          if (t.getBoundingClientRect().top < window.innerHeight * 0.92) {
            t.classList.add('rv-in');
          } else {
            io?.observe(t);
          }
        });
      });
    };

    const raf1 = requestAnimationFrame(observeReveals);

    // ---------------------------------------------------------- count-up
    const co =
      typeof IntersectionObserver !== 'undefined' && !reduced
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (!e.isIntersecting) return;
                const el = e.target as HTMLElement;
                co?.unobserve(el);
                const target = Number(el.dataset.count) || 0;
                const suffix = el.dataset.suffix || '';
                const t0 = performance.now();
                const dur = 1200;
                const tick = (t: number) => {
                  const k = Math.min(1, (t - t0) / dur);
                  const eased = 1 - Math.pow(1 - k, 3);
                  el.textContent = Math.round(target * eased).toLocaleString() + suffix;
                  if (k < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
              });
            },
            { threshold: 0.6 }
          )
        : null;

    document
      .querySelectorAll<HTMLElement>('[data-count]:not([data-counted])')
      .forEach((el) => {
        el.dataset.counted = '';
        co?.observe(el);
      });

    // ---------------------------------------------------------- scroll fx
    let rafId: number | null = null;
    const apply = () => {
      rafId = null;
      const bar = document.getElementById('scroll-progress-fill');
      if (bar) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`;
      }
      if (reduced) return;
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.25;
        const parent = el.parentElement;
        if (!parent) return;
        const r = parent.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
        const mid = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = `translate3d(0,${(-mid * speed).toFixed(1)}px,0) scale(1.14)`;
      });
    };

    const onScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    apply();

    // Late-mounting content (images resizing, client blocks) — re-scan once.
    const raf2 = window.setTimeout(observeReveals, 400);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      cancelAnimationFrame(raf1);
      clearTimeout(raf2);
      io?.disconnect();
      co?.disconnect();
    };
  }, [pathname]);

  return null;
}

export function ScrollProgress() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] bg-transparent"
    >
      <div
        id="scroll-progress-fill"
        className="h-full origin-left bg-brand"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
