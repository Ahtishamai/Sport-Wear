'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccountCard, Notice, accountPost } from './AccountUi';

/**
 * Spends the confirmation link.
 *
 * From the browser, not from the render. Mail providers and corporate link
 * scanners open every address in a message before the person does, and a
 * link that can only be used once would be gone by the time they pressed it.
 * Scanners do not run JavaScript, so this survives them — and the button
 * below is there for anyone whose browser does not either.
 */
export function VerifyPanel({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [error, setError] = useState('');
  const started = useRef(false);

  async function confirm() {
    setState('working');
    try {
      await accountPost({ action: 'verify', token });
      setState('done');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That link did not work.');
      setState('failed');
    }
  }

  useEffect(() => {
    // Strict mode runs effects twice in development; the second run would
    // find the token already spent and report a failure that did not happen.
    if (started.current) return;
    started.current = true;
    confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'done') {
    return (
      <AccountCard
        title="That is confirmed"
        intro="Your email address is proved, and every order placed with it is now in your account."
      >
        <Link href="/account" className="btn btn-yellow btn-md w-full">
          See my orders
        </Link>
      </AccountCard>
    );
  }

  if (state === 'failed') {
    return (
      <AccountCard title="That link did not work">
        <Notice tone="error">{error}</Notice>
        <p className="mt-4 text-[14px] leading-relaxed text-body">
          Links last 48 hours and work once. Sign in and ask for a fresh one.
        </p>
        <Link href="/account" className="btn btn-ink btn-md mt-5 w-full">
          Go to my account
        </Link>
      </AccountCard>
    );
  }

  return (
    <AccountCard title="Confirming your email" intro="One moment.">
      <noscript>
        <p className="text-[14px] text-body">Press the button to confirm.</p>
      </noscript>
      <button type="button" onClick={confirm} className="btn btn-ink btn-md w-full">
        Confirm my email
      </button>
    </AccountCard>
  );
}
