'use client';

import { useState } from 'react';
import { Icon } from './Icon';

/**
 * Mending a dead end from the dead end itself.
 *
 * An admin who lands on a 404 on the live site is standing at the one moment
 * they know exactly what the address should have done, and the old answer was
 * to remember it, open the admin, find Dead ends and type it back in. This
 * writes the rule from here.
 *
 * Three answers, which are genuinely different things:
 *
 *   301  it moved, and the new page inherits what the old one earned
 *   302  it is away for a while and will be back, so nothing is handed over
 *   410  it is gone for good, so a search engine should stop asking
 *
 * The 404 that was here before is none of those: it only says "not here
 * just now", which is why a crawler keeps coming back to check.
 */
export function DeadEndBar({ path, onDone }: { path: string; onDone: () => void }) {
  const [mode, setMode] = useState<'idle' | 'redirect'>('idle');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(target: string, how: 'PERMANENT' | 'TEMPORARY', note: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: path, to: target, kind: how, active: true, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'That could not be saved.');
      }
      /*
       * Wait until the address really has changed before reloading.
       *
       * A redirect is answered by the page itself and takes effect at once.
       * "Gone" is answered by the middleware, which holds its copy of the
       * rules for a few seconds — so reloading straight away would show the
       * owner the same 404 they just fixed and make it look as though
       * nothing had happened.
       */
      if (!target) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 500));
          try {
            const check = await fetch(path, { method: 'HEAD', cache: 'no-store' });
            if (check.status !== 404) break;
          } catch {
            break;
          }
        }
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That could not be saved.');
      setBusy(false);
    }
  }

  const base =
    'rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[150] md:right-auto md:max-w-[640px] print:hidden">
      <div className="rounded-2xl border border-white/15 bg-ink p-3 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[.1em] text-brand">
            <Icon name="compass" size={14} />
            Dead end
          </span>
          <code className="min-w-0 flex-1 truncate text-[12px] text-white/70">{path}</code>
        </div>

        {mode === 'idle' ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('redirect')}
              className={`${base} bg-brand text-ink hover:opacity-90`}
            >
              Send it somewhere
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => save('', 'PERMANENT', 'Marked gone from the live site.')}
              className={`${base} border border-white/20 hover:bg-white/10`}
              title="410 Gone — tells a search engine to drop it"
            >
              {busy ? 'Saving…' : 'It is gone for good (410)'}
            </button>
            <button
              type="button"
              onClick={onDone}
              aria-label="Leave it as a dead end"
              className="ml-auto rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <input
              autoFocus
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="/collections/baseball-uniform"
              className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[12px] text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'PERMANENT' | 'TEMPORARY')}
              className="rounded-full border border-white/20 bg-ink px-2.5 py-1.5 text-[12px] font-semibold text-white focus:border-brand focus:outline-none"
            >
              <option value="PERMANENT">301 — moved for good</option>
              <option value="TEMPORARY">302 — away for a while</option>
            </select>
            <button
              type="button"
              disabled={busy || !to.trim()}
              onClick={() => save(to.trim(), kind, 'Added from the live site.')}
              className={`${base} bg-brand text-ink hover:opacity-90`}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode('idle');
                setError(null);
              }}
              className={`${base} text-white/70 hover:bg-white/10`}
            >
              Back
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-[12px] text-[#FF9B9B]">{error}</p>}
      </div>
    </div>
  );
}
