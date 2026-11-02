'use client';

import { cn } from '@/lib/utils';

/**
 * The small parts every account form is made of.
 *
 * Deliberately the same field as the checkout uses. Someone who has bought
 * from the site once should not feel they have arrived somewhere else when
 * they come back to look at the order.
 */

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  required,
  span,
  hint,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  span?: boolean;
  hint?: string;
  id?: string;
}) {
  return (
    <label className={span ? 'block sm:col-span-2' : 'block'}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-hairline px-4 py-3 text-[15px] outline-none focus:border-ink"
      />
      {hint && <span className="mt-1.5 block text-[12.5px] text-muted">{hint}</span>}
    </label>
  );
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'ok';
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'border-l-[3px] px-4 py-3 text-[14px] leading-relaxed',
        tone === 'error' && 'border-[#C42027] bg-[#FBE7E8] text-[#8c1319]',
        tone === 'ok' && 'border-success bg-[#E4F4EA] text-[#15663a]',
        tone === 'info' && 'border-brand bg-brand-tint text-brand-deep'
      )}
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  busy,
  children,
  busyLabel,
}: {
  busy: boolean;
  children: React.ReactNode;
  busyLabel?: string;
}) {
  return (
    <button type="submit" disabled={busy} className="btn btn-ink btn-md w-full disabled:opacity-60">
      {busy ? (busyLabel ?? 'Working…') : children}
    </button>
  );
}

/** The box every sign-in-shaped page sits in. */
export function AccountCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="border border-hairline bg-white p-6 md:p-8">
        <h1 className="h-display text-[24px] leading-[1.1] md:text-[28px]">{title}</h1>
        {intro && <p className="mt-3 text-[15px] leading-relaxed text-body">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-[14px] text-body">{footer}</div>}
    </div>
  );
}

/** POSTs to the one account endpoint and gives back whatever it said. */
export async function accountPost(payload: Record<string, unknown>) {
  const res = await fetch('/api/account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
  return data as Record<string, any>;
}
