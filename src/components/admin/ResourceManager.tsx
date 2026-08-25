'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Field } from '@/lib/blocks/types';
import { emptyRow } from '@/lib/blocks/types';
import { api } from '@/lib/admin-client';
import { Button, Card, EmptyState, Input, useToast } from './ui';
import { FieldSet } from './BlockFields';
import { Icon } from '@/components/site/Icon';
import { cn } from '@/lib/utils';

type Row = Record<string, any> & { id: string };

/**
 * List + inline form for the simpler admin objects (packages, reviews, FAQs,
 * users). The form is generated from the same field schema the page builder
 * uses, so every object is editable without bespoke screens.
 */
export function ResourceManager({
  resource,
  fields,
  title,
  description,
  singularLabel,
  rowTitle,
  rowMeta,
  searchable = true,
  extraPayload,
}: {
  resource: string;
  fields: Field[];
  title: string;
  description?: string;
  singularLabel: string;
  rowTitle: (r: Row) => string;
  rowMeta?: (r: Row) => string;
  searchable?: boolean;
  extraPayload?: Record<string, unknown>;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list<Row>(resource, { q: q || undefined, take: 300 });
      setRows(res.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load', 'error');
    } finally {
      setLoading(false);
    }
  }, [resource, q, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    const base = emptyRow(fields);
    base.position = rows.length;
    setDraft(base);
    setEditing('new');
  }

  function startEdit(r: Row) {
    const base: Record<string, any> = {};
    for (const f of fields) base[f.name] = r[f.name] ?? emptyRow([f])[f.name];
    setDraft(base);
    setEditing(r.id);
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const payload = { ...draft, ...extraPayload };
      if (editing === 'new') await api.create(resource, payload);
      else await api.update(resource, editing!, payload);
      toast(`${singularLabel} saved`);
      setEditing(null);
      setDraft(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Delete this ${singularLabel.toLowerCase()}?`)) return;
    try {
      await api.remove(resource, id);
      toast(`${singularLabel} deleted`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    setRows(next);
    try {
      await api.reorder(
        resource,
        next.map((r, i) => ({ id: r.id, position: i }))
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Reorder failed', 'error');
      await load();
    }
  }

  return (
    <Card
      title={title}
      description={description}
      className="!p-0"
      actions={
        <div className="flex items-center gap-2">
          {searchable && (
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="!py-2 text-[13px]"
            />
          )}
          <Button variant="ink" size="sm" onClick={startNew}>
            + New {singularLabel.toLowerCase()}
          </Button>
        </div>
      }
    >
      {editing === 'new' && draft && (
        <div className="border-b border-[#E3E3DF] bg-[#FAFAF8] p-5">
          <h3 className="mb-4 font-display text-[13px] font-extrabold uppercase tracking-[.12em]">
            New {singularLabel.toLowerCase()}
          </h3>
          <FieldSet fields={fields} values={draft} onChange={setDraft} />
          <div className="mt-5 flex gap-2">
            <Button variant="yellow" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Create'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDraft(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-[13px] text-[#8A8C93]">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            body={`Create your first ${singularLabel.toLowerCase()} to see it on the site.`}
            action={
              <Button variant="ink" onClick={startNew}>
                + New {singularLabel.toLowerCase()}
              </Button>
            }
          />
        </div>
      ) : (
        <ol>
          {rows.map((r, i) => (
            <li key={r.id} className="border-b border-[#EFEFEC] last:border-0">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-5 py-3',
                  editing === r.id && 'bg-brand-tint'
                )}
              >
                <button
                  type="button"
                  onClick={() => (editing === r.id ? setEditing(null) : startEdit(r))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[14px] font-semibold">{rowTitle(r)}</span>
                  {rowMeta && (
                    <span className="block truncate text-[12px] text-[#8A8C93]">{rowMeta(r)}</span>
                  )}
                </button>
                {'position' in r && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="px-1.5 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-25"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      aria-label="Move down"
                      className="px-1.5 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-25"
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  aria-label="Delete"
                  className="px-1.5 text-[#8A8C93] hover:text-[#C42027]"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>

              {editing === r.id && draft && (
                <div className="border-t border-[#EFEFEC] bg-[#FAFAF8] p-5">
                  <FieldSet fields={fields} values={draft} onChange={setDraft} />
                  <div className="mt-5 flex gap-2">
                    <Button variant="yellow" onClick={save} disabled={busy}>
                      {busy ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(null);
                        setDraft(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
