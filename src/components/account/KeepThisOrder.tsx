'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Notice, TextField, accountPost } from './AccountUi';

/**
 * The offer on the thank-you page: keep this order.
 *
 * Asked here because it is the one moment a shopper has a reason to say yes —
 * they have just handed over a name, an address and money, and the thing
 * being offered is the order in front of them. Asking on the home page is
 * asking a stranger to do paperwork.
 *
 * Only a password is wanted: the name and address came from the checkout a
 * moment ago, and asking for them twice would make it look like work.
 */
export function KeepThisOrder({
  reference,
  name,
  email,
}: {
  reference: string;
  name: string;
  email: string;
}) {
  const [who, setWho] = useState<{ signedIn: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/account')
      .then((r) => r.json())
      .then((d) => alive && setWho({ signedIn: Boolean(d?.customer) }))
      .catch(() => alive && setWho({ signedIn: false }));
    return () => {
      alive = false;
    };
  }, []);

  // Nothing at all until we know — an offer that flickers away is worse than
  // one that arrives a beat late.
  if (!who) return null;

  if (who.signedIn) {
    return (
      <div className="mt-8 border-t border-hairline pt-6 text-left">
        <p className="text-[14px] leading-relaxed text-body">
          This order is in your account, with everything else you have ordered.{' '}
          <Link href="/account" className="font-semibold underline underline-offset-4 hover:text-ink">
            Have a look
          </Link>
          .
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-8 border-t border-hairline pt-6 text-left">
        <Notice tone="ok">
          Your account is ready, and order {reference} is in it.
        </Notice>
        <Link href="/account" className="btn btn-outline btn-md mt-4 w-full">
          Go to my account
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const out = await accountPost({ action: 'register', name, email, password });
      // An address that already has an account gets the gentle answer, not
      // a new one — the same rule as the sign-up page.
      if (out.pending) {
        setError(
          'That address already has an account. Sign in and this order will be waiting in it.'
        );
        setBusy(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 border-t border-hairline pt-6 text-left">
      <h3 className="font-display text-[14px] font-extrabold uppercase tracking-[.1em]">
        Keep this order
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-body">
        Pick a password and {reference} is saved to an account — so next season you can order the
        same kit, in the same sizes, in one press.
      </p>

      <div className="mt-4 grid gap-3">
        <Notice tone="error">{error}</Notice>
        <TextField
          label={`Password for ${email}`}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          hint="At least 8 characters."
        />
        <button type="submit" disabled={busy} className="btn btn-ink btn-md w-full disabled:opacity-60">
          {busy ? 'Saving…' : 'Save this order'}
        </button>
      </div>

      <p className="mt-3 text-[12.5px] text-muted">
        Already have an account?{' '}
        <Link href="/account/sign-in" className="font-semibold underline underline-offset-4">
          Sign in
        </Link>{' '}
        and this order joins it.
      </p>
    </form>
  );
}
