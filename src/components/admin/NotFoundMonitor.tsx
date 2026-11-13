'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type NotFoundRow } from '@/lib/admin-client';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Table,
  Td,
  Th,
  useConfirm,
  useDebounced,
  useToast,
} from './ui';

/**
 * The 404 report, and the one action worth taking from it.
 *
 * An address with a count beside it is a question — where did these people
 * mean to go? — so the only control that matters is the one that answers it:
 * type the new address, press the button, and the rule exists. Nobody should
 * have to copy a path between two screens to mend a broken link.
 */
export function NotFoundMonitor() {
  const toast = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState<NotFoundRow[]>([]);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [showIgnored, setShowIgnored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const search = useDebounced(q, 300);

  const [fixing, setFixing] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.notFound.list({ q: search || undefined, ignored: showIgnored });
      setRows(res.items);
      setIgnoredCount(res.ignoredCount);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load the report', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showIgnored, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveRedirect(row: NotFoundRow) {
    if (!target.trim()) {
      toast('Type where this address should send people', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.create('redirects', {
        from: row.path,
        to: target.trim(),
        kind: 'PERMANENT',
        active: true,
      });
      // The address is answered now, so it leaves the list of outstanding
      // problems — but its count stays, in case the rule needs rethinking.
      await api.notFound.act({ action: 'ignore', id: row.id });
      toast('Redirect created');
      setFixing(null);
      setTarget('');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the redirect', 'error');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Says the page is gone for good: a rule with nowhere to send anybody,
   * which the site answers 410 rather than 404.
   *
   * Worth the separate button rather than a checkbox on the redirect form,
   * because this is the common case for a dead end. Most of them are not a
   * page that moved, they are a page that never existed or will never come
   * back, and the honest answer to a crawler asking for one is "stop asking"
   * rather than "try again later".
   */
  async function markGone(row: NotFoundRow) {
    if (!(await confirm({
      title: 'Mark this address gone?',
      message: `${row.path} will answer 410 Gone instead of 404, which tells a search engine to drop it rather than keep checking. Undo it from Redirects.`,
      confirmLabel: 'Mark it gone',
    }))) return;

    setBusy(true);
    try {
      await api.create('redirects', {
        from: row.path,
        to: '',
        kind: 'PERMANENT',
        active: true,
        note: 'Gone for good — answers 410.',
      });
      await api.notFound.act({ action: 'ignore', id: row.id });
      toast('Marked gone');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not mark it gone', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function act(action: 'ignore' | 'unignore' | 'delete', row: NotFoundRow) {
    try {
      await api.notFound.act({ action, id: row.id });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not work', 'error');
    }
  }

  async function clearAll() {
    const ok = await confirm({
      title: 'Clear the 404 report?',
      message:
        'Every address and its count is erased. The report fills again from the next visit, which is how you tell a fix worked. Redirects you have written are not touched.',
      confirmLabel: 'Clear the report',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await api.notFound.act({ action: 'clear', includeIgnored: showIgnored });
      toast(`${res.cleared ?? 0} cleared`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not clear the report', 'error');
    }
  }

  const shortDate = (v: string) =>
    new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card
      title={showIgnored ? 'Every address in the report' : 'Addresses nobody could reach'}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search addresses"
            className="w-[190px]"
          />
          <Button variant="outline" size="sm" onClick={() => setShowIgnored((v) => !v)}>
            {showIgnored ? 'Hide the dealt-with' : `Show the dealt-with (${ignoredCount})`}
          </Button>
          {rows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <p className="px-5 py-8 text-[13px] text-[#8A8C93]">Reading the report…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that' : 'Nobody has hit a dead end'}
          body={
            search
              ? 'No address in the report contains that.'
              : 'Every address asked for since the report was last cleared has been answered. Addresses only a scanner asks for are never recorded, so this stays a list of real visitors.'
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Address</Th>
              <Th className="w-[70px] text-right">Hits</Th>
              <Th className="w-[130px]">Last seen</Th>
              <Th className="w-[300px]">What to do</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={r.path}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[12.5px] break-all hover:underline"
                    >
                      {r.path}
                    </a>
                    {r.covered && <Badge tone="green">redirected</Badge>}
                    {r.ignored && !r.covered && <Badge>dealt with</Badge>}
                  </div>
                  {r.referrer && (
                    <p className="mt-1 text-[11.5px] break-all text-[#8A8C93]">
                      linked from {r.referrer}
                    </p>
                  )}
                </Td>
                <Td className="text-right font-semibold tabular-nums">{r.hits}</Td>
                <Td className="text-[12px] text-[#6B6D74]">
                  {shortDate(r.lastSeenAt)}
                  <span className="block text-[11px] text-[#9A9CA2]">
                    first {shortDate(r.firstSeenAt)}
                  </span>
                </Td>
                <Td>
                  {fixing === r.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        autoFocus
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRedirect(r);
                          if (e.key === 'Escape') setFixing(null);
                        }}
                        placeholder="/collections/baseball-uniform"
                        className="w-[180px]"
                      />
                      <Button size="sm" disabled={busy} onClick={() => saveRedirect(r)}>
                        {busy ? 'Saving…' : 'Save'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setFixing(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {!r.covered && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFixing(r.id);
                            setTarget('');
                          }}
                        >
                          Redirect it
                        </Button>
                      )}
                      {!r.covered && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => markGone(r)}
                        >
                          Mark gone
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => act(r.ignored ? 'unignore' : 'ignore', r)}
                      >
                        {r.ignored ? 'Put back' : 'Dealt with'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => act('delete', r)}>
                        Forget
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
