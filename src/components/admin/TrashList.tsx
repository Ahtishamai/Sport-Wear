'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api } from '@/lib/admin-client';
import { formatDateTime } from '@/lib/utils';
import { Badge, Button, EmptyState, Select, Table, Td, Th, useConfirm, useToast } from './ui';

type Item = {
  id: string;
  resource: string;
  kind: string;
  label: string;
  detail: string | null;
  deletedAt: string | Date;
  deletedByName: string | null;
};

export function TrashList({ items, canPurge }: { items: Item[]; canPurge: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [kind, setKind] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const kinds = useMemo(() => [...new Set(items.map((i) => i.kind))].sort(), [items]);
  const shown = kind ? items.filter((i) => i.kind === kind) : items;

  async function restore(item: Item) {
    setBusy(item.id);
    try {
      const res = await api.trash.restore(item.id);
      toast(`Restored “${item.label}”`);
      // Anything that could not come back exactly as it was is worth reading.
      if (res.notes.length) {
        await confirm({
          title: 'Restored, with a note',
          message: 'It is back, but not everything could be put back exactly as it was:',
          items: res.notes,
          confirmLabel: 'OK',
          cancelLabel: 'Close',
        });
      }
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Restore failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function purge(item: Item) {
    const ok = await confirm({
      title: `Delete “${item.label}” forever?`,
      message: (
        <>
          This <b>cannot be undone</b>. It will be erased permanently
          {item.detail ? ', together with everything that was deleted with it:' : '.'}
        </>
      ),
      items: item.detail ? item.detail.split(', ') : undefined,
      confirmLabel: 'Delete forever',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(item.id);
    try {
      await api.trash.purge(item.id);
      toast('Deleted forever');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) {
    return <EmptyState title="Trash is empty" body="Anything you delete in the admin comes here first, so it can be restored." />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="!w-auto !py-2 text-[13px]" aria-label="Type">
          <option value="">Everything ({items.length})</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {k} ({items.filter((i) => i.kind === k).length})
            </option>
          ))}
        </Select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Type</Th>
            <Th>Deleted</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((item) => (
            <tr key={item.id} data-trash-id={item.id}>
              <Td>
                <span className="block font-semibold">{item.label}</span>
                {item.detail && <span className="mt-0.5 block text-[12.5px] text-[#8A8C93]">With it: {item.detail}</span>}
              </Td>
              <Td>
                <Badge>{item.kind}</Badge>
              </Td>
              <Td className="whitespace-nowrap text-[13px] text-[#55575E]">
                {formatDateTime(item.deletedAt)}
                {item.deletedByName && <span className="block text-[12px] text-[#8A8C93]">by {item.deletedByName}</span>}
              </Td>
              <Td className="text-right">
                <span className="inline-flex gap-2 whitespace-nowrap">
                  <Button size="sm" variant="ink" onClick={() => restore(item)} disabled={busy !== null}>
                    {busy === item.id ? 'Working…' : 'Restore'}
                  </Button>
                  {canPurge && (
                    <Button size="sm" variant="danger" onClick={() => purge(item)} disabled={busy !== null}>
                      Delete forever
                    </Button>
                  )}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
