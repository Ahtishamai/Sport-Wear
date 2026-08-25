'use client';

import { useQuote, type QuoteContextPayload } from './QuoteProvider';

/** Any button that opens the global quote drawer with a given subject. */
export function QuoteButton({
  subject,
  payload,
  className,
  children,
  ...rest
}: {
  subject?: string;
  payload?: QuoteContextPayload;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const { open } = useQuote();
  return (
    <button type="button" className={className} onClick={() => open(subject, payload)} {...rest}>
      {children}
    </button>
  );
}
