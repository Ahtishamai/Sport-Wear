'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/site/Icon';

/**
 * The way into an account from the header.
 *
 * It asks the server who is signed in rather than reading a cookie, because
 * the session cookie is deliberately unreadable from JavaScript. Until the
 * answer arrives it renders nothing: a button that says "Sign in" for half a
 * second to someone who is already signed in is worse than a beat of nothing.
 */
export function AccountButton({ className }: { className?: string }) {
  const [state, setState] = useState<{ name: string } | null | 'unknown'>('unknown');
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    fetch('/api/account')
      .then((r) => r.json())
      .then((d) => alive && setState(d?.customer ? { name: d.customer.name } : null))
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
    // Re-asked on navigation, so signing in or out is reflected without a reload.
  }, [pathname]);

  if (state === 'unknown') return null;

  const signedIn = state !== null;
  return (
    <Link
      href={signedIn ? '/account' : '/account/sign-in'}
      aria-label={signedIn ? `My account, signed in as ${state.name}` : 'Sign in'}
      title={signedIn ? state.name : 'Sign in'}
      className={
        'relative flex h-10 w-10 items-center justify-center border border-hairline text-ink transition-colors hover:border-ink ' +
        (className ?? '')
      }
    >
      <Icon name="users" size={17} />
      {signedIn && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 h-[9px] w-[9px] rounded-full border-2 border-white bg-success"
        />
      )}
    </Link>
  );
}
