'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShopCart, type NewShopLine } from '@/components/shop/CartProvider';
import { Notice, SubmitButton, TextField, accountPost } from './AccountUi';

/** Signing out, from anywhere. */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await accountPost({ action: 'logout' });
        } catch {
          /* the cookie is the server's to clear; nothing useful to say here */
        }
        router.push('/');
        router.refresh();
      }}
      className={className ?? 'text-[13.5px] font-semibold text-body underline underline-offset-4 hover:text-ink'}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

/**
 * Shown until the address is proved.
 *
 * It says what is actually being withheld and why, because "please verify
 * your email" with no reason reads as busywork and gets ignored.
 */
export function VerifyBanner({ email, mailReady }: { email: string; mailReady: boolean }) {
  const [state, setState] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [busy, setBusy] = useState(false);

  if (!mailReady) {
    return (
      <Notice>
        Orders you place while signed in will show here. Orders you placed as a guest are kept
        back until this address is confirmed — and email is not set up on this site yet, so ask
        us and we will confirm it by hand.
      </Notice>
    );
  }

  if (state === 'sent') return <Notice tone="ok">A fresh link is on its way to {email}.</Notice>;

  return (
    <div className="border-l-[3px] border-brand bg-brand-tint px-4 py-3 text-[14px] leading-relaxed text-brand-deep">
      <p>
        Confirm <strong>{email}</strong> to see orders you placed before making this account. An
        order carries your name, phone number and address, so we do not show them to an address
        that has not been proved.
      </p>
      {state === 'failed' && (
        <p className="mt-2 font-semibold">That did not send. Please tell us and we will sort it out.</p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const out = await accountPost({ action: 'resend' });
            setState(out?.mail?.sent === false ? 'failed' : 'sent');
          } catch {
            setState('failed');
          } finally {
            setBusy(false);
          }
        }}
        className="mt-2 font-semibold underline underline-offset-4 disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Send me the link again'}
      </button>
    </div>
  );
}

/** Name, phone and the address the next checkout starts from. */
export function DetailsForm({
  initial,
}: {
  initial: {
    name: string;
    phone: string;
    shipTo: { line1: string; line2: string; city: string; state: string; postcode: string };
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: 'name' | 'phone', v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };
  const setShip = (k: keyof typeof initial.shipTo, v: string) => {
    setForm((f) => ({ ...f, shipTo: { ...f.shipTo, [k]: v } }));
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountPost({ action: 'details', ...form });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {error && (
        <div className="sm:col-span-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {saved && (
        <div className="sm:col-span-2">
          <Notice tone="ok">Saved. The next checkout will start from this.</Notice>
        </div>
      )}
      <TextField label="Your name" value={form.name} onChange={(v) => set('name', v)} autoComplete="name" span />
      <TextField label="Phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} autoComplete="tel" />
      <div className="hidden sm:block" />
      <TextField label="Address" value={form.shipTo.line1} onChange={(v) => setShip('line1', v)} autoComplete="address-line1" span />
      <TextField label="Apartment, suite (optional)" value={form.shipTo.line2} onChange={(v) => setShip('line2', v)} autoComplete="address-line2" span />
      <TextField label="City" value={form.shipTo.city} onChange={(v) => setShip('city', v)} autoComplete="address-level2" />
      <TextField label="State" value={form.shipTo.state} onChange={(v) => setShip('state', v)} autoComplete="address-level1" />
      <TextField label="ZIP" value={form.shipTo.postcode} onChange={(v) => setShip('postcode', v)} autoComplete="postal-code" />
      <div className="sm:col-span-2">
        <SubmitButton busy={busy} busyLabel="Saving…">
          Save my details
        </SubmitButton>
      </div>
    </form>
  );
}

/** Changing the password from inside the account. */
export function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountPost({ action: 'password', current, password });
      setDone(true);
      setCurrent('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change it.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-[420px] gap-4">
      <Notice tone="error">{error}</Notice>
      {done && <Notice tone="ok">Your password has been changed.</Notice>}
      <TextField label="Current password" type="password" value={current} onChange={setCurrent} autoComplete="current-password" required />
      <TextField label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" required hint="At least 8 characters." />
      <SubmitButton busy={busy} busyLabel="Changing…">
        Change my password
      </SubmitButton>
    </form>
  );
}

/**
 * Puts a past order back in the cart.
 *
 * Only the choices are carried over — product, size, personalisation, how
 * many. The price is whatever the product costs today, and the server prices
 * the cart again at checkout regardless, so an old order can never be used to
 * buy at an old price.
 */
export function ReorderButton({
  lines,
  missing,
  className,
}: {
  lines: NewShopLine[];
  /** Titles from the order that are no longer sold. */
  missing: string[];
  className?: string;
}) {
  const { add } = useShopCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (lines.length === 0) {
    return (
      <p className="text-[14px] text-muted">
        Nothing from this order is still in the catalogue. Ask us for a quote and we will make it
        again.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className={className ?? 'btn btn-yellow btn-md'}
        onClick={() => {
          setBusy(true);
          add(lines);
          router.push('/cart');
        }}
      >
        {busy ? 'Adding…' : 'Order this again'}
      </button>
      {missing.length > 0 && (
        <p className="mt-2 text-[13px] text-muted">
          {missing.length === 1 ? '1 item is' : `${missing.length} items are`} no longer sold and
          will be left out: {missing.join(', ')}.
        </p>
      )}
    </div>
  );
}
