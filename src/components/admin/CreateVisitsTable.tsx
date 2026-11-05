'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui';

/**
 * Makes the visits table, for a server nobody can get a terminal on.
 *
 * `npm run db:push` is the normal way and wants SSH. On shared hosting
 * that is a support ticket, so the one piece of schema the traffic screens
 * need can be asked for from here instead.
 */
export function CreateVisitsTable() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle');
  const [error, setError] = useState('');

  async function create() {
    setState('working');
    setError('');
    try {
      const res = await fetch('/api/admin/live', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create-table' }),
      });
      const out = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !out.ok) {
        setState('failed');
        setError(out.error ?? `The server answered ${res.status}.`);
        return;
      }
      // Straight back to a working screen.
      router.refresh();
    } catch (err) {
      setState('failed');
      setError(String(err).slice(0, 200));
    }
  }

  return (
    <div className="mt-4">
      <Button onClick={create} disabled={state === 'working'} variant="yellow">
        {state === 'working' ? 'Creating the table…' : 'Create the table now'}
      </Button>
      <p className="mt-2 text-[12px] text-[#6B6D74]">
        Adds one table called <code className="bg-[#F4F4F1] px-1">visits</code>. Nothing already in
        the database is changed, and running it twice does nothing the second time.
      </p>
      {state === 'failed' && (
        <p className="mt-3 border border-[#E9B3B3] bg-[#FDF2F2] p-3 text-[13px] text-[#8A1C1C]">
          {error}
        </p>
      )}
    </div>
  );
}
