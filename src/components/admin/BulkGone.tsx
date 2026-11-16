'use client';

import { useState } from 'react';
import { Badge, Button, Card, Table, Td, Th, Textarea, useToast } from './ui';

type State = 'dead' | 'live' | 'redirected' | 'already-gone' | 'pattern' | 'whole-site' | 'unreachable';

type Row = {
  path: string;
  status: number | null;
  state: State;
  to?: string | null;
  active?: boolean;
  note?: string | null;
};

/** What each answer means, and whether it may be written off. */
const MEANING: Record<State, { label: string; tone: 'green' | 'yellow' | 'red' | 'neutral'; says: string }> = {
  dead: { label: 'Dead', tone: 'red', says: 'Nothing answers this. Safe to mark gone.' },
  live: { label: 'Live', tone: 'green', says: 'This page works. Leaving it alone.' },
  redirected: { label: 'Redirected', tone: 'green', says: 'Already sent somewhere.' },
  'already-gone': { label: 'Already gone', tone: 'neutral', says: 'Already answering 410.' },
  pattern: { label: 'Not an address', tone: 'yellow', says: 'A pattern, not a page. Nothing to mark.' },
  'whole-site': { label: 'The whole site', tone: 'red', says: 'This would switch the shop off. Refused.' },
  unreachable: { label: 'No answer', tone: 'yellow', says: 'The site did not answer. Try again.' },
};

/**
 * Paste a list of addresses, find out what each one actually does, and write
 * off the ones that are genuinely dead.
 *
 * The checking is the point. A list of broken addresses always has live pages
 * in it — it comes from a crawler, or an old robots file, or a spreadsheet —
 * and a 410 on a page that works is a page removed from Google by hand.
 * Nothing is marked until the site has been asked.
 */
export function BulkGone() {
  const toast = useToast();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const dead = (rows ?? []).filter((r) => r.state === 'dead' && !r.note);

  async function check() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/check-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Could not check those.');
      setRows(body.rows as Row[]);
      if (body.truncated) toast(`Only the first ${body.rows.length} were checked`, 'error');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not check those', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    setBusy(true);
    let done = 0;
    try {
      for (const row of dead) {
        const res = await fetch('/api/admin/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: row.path,
            to: '',
            kind: 'PERMANENT',
            active: true,
            note: 'Gone for good — checked and marked in bulk.',
          }),
        });
        if (res.ok) done++;
      }
      toast(`${done} of ${dead.length} marked gone`);
      await check();
    } catch {
      toast('Some could not be saved', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Check a list of addresses"
      description="Paste addresses one per line. Each is fetched before anything is offered, so a page that still works is never written off."
    >
      <Textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'https://design-sportswear.com/old-page\n/another-old-page'}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={check} disabled={busy || !text.trim()}>
          {busy ? 'Checking…' : 'Check them'}
        </Button>
        {dead.length > 0 && (
          <Button variant="yellow" onClick={markAll} disabled={busy}>
            Mark {dead.length} dead {dead.length === 1 ? 'address' : 'addresses'} gone
          </Button>
        )}
        {rows && (
          <span className="text-[13px] text-[#6B6D74]">
            {rows.length} checked · {dead.length} dead · {rows.length - dead.length} left alone
          </span>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <Th>Address</Th>
                <Th>Answers</Th>
                <Th>What that means</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = MEANING[r.state];
                return (
                  <tr key={r.path}>
                    <Td className="text-[13px]">
                      <span className="block max-w-[260px] truncate font-mono">{r.path}</span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Badge tone={m.tone}>
                        {r.status ? `${r.status} · ${m.label}` : m.label}
                      </Badge>
                    </Td>
                    <Td className="text-[13px] text-[#6B6D74]">
                      {r.note ?? m.says}
                      {r.to ? ` → ${r.to}` : ''}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
