'use client';

import { useState } from 'react';
import { cn, isEmail } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { useQuote } from '@/components/site/QuoteProvider';
import { BG_CLASS, Eyebrow, type Bg } from './primitives';

type Details = {
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
};

export function ContactFormBlock({
  p,
  details,
}: {
  p: Record<string, any>;
  details: Details;
}) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const { open: openQuote } = useQuote();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError('');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const errs: Record<string, string> = {};
    if (!get('name')) errs.name = 'Your name is required.';
    if (!get('email')) errs.email = 'An email is required.';
    else if (!isEmail(get('email'))) errs.email = 'Check the email format.';
    if (get('message').length < 10) errs.message = 'Tell us a little more (10 characters minimum).';
    setErrors(errs);
    if (Object.keys(errs).length) {
      (form.querySelector(`[name="${Object.keys(errs)[0]}"]`) as HTMLElement | null)?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: get('name'),
          email: get('email'),
          phone: get('phone'),
          subject: get('subject'),
          message: get('message'),
          pageUrl: window.location.href,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Something went wrong. Please try again.');
      type WindowWithDL = Window & { dataLayer?: unknown[] };
      (window as WindowWithDL).dataLayer?.push({ event: 'contact_submit' });
      setSent(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-reveal-root
      className={cn(BG_CLASS[(p.background as Bg) ?? 'white'], 'gutter py-[76px] md:py-[88px]')}
    >
      <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <Eyebrow>{p.eyebrow}</Eyebrow>
          {p.heading && <h2 className="h-section">{p.heading}</h2>}
          {p.body && <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-body">{p.body}</p>}

          <ul className="mt-9 space-y-5">
            <ContactRow icon="phone" label="Call the shop">
              <a href={details.phoneHref} className="text-[17px] font-semibold text-ink">
                {details.phone}
              </a>
            </ContactRow>
            <ContactRow icon="mail" label="Email">
              <a href={`mailto:${details.email}`} className="text-[17px] font-semibold text-ink">
                {details.email}
              </a>
            </ContactRow>
            <ContactRow icon="pin" label="Visit">
              <span className="text-[16px] leading-relaxed text-body">{details.address}</span>
            </ContactRow>
          </ul>

          {(p.hours ?? []).length > 0 && (
            <div className="mt-9 border border-hairline bg-surface p-6">
              <h3 className="font-display text-[14px] font-extrabold uppercase tracking-[.1em]">
                Opening hours
              </h3>
              <dl className="mt-4 space-y-2">
                {(p.hours as { days: string; time: string }[]).map((h, i) => (
                  <div key={i} className="flex justify-between gap-4 text-[14px]">
                    <dt className="text-body">{h.days}</dt>
                    <dd className="font-semibold text-ink">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {p.showQuoteCta !== false && (
            <div className="mt-5 border border-brand-border bg-brand-tint p-6">
              <h3 className="font-display text-[15px] font-extrabold uppercase tracking-[.04em]">
                Need a price, not an answer?
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-brand-deep">
                Send your roster and artwork instead — we reply with a free mockup and a firm
                per-unit price within 24 hours.
              </p>
              <button
                type="button"
                onClick={() => openQuote('Contact page enquiry')}
                className="btn btn-ink btn-md mt-4"
              >
                Request a quote
              </button>
            </div>
          )}
        </div>

        <div className="border border-hairline bg-white p-7 md:p-9">
          {sent ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand">
                <Icon name="check" size={30} strokeWidth={2.4} />
              </div>
              <h3 className="h-display text-[26px]">{p.successTitle || 'Message sent'}</h3>
              <p className="mt-3 max-w-[380px] text-[15px] leading-relaxed text-body">
                {p.successBody}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid grid-cols-2 gap-3.5">
              <TextField name="name" label="Your name *" error={errors.name} />
              <TextField name="email" label="Email *" type="email" error={errors.email} />
              <TextField name="phone" label="Phone" type="tel" />
              <TextField name="subject" label="Subject" placeholder="Sizing, artwork, timelines…" />
              <div className="col-span-2">
                <label className="field-label" htmlFor="c-message">
                  Message *
                </label>
                <textarea
                  id="c-message"
                  name="message"
                  rows={7}
                  className="field resize-y"
                  aria-invalid={errors.message ? 'true' : undefined}
                  placeholder="Tell us what you need."
                />
                {errors.message && <p className="field-error">{errors.message}</p>}
              </div>
              {serverError && (
                <p role="alert" className="field-error col-span-2 text-center">
                  {serverError}
                </p>
              )}
              <div className="col-span-2">
                <button type="submit" disabled={busy} className="btn btn-yellow w-full py-5 text-[15px]">
                  {busy ? 'Sending…' : 'Send message'}
                </button>
                <p className="mt-3 text-center text-[13px] text-muted">
                  We reply within one business day.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-ink">
        <Icon name={icon} size={20} />
      </span>
      <span>
        <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-muted">
          {label}
        </span>
        <span className="mt-1 block">{children}</span>
      </span>
    </li>
  );
}

function TextField({
  name,
  label,
  type = 'text',
  placeholder,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  const id = `c-${name}`;
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        className="field"
        aria-invalid={error ? 'true' : undefined}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
