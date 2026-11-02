'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

type Row = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  verified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  orders: number;
};

/**
 * The people who have an account.
 *
 * Read-only but for two things: confirming an address by hand, for when
 * email is not set up or a customer never gets ours, and deleting an account
 * when somebody asks. Their name and address are theirs to change, from
 * their own account page.
 */
export function CustomerList() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const search = useDebounced(q, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not load');
      setRows(data.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: 'verify' | 'unverify' | 'delete', row: Row) {
    if (action === 'delete') {
      const ok = await confirm({
        title: `Delete the account for ${row.email}?`,
        message:
          'Their orders stay in your books — they simply stop belonging to an account. The person can make a new one with the same address at any time.',
        confirmLabel: 'Delete the account',
        tone: 'danger',
      });
      if (!ok) return;
    }
    if (action === 'verify') {
      const ok = await confirm({
        title: `Confirm ${row.email} by hand?`,
        message:
          'This is normally done by the customer pressing a link we email them. Doing it here opens every order placed with this address to whoever can sign in to the account, so only do it when you know who they are.',
        confirmLabel: 'Confirm the address',
      });
      if (!ok) return;
    }

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'That did not work');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not work', 'error');
    }
  }

  const when = (v: string | null) =>
    v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <Card
      title="Accounts"
      actions={
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="w-[220px]"
        />
      }
    >
      {loading ? (
        <p className="px-5 py-8 text-[13px] text-[#8A8C93]">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={search ? 'Nobody matches that' : 'No accounts yet'}
          body={
            search
              ? 'No account has that name or address.'
              : 'Shoppers can still buy without one. An account is what lets them see past orders and reorder in one press.'
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th className="w-[110px]">Email</Th>
              <Th className="w-[80px] text-right">Orders</Th>
              <Th className="w-[130px]">Last signed in</Th>
              <Th className="w-[200px]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <span className="block font-semibold">{r.name}</span>
                  <span className="block text-[12.5px] text-[#8A8C93]">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </span>
                </Td>
                <Td>
                  {r.verified ? <Badge tone="green">confirmed</Badge> : <Badge tone="yellow">unconfirmed</Badge>}
                </Td>
                <Td className="text-right font-semibold tabular-nums">{r.orders}</Td>
                <Td className="text-[12.5px] text-[#6B6D74]">
                  {when(r.lastLoginAt)}
                  <span className="block text-[11px] text-[#9A9CA2]">joined {when(r.createdAt)}</span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1">
                    {r.orders > 0 && (
                      <Link
                        href={`/admin/shop-orders?q=${encodeURIComponent(r.email)}`}
                        className="px-2.5 py-1.5 text-[12px] font-semibold text-[#6B6D74] hover:text-ink"
                      >
                        Orders
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => act(r.verified ? 'unverify' : 'verify', r)}
                    >
                      {r.verified ? 'Unconfirm' : 'Confirm by hand'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => act('delete', r)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
