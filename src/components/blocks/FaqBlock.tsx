'use client';

import { useState } from 'react';
import { useQuote } from '@/components/site/QuoteProvider';
import { Eyebrow } from './primitives';
import { cn } from '@/lib/utils';
import type { Bg } from './primitives';
import { BG_CLASS } from './primitives';

export type FaqItem = { id: string; question: string; answer: string };

export function FaqBlock({
  p,
  faqs,
}: {
  p: Record<string, any>;
  faqs: FaqItem[];
}) {
  const [open, setOpen] = useState(faqs[0]?.id ?? '');
  const { open: openQuote } = useQuote();

  if (!faqs.length) return null;

  return (
    <section
      data-reveal-root
      className={cn(BG_CLASS[(p.background as Bg) ?? 'surface'], 'gutter py-[76px] md:py-[88px]')}
    >
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-10 text-center">
          <Eyebrow>{p.eyebrow}</Eyebrow>
          {p.heading && <h2 className="h-section">{p.heading}</h2>}
        </div>

        <div className="border-t-2 border-ink">
          {faqs.map((f) => {
            const isOpen = open === f.id;
            return (
              <div key={f.id} className="border-b border-hairline-2 bg-white">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? '' : f.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-${f.id}`}
                    className="flex w-full items-center justify-between gap-4 p-[22px] text-left"
                  >
                    <span className="font-display text-[16px] font-extrabold uppercase tracking-[.04em]">
                      {f.question}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-[22px] leading-none text-brand-text">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                </h3>
                <div id={`faq-${f.id}`} hidden={!isOpen}>
                  <p className="max-w-[760px] px-[22px] pb-6 text-[15px] leading-[1.65] text-body">
                    {f.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {p.footerText && (
          <p className="mt-8 text-center text-[15px] font-medium text-body">
            {p.footerText}{' '}
            <button
              type="button"
              onClick={() => openQuote('Question from the FAQ')}
              className="font-semibold text-ink underline decoration-brand decoration-2 underline-offset-4"
            >
              {p.footerCta || 'Ask our team →'}
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
