'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';

// ------------------------------------------------------------------ layout

export function AdminPage({
  title,
  description,
  actions,
  children,
  back,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 md:px-8">
      {back && (
        <Link
          href={back.href}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B6D74] hover:text-ink"
        >
          ← {back.label}
        </Link>
      )}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-black uppercase tracking-[-.01em]">
            {title}
          </h1>
          {description && <p className="mt-1.5 max-w-[620px] text-[14px] text-[#6B6D74]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn('border border-[#E3E3DF] bg-white', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E3DF] px-6 py-4">
          <div>
            {title && (
              <h2 className="font-display text-[13px] font-extrabold uppercase tracking-[.12em]">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-[13px] text-[#6B6D74]">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[#D6D6D1] bg-white px-8 py-16 text-center">
      <h3 className="font-display text-[16px] font-extrabold uppercase">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-[420px] text-[14px] text-[#6B6D74]">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ buttons

export function Button({
  variant = 'ink',
  size = 'md',
  className,
  ...props
}: {
  variant?: 'ink' | 'yellow' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[2px] border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-4 py-2.5 text-[13px]',
        variant === 'ink' && 'border-ink bg-ink text-white hover:bg-[#26272c]',
        variant === 'yellow' && 'border-brand bg-brand text-ink hover:brightness-95',
        variant === 'outline' && 'border-[#D6D6D1] bg-white text-ink hover:border-ink',
        variant === 'ghost' && 'border-transparent bg-transparent text-[#6B6D74] hover:text-ink',
        variant === 'danger' && 'border-[#C42027] bg-white text-[#C42027] hover:bg-[#C42027] hover:text-white',
        className
      )}
    />
  );
}

export function LinkButton({
  href,
  variant = 'outline',
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: 'ink' | 'yellow' | 'outline';
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link
      href={href}
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[2px] border px-4 py-2.5 text-[13px] font-semibold transition-colors',
        variant === 'ink' && 'border-ink bg-ink text-white hover:bg-[#26272c]',
        variant === 'yellow' && 'border-brand bg-brand text-ink hover:brightness-95',
        variant === 'outline' && 'border-[#D6D6D1] bg-white text-ink hover:border-ink',
        className
      )}
    >
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------ inputs

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="field-label">
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('field', props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('field resize-y', props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('field', props.className)} />;
}

export function Checkbox({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
      <input
        type="checkbox"
        {...props}
        style={{ accentColor: '#101114' }}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

export function Field({
  label,
  help,
  error,
  children,
  className,
}: {
  label?: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {help && !error && <p className="mt-1.5 text-[12px] text-[#8A8C93]">{help}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ table

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[#E3E3DF] bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-[#E3E3DF] px-4 py-3 text-[11px] font-bold uppercase tracking-[.12em] text-[#8A8C93]',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('border-b border-[#EFEFEC] px-4 py-3 align-middle', className)}>{children}</td>;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const tones = {
    neutral: 'bg-[#F0F0ED] text-[#55575E]',
    green: 'bg-[#E4F4EA] text-[#1F8A4C]',
    yellow: 'bg-brand-tint text-brand-deep',
    red: 'bg-[#FBE7E8] text-[#C42027]',
    blue: 'bg-[#E6EDFB] text-[#1B4FD8]',
  };
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-[2px] px-2 py-1 text-[11px] font-bold uppercase tracking-[.08em]',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ toast

type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[300] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center gap-2.5 rounded-[2px] px-4 py-3 text-[13px] font-medium text-white shadow-lg',
              t.tone === 'error' ? 'bg-[#C42027]' : 'bg-ink'
            )}
          >
            <Icon name={t.tone === 'error' ? 'close' : 'check'} size={15} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ------------------------------------------------------------------ misc

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function ConfirmButton({
  onConfirm,
  children,
  message = 'Are you sure? This cannot be undone.',
  ...rest
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  message?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      variant="danger"
      size="sm"
      {...rest}
      onClick={() => {
        if (window.confirm(message)) onConfirm();
      }}
    >
      {children}
    </Button>
  );
}
