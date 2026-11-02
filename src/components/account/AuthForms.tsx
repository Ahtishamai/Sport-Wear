'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccountCard, Notice, SubmitButton, TextField, accountPost } from './AccountUi';

/**
 * The four forms that let somebody in: sign in, sign up, ask for a reset,
 * and set a new password.
 *
 * Each one hands off to the server and then does a full navigation rather
 * than a client one, because the session cookie has just changed and every
 * server component on the next page has to be rendered knowing that.
 */

function go(router: ReturnType<typeof useRouter>, to: string) {
  router.push(to);
  router.refresh();
}

/** Where to send someone after they are in, kept to this site. */
function safeNext(next?: string | null) {
  const v = (next ?? '').trim();
  return v.startsWith('/') && !v.startsWith('//') ? v : '/account';
}

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountPost({ action: 'login', email, password });
      go(router, safeNext(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <AccountCard
      title="Sign in"
      intro="Your orders, your details, and a way to order the same kit again without filling the form in twice."
      footer={
        <>
          New here?{' '}
          <Link href={`/account/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold underline underline-offset-4">
            Make an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <Notice tone="error">{error}</Notice>
        <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required placeholder="coach@team.com" />
        <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        <SubmitButton busy={busy} busyLabel="Signing in…">
          Sign in
        </SubmitButton>
        <Link href="/account/forgot" className="text-center text-[13.5px] text-body underline underline-offset-4 hover:text-ink">
          Forgotten your password?
        </Link>
      </form>
    </AccountCard>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const out = await accountPost({ action: 'register', ...form });
      // An address that already has an account gets the same answer as a new
      // one, so this form cannot be used to find out who shops here.
      if (out.pending) {
        setPending(out.message);
        setBusy(false);
        return;
      }
      go(router, safeNext(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make the account.');
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <AccountCard title="Check your email">
        <Notice tone="ok">{pending}</Notice>
        <p className="mt-4 text-[14px] text-body">
          Already know your password?{' '}
          <Link href="/account/sign-in" className="font-semibold underline underline-offset-4">
            Sign in
          </Link>
          .
        </p>
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title="Make an account"
      intro="So your orders are waiting for you next season, and reordering the same kit takes one press."
      footer={
        <>
          Already have one?{' '}
          <Link href={`/account/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <Notice tone="error">{error}</Notice>
        <TextField label="Your name" value={form.name} onChange={(v) => set('name', v)} autoComplete="name" required placeholder="Coach name" />
        <TextField label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} autoComplete="email" required placeholder="coach@team.com" />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => set('password', v)}
          autoComplete="new-password"
          required
          hint="At least 8 characters. Length beats symbols."
        />
        <SubmitButton busy={busy} busyLabel="Making it…">
          Make my account
        </SubmitButton>
      </form>
    </AccountCard>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const out = await accountPost({ action: 'forgot', email });
      setDone(out.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AccountCard title="Check your email">
        <Notice tone="ok">{done}</Notice>
        <p className="mt-4 text-[14px] text-body">
          Nothing after a few minutes? Look in spam, or{' '}
          <Link href="/contact" className="font-semibold underline underline-offset-4">
            tell us
          </Link>{' '}
          and we will sort it out.
        </p>
      </AccountCard>
    );
  }

  return (
    <AccountCard
      title="Forgotten password"
      intro="Tell us the address on the account and we will send a link to set a new password."
      footer={
        <Link href="/account/sign-in" className="font-semibold underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <Notice tone="error">{error}</Notice>
        <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required placeholder="coach@team.com" />
        <SubmitButton busy={busy} busyLabel="Sending…">
          Send the link
        </SubmitButton>
      </form>
    </AccountCard>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await accountPost({ action: 'reset', token, password });
      go(router, '/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the password.');
      setBusy(false);
    }
  }

  return (
    <AccountCard
      title="Set a new password"
      intro="Then you will be signed in."
      footer={
        <Link href="/account/forgot" className="font-semibold underline underline-offset-4">
          Send me a fresh link
        </Link>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <Notice tone="error">{error}</Notice>
        <TextField
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          hint="At least 8 characters."
        />
        <SubmitButton busy={busy} busyLabel="Saving…">
          Save and sign in
        </SubmitButton>
      </form>
    </AccountCard>
  );
}
