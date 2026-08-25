'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Icon } from './Icon';
import { isEmail } from '@/lib/utils';

export type QuoteContextPayload = {
  productId?: string;
  productTitle?: string;
  colorway?: string;
  sizeRun?: Record<string, number>;
  totalUnits?: number;
  unitPrice?: number;
  estTotal?: number;
  sport?: string;
};

type QuoteSettings = {
  quoteHeadline: string;
  quoteEyebrow: string;
  quoteReassurance: string;
  quoteSuccessTitle: string;
  quoteSuccessBody: string;
  deadlineOptions: string[];
  sportOptions: string[];
};

type Ctx = {
  open: (subject?: string, payload?: QuoteContextPayload) => void;
  close: () => void;
  isOpen: boolean;
};

const QuoteCtx = createContext<Ctx | null>(null);

export function useQuote() {
  const ctx = useContext(QuoteCtx);
  if (!ctx) throw new Error('useQuote must be used inside <QuoteProvider>');
  return ctx;
}

const MAX_FILE_MB = 25;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/postscript'];

export function QuoteProvider({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: QuoteSettings;
}) {
  const [state, setState] = useState<'closed' | 'form' | 'sent'>('closed');
  const [subject, setSubject] = useState('Custom team kit');
  const [payload, setPayload] = useState<QuoteContextPayload>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((s?: string, p?: QuoteContextPayload) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setSubject(s || 'Custom team kit');
    setPayload(p || {});
    setState('form');
  }, []);

  const close = useCallback(() => {
    setState('closed');
    lastFocus.current?.focus?.();
  }, []);

  // Any element with href="#quote" or data-quote opens the drawer.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(
        'a[href="#quote"], [data-quote]'
      ) as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      open(el.getAttribute('data-quote-subject') || undefined);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  useEffect(() => {
    if (state === 'closed') {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [state, close]);

  const value = useMemo<Ctx>(
    () => ({ open, close, isOpen: state !== 'closed' }),
    [open, close, state]
  );

  return (
    <QuoteCtx.Provider value={value}>
      {children}
      {state !== 'closed' && (
        <Drawer
          ref={panelRef}
          state={state}
          subject={subject}
          payload={payload}
          settings={settings}
          onClose={close}
          onSent={() => setState('sent')}
        />
      )}
    </QuoteCtx.Provider>
  );
}

type Errors = Partial<Record<string, string>>;

function Drawer({
  ref,
  state,
  subject,
  payload,
  settings,
  onClose,
  onSent,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  state: 'form' | 'sent';
  subject: string;
  payload: QuoteContextPayload;
  settings: QuoteSettings;
  onClose: () => void;
  onSent: () => void;
}) {
  const [deadline, setDeadline] = useState(settings.deadlineOptions[0] ?? '3–4 weeks');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        errs.push(`${f.name} is over ${MAX_FILE_MB}MB`);
        continue;
      }
      const okType = ALLOWED.includes(f.type) || /\.(ai|pdf|png|jpe?g|webp)$/i.test(f.name);
      if (!okType) {
        errs.push(`${f.name} is not a supported file type`);
        continue;
      }
      next.push(f);
    }
    setErrors((e) => ({ ...e, files: errs.join(', ') || undefined }));
    setFiles((prev) => [...prev, ...next].slice(0, 8));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError('');
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();

    const errs: Errors = {};
    if (!get('team')) errs.team = 'Tell us the team or organization name.';
    if (!get('name')) errs.name = 'Your name is required.';
    if (!get('phone')) errs.phone = 'A phone number is required.';
    else if (get('phone').replace(/\D/g, '').length < 7) errs.phone = 'That phone number looks short.';
    if (!get('email')) errs.email = 'An email is required.';
    else if (!isEmail(get('email'))) errs.email = 'Check the email format.';
    const roster = get('rosterSize');
    if (roster && (!/^\d+$/.test(roster) || Number(roster) < 1)) {
      errs.rosterSize = 'Roster size must be a whole number of 1 or more.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      (e.currentTarget.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus();
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set('subject', subject);
      body.set('team', get('team'));
      body.set('name', get('name'));
      body.set('phone', get('phone'));
      body.set('email', get('email'));
      body.set('sport', get('sport') || payload.sport || '');
      body.set('rosterSize', roster);
      body.set('deadline', deadline);
      body.set('message', get('message'));
      body.set('pageUrl', window.location.href);
      body.set('referrer', document.referrer || '');
      body.set('context', JSON.stringify(payload));
      files.forEach((f) => body.append('files', f));

      const res = await fetch('/api/quote', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Something went wrong. Please try again.');

      // GA4 / GTM conversion event
      type WindowWithDL = Window & { dataLayer?: unknown[] };
      (window as WindowWithDL).dataLayer?.push({
        event: 'quote_request',
        quote_subject: subject,
        value: payload.estTotal ?? undefined,
      });

      onSent();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={settings.quoteHeadline}
    >
      <button
        type="button"
        aria-label="Close quote panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(16,17,20,.45)] backdrop-blur-[3px]"
      />
      <div
        ref={ref}
        className="animate-slide-in relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-hairline bg-white"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-hairline bg-white px-[30px] py-[22px]">
          <div>
            <div className="eyebrow mb-2 text-[11px] tracking-[.16em] text-brand-text">
              {settings.quoteEyebrow}
            </div>
            <h2 className="h-display text-[26px]">{settings.quoteHeadline}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 p-2 text-muted transition-colors hover:text-ink"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {state === 'sent' ? (
          <div className="flex flex-1 flex-col items-center justify-center px-[30px] py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand">
              <Icon name="check" size={30} strokeWidth={2.4} />
            </div>
            <h3 className="h-display mb-3 text-[26px]">{settings.quoteSuccessTitle}</h3>
            <p className="mb-8 max-w-[380px] text-[15px] leading-relaxed text-body">
              {settings.quoteSuccessBody}
            </p>
            <button type="button" onClick={onClose} className="btn btn-ink btn-lg">
              Keep browsing
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="px-[30px] pt-[26px] pb-10">
            <div className="mb-6 border border-brand-border bg-brand-tint px-4 py-3.5 text-[14px] leading-relaxed text-brand-deep">
              Quoting <strong className="font-semibold text-ink">{subject}</strong> — tell us the
              roster and we&apos;ll price it exactly.
            </div>

            {payload.totalUnits ? (
              <div className="mb-6 border border-hairline bg-surface px-4 py-3 text-[13px] text-body">
                <div className="flex justify-between">
                  <span>Size run</span>
                  <span className="font-semibold text-ink">{payload.totalUnits} units</span>
                </div>
                {payload.colorway && (
                  <div className="mt-1.5 flex justify-between">
                    <span>Colorway</span>
                    <span className="font-semibold text-ink">{payload.colorway}</span>
                  </div>
                )}
                {payload.estTotal ? (
                  <div className="mt-1.5 flex justify-between">
                    <span>Estimate</span>
                    <span className="font-semibold text-ink">
                      ${payload.estTotal.toFixed(2)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3.5">
              <Field
                span
                name="team"
                label="Team / organization *"
                placeholder="Springfield Thunder 14U"
                error={errors.team}
              />
              <Field name="name" label="Your name *" placeholder="Coach name" error={errors.name} />
              <Field
                name="phone"
                label="Phone *"
                type="tel"
                placeholder="(959) 000-0000"
                error={errors.phone}
              />
              <Field
                span
                name="email"
                label="Email *"
                type="email"
                placeholder="coach@team.com"
                error={errors.email}
              />

              <div>
                <label className="field-label" htmlFor="q-sport">
                  Sport
                </label>
                <select
                  id="q-sport"
                  name="sport"
                  defaultValue={payload.sport ?? settings.sportOptions[0]}
                  className="field"
                >
                  {settings.sportOptions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <Field
                name="rosterSize"
                label="Roster size"
                type="number"
                placeholder="12"
                defaultValue={payload.totalUnits ? String(payload.totalUnits) : ''}
                error={errors.rosterSize}
              />

              <div className="col-span-2">
                <span className="field-label">When do you need it?</span>
                <div className="flex flex-wrap gap-2">
                  {settings.deadlineOptions.map((d) => {
                    const on = deadline === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDeadline(d)}
                        aria-pressed={on}
                        className="rounded-[2px] border px-4 py-3 text-[13px] font-semibold transition-colors"
                        style={{
                          borderColor: on ? '#101114' : '#D8D8D3',
                          background: on ? '#FFD100' : '#FFFFFF',
                          color: on ? '#101114' : '#55575E',
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-2">
                <span className="field-label">Artwork or inspiration</span>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className="w-full border border-dashed bg-surface px-4 py-[26px] text-center transition-colors"
                  style={{ borderColor: dragging ? '#101114' : '#C9C9C3' }}
                >
                  <span className="block text-[14px] font-semibold text-ink">
                    Drop logo files or photos
                  </span>
                  <span className="mt-1.5 block text-[12px] font-medium text-muted">
                    PNG, JPG, AI, PDF — up to {MAX_FILE_MB}MB
                  </span>
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.ai"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
                {files.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between gap-3 border border-hairline px-3 py-2 text-[13px]"
                      >
                        <span className="truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                          className="shrink-0 text-muted hover:text-ink"
                          aria-label={`Remove ${f.name}`}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {errors.files && <p className="field-error">{errors.files}</p>}
              </div>

              <div className="col-span-2">
                <label className="field-label" htmlFor="q-message">
                  Anything else
                </label>
                <textarea
                  id="q-message"
                  name="message"
                  rows={3}
                  placeholder="Colors, numbers, sizes, budget…"
                  className="field resize-y"
                />
              </div>
            </div>

            {serverError && (
              <p role="alert" className="field-error mt-4 text-center">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-yellow mt-6 w-full py-5 text-[15px]">
              {busy ? 'Sending…' : 'Send my request'}
            </button>
            <p className="mt-3.5 text-center text-[13px] font-medium leading-relaxed text-muted">
              {settings.quoteReassurance}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  span,
  error,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  span?: boolean;
  error?: string;
  defaultValue?: string;
}) {
  const id = `q-${name}`;
  return (
    <div className={span ? 'col-span-2' : undefined}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
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
