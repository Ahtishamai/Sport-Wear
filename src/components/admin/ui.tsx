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
  message = 'Are you sure?',
  title = 'Are you sure?',
  confirmLabel = 'Move to Trash',
  ...rest
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  message?: string;
  title?: string;
  confirmLabel?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const confirm = useConfirm();
  return (
    <Button
      variant="danger"
      size="sm"
      {...rest}
      onClick={async () => {
        if (await confirm({ title, message, confirmLabel })) onConfirm();
      }}
    >
      {children}
    </Button>
  );
}

// ------------------------------------------------------------------ confirm

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  /** Short lines listed under the message, e.g. "36 designs". */
  items?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" is for things that cannot be undone. */
  tone?: 'trash' | 'danger';
};

// Outside the provider, fall back to the browser's box rather than silently
// answering "no" and leaving a button that does nothing.
const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async (o) =>
  window.confirm([o.title, typeof o.message === 'string' ? o.message : '', ...(o.items ?? [])].filter(Boolean).join('\n\n'))
);

/** A proper warning dialog in place of the browser's confirm box. Resolves true on yes. */
export function useConfirm() {
  return useContext(ConfirmCtx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const ask = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setOpen({ ...o, resolve });
      }),
    []
  );

  const close = useCallback(
    (ok: boolean) => {
      setOpen((cur) => {
        cur?.resolve(ok);
        return null;
      });
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const danger = open?.tone === 'danger';

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/45 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            data-confirm-dialog
            className="w-full max-w-[440px] rounded-[2px] bg-white shadow-2xl"
          >
            <div className="flex gap-3.5 px-6 pb-2 pt-6">
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] font-bold',
                  danger ? 'bg-[#FBE7E8] text-[#C42027]' : 'bg-brand-tint text-brand-deep'
                )}
                aria-hidden
              >
                !
              </span>
              <div className="min-w-0">
                <h2 id="confirm-title" className="text-[17px] font-bold leading-snug text-ink">
                  {open.title}
                </h2>
                {open.message && <div className="mt-1.5 text-[13.5px] leading-relaxed text-[#55575E]">{open.message}</div>}
                {!!open.items?.length && (
                  <ul className="mt-3 space-y-1 rounded-[2px] bg-[#F6F6F3] px-3.5 py-2.5 text-[13px] font-medium text-ink">
                    {open.items.map((i) => (
                      <li key={i}>• {i}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-[#EFEFEC] px-6 py-4">
              <Button variant="outline" autoFocus onClick={() => close(false)} data-confirm-cancel>
                {open.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                className={danger ? 'border-[#C42027] bg-[#C42027] hover:bg-[#a51b21]' : ''}
                onClick={() => close(true)}
                data-confirm-ok
              >
                {open.confirmLabel ?? 'Yes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/**
 * Warn, then move a saved record to Trash.
 *
 * The warning names what else goes with it ("36 designs, 4 orders"), read
 * from the server at the moment of asking, so it is never a guess. Resolves
 * true once it is in Trash; false if the person said no or it failed (the
 * failure is already shown as a toast).
 */
export function useMoveToTrash() {
  const confirm = useConfirm();
  const toast = useToast();

  return useCallback(
    async ({
      resource,
      id,
      name,
      force = false,
      extra,
    }: {
      resource: string;
      id: string;
      /** How to call it in the warning, e.g. “Pirates 2026”. */
      name?: string;
      force?: boolean;
      /** A further line of warning, e.g. about images still in use. */
      extra?: string;
    }) => {
      const { api } = await import('@/lib/admin-client');
      let label = name ?? 'this';
      let items: string[] = [];
      try {
        const p = await api.trash.preview(resource, id);
        label = name ?? p.label;
        items = p.contents.map((c) => `${c.count} ${c.noun}`);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Could not check that item', 'error');
        return false;
      }

      const ok = await confirm({
        title: `Delete ${label}?`,
        message: (
          <>
            {items.length ? 'This also removes everything below with it. ' : ''}
            It goes to <b>Trash</b> first — nothing is erased, and you can restore it from Trash at any time.
            {extra ? <span className="mt-2 block text-[#C42027]">{extra}</span> : null}
          </>
        ),
        items,
        confirmLabel: 'Move to Trash',
      });
      if (!ok) return false;

      try {
        await api.remove(resource, id, force);
        toast('Moved to Trash — restore it from Trash if needed');
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Delete failed', 'error');
        return false;
      }
    },
    [confirm, toast]
  );
}
