'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/site/Icon';
import { isEmail } from '@/lib/utils';
import { attributionField } from '@/lib/attribution';

/**
 * The quote form, laid out on the page rather than in a drawer.
 *
 * Built for paid traffic, where every field costs leads: five boxes, all of
 * them ones a coach can fill without looking anything up, and a logo that is
 * optional. It posts to the same /api/quote as the drawer, so a lead from a
 * landing page lands in the same Quote requests list, with the same email to
 * the shop — plus the ad it came from (see lib/attribution.ts) and a
 * `source` naming the page.
 */
export type LeadFormProps = {
  /** "Custom baseball jerseys" — the subject line the shop sees. */
  subject: string;
  /** Preset, so the form does not ask what the page already knows. */
  sport: string;
  /** "landing:custom-baseball-jerseys" — which page sent it. */
  source: string;
  ctaLabel?: string;
  reassurance?: string;
  successTitle?: string;
  successBody?: string;
  phone?: string;
  phoneHref?: string;
  /** Distinct per form on the page, so ids and labels stay unique. */
  idPrefix: string;
  /** Dark card or light card. */
  tone?: 'light' | 'dark';
};

type Errors = Partial<Record<'name' | 'team' | 'email' | 'phone' | 'rosterSize' | 'file', string>>;

const MAX_FILE_MB = 25;

export function LeadForm({
  subject,
  sport,
  source,
  ctaLabel = 'Get my free mockup',
  reassurance = 'No deposit. No obligation. We reply within 24 hours.',
  successTitle = 'Got it — your mockup is on the way',
  successBody = 'Our art team is on it. Expect your free design and an exact price by email within 24 hours.',
  phone,
  phoneHref,
  idPrefix,
  tone = 'light',
}: LeadFormProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const message = useRef<HTMLTextAreaElement>(null);
  // On a phone the optional boxes wait behind a button, so the four that
  // matter and the submit button fit on one screen.
  const [more, setMore] = useState(false);
  const [design, setDesign] = useState('');
  const id = (n: string) => `${idPrefix}-${n}`;

  // "Use this design" on a design card (data-design) writes the design into
  // the form it scrolls to — one less thing to type, and the shop knows
  // which one they meant.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-design]') as HTMLElement | null;
      const name = el?.getAttribute('data-design');
      if (!name) return;
      setDesign(name);
      setMore(true);
      const box = message.current;
      if (box && !box.value.includes(name)) {
        box.value = `I like ${name}.${box.value ? ' ' + box.value : ''}`;
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function pickFile(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((e) => ({ ...e, file: `That file is over ${MAX_FILE_MB}MB.` }));
      return;
    }
    if (!/\.(png|jpe?g|webp|pdf|ai)$/i.test(f.name)) {
      setErrors((e) => ({ ...e, file: 'Use a PNG, JPG, PDF or AI file.' }));
      return;
    }
    setErrors((e) => ({ ...e, file: undefined }));
    setFile(f);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError('');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const errs: Errors = {};
    if (!get('name')) errs.name = 'Please add your name.';
    if (!get('team')) errs.team = 'Please add your team name.';
    if (!get('email')) errs.email = 'Please add your email.';
    else if (!isEmail(get('email'))) errs.email = 'Check the email address.';
    if (!get('phone')) errs.phone = 'Please add a phone number.';
    else if (get('phone').replace(/\D/g, '').length < 7) errs.phone = 'That number looks short.';
    const roster = get('rosterSize');
    if (roster && (!/^\d+$/.test(roster) || Number(roster) < 1)) {
      errs.rosterSize = 'Use a whole number, like 14.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      (form.querySelector(`[name="${Object.keys(errs)[0]}"]`) as HTMLElement | null)?.focus();
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set('subject', subject);
      body.set('name', get('name'));
      body.set('team', get('team'));
      body.set('email', get('email'));
      body.set('phone', get('phone'));
      body.set('sport', sport);
      body.set('rosterSize', roster);
      body.set('message', get('message'));
      body.set('company', get('company')); // honeypot
      body.set('pageUrl', window.location.href);
      body.set('referrer', document.referrer || '');
      body.set('source', source);
      body.set('utm', attributionField());
      body.set('context', JSON.stringify({ sport, ...(design ? { productTitle: design } : {}) }));
      if (file) body.append('files', file);

      const res = await fetch('/api/quote', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Something went wrong. Please try again.');

      // The conversion, for GTM / GA4 / Google Ads. `quote_request` is the
      // event the rest of the site already sends; `generate_lead` is the
      // name GA4 recommends, so either can be wired up as the goal.
      type WithDL = Window & { dataLayer?: unknown[] };
      const dl = ((window as WithDL).dataLayer ??= []);
      dl.push({ event: 'quote_request', quote_subject: subject, lead_source: source });
      dl.push({ event: 'generate_lead', lead_source: source, sport });

      setSent(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const dark = tone === 'dark';

  if (sent) {
    return (
      <div className="py-6 text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-ink">
          <Icon name="check" size={30} strokeWidth={2.4} />
        </div>
        <h3 className={`h-display mb-3 text-[24px] ${dark ? 'text-white' : ''}`}>{successTitle}</h3>
        <p className={`mx-auto max-w-[380px] text-[15px] leading-relaxed ${dark ? 'text-white/80' : 'text-body'}`}>
          {successBody}
        </p>
        {phone && phoneHref && (
          <p className={`mt-5 text-[14px] ${dark ? 'text-white/80' : 'text-body'}`}>
            In a hurry? Call{' '}
            <a href={phoneHref} className="font-semibold underline underline-offset-2">
              {phone}
            </a>
          </p>
        )}
      </div>
    );
  }

  const label = `field-label ${dark ? '!text-white/85' : ''}`;

  return (
    <form onSubmit={submit} noValidate>
      {/* Bots fill every box; people never see this one. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id('company')}>Company</label>
        <input id={id('company')} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input id={id('name')} name="name" label="Your name" autoComplete="name" placeholder="Coach Smith" error={errors.name} labelClass={label} />
        <Input id={id('team')} name="team" label="Team name" autoComplete="organization" placeholder="Springfield Thunder 14U" error={errors.team} labelClass={label} />
        <Input id={id('email')} name="email" label="Email" type="email" autoComplete="email" inputMode="email" placeholder="coach@team.com" error={errors.email} labelClass={label} />
        <Input id={id('phone')} name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(959) 000-0000" error={errors.phone} labelClass={label} />
        {design && (
          <p className="flex items-center gap-2 border border-brand-border bg-brand-tint px-3 py-2.5 text-[13px] font-semibold text-ink sm:col-span-2">
            <Icon name="check" size={14} strokeWidth={3} />
            <span className="truncate">Design: {design}</span>
          </p>
        )}

        {!more && (
          <button
            type="button"
            onClick={() => setMore(true)}
            className={`flex items-center gap-1.5 text-left text-[13px] font-semibold underline underline-offset-2 sm:hidden ${dark ? 'text-white/85' : 'text-ink'}`}
          >
            <Icon name="plus" size={14} />
            Add jersey count, logo or colors (optional)
          </button>
        )}

        <div className={`${more ? 'contents' : 'hidden sm:contents'}`}>
        <Input id={id('rosterSize')} name="rosterSize" label="How many jerseys? (optional)" type="number" inputMode="numeric" placeholder="e.g. 14" error={errors.rosterSize} labelClass={label} />

        <div>
          <span className={label}>Your logo (optional)</span>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`field flex w-full items-center gap-2 text-left ${file ? 'text-ink' : 'text-muted'}`}
          >
            <Icon name="upload" size={16} />
            <span className="truncate">{file ? file.name : 'Add a logo or photo'}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.ai"
            className="hidden"
            onChange={(e) => pickFile(e.target.files)}
          />
          {errors.file && <p className="field-error">{errors.file}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor={id('message')}>
            Colors or ideas (optional)
          </label>
          <textarea
            id={id('message')}
            name="message"
            rows={2}
            placeholder="Navy and gold, number on the front…"
            className="field resize-y"
            ref={message}
          />
        </div>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="field-error mt-4 text-center">
          {serverError}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-yellow mt-5 w-full py-[18px] text-[15px]">
        {busy ? 'Sending…' : ctaLabel}
      </button>
      <p className={`mt-3 flex items-center justify-center gap-2 text-center text-[13px] font-medium ${dark ? 'text-white/75' : 'text-muted'}`}>
        <Icon name="check" size={14} />
        {reassurance}
      </p>
    </form>
  );
}

function Input({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  error,
  autoComplete,
  inputMode,
  labelClass,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  labelClass: string;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="field no-spin"
      />
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
