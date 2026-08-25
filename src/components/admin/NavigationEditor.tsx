'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { Button, Card, Checkbox, Input, useToast } from './ui';
import { Icon } from '@/components/site/Icon';

type NavRow = { id: string; menu: string; label: string; href: string; position: number; newTab: boolean };
type Item = { label: string; href: string; newTab: boolean };

const MENUS = [
  { key: 'header', title: 'Header menu', description: 'The main navigation next to the logo.' },
  { key: 'footer_shop', title: 'Footer — Shop', description: 'First footer link column.' },
  { key: 'footer_company', title: 'Footer — Company', description: 'Second footer link column.' },
];

export function NavigationEditor({
  items,
  suggestions,
}: {
  items: NavRow[];
  suggestions: { label: string; href: string }[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
      {MENUS.map((m) => (
        <MenuEditor
          key={m.key}
          menu={m.key}
          title={m.title}
          description={m.description}
          initial={items
            .filter((i) => i.menu === m.key)
            .map((i) => ({ label: i.label, href: i.href, newTab: i.newTab }))}
          suggestions={suggestions}
        />
      ))}
    </div>
  );
}

function MenuEditor({
  menu,
  title,
  description,
  initial,
  suggestions,
}: {
  menu: string;
  title: string;
  description: string;
  initial: Item[];
  suggestions: { label: string; href: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Item[]>(initial);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function mutate(next: Item[]) {
    setRows(next);
    setDirty(true);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    mutate(next);
  }

  async function save() {
    setBusy(true);
    try {
      await api.replaceNav(
        menu,
        rows.filter((r) => r.label.trim() && r.href.trim())
      );
      toast(`${title} saved`);
      setDirty(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={title} description={description}>
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="border border-[#E3E3DF] p-2.5">
            <div className="flex items-center gap-1.5">
              <Input
                value={r.label}
                onChange={(e) => mutate(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Label"
                className="!py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="px-1 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
                aria-label="Move down"
                className="px-1 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-25"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => mutate(rows.filter((_, j) => j !== i))}
                aria-label="Remove link"
                className="px-1 text-[#8A8C93] hover:text-[#C42027]"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
            <Input
              value={r.href}
              onChange={(e) => mutate(rows.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}
              placeholder="/collections"
              list={`nav-suggestions-${menu}`}
              className="mt-1.5 !py-1.5 text-[12px]"
            />
            <div className="mt-1.5">
              <Checkbox
                label="Open in a new tab"
                checked={r.newTab}
                onChange={(e) => mutate(rows.map((x, j) => (j === i ? { ...x, newTab: e.target.checked } : x)))}
              />
            </div>
          </li>
        ))}
      </ol>

      <datalist id={`nav-suggestions-${menu}`}>
        {suggestions.map((s) => (
          <option key={s.href} value={s.href}>
            {s.label}
          </option>
        ))}
      </datalist>

      {rows.length === 0 && <p className="text-[13px] text-[#8A8C93]">No links in this menu.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => mutate([...rows, { label: '', href: '', newTab: false }])}
        >
          + Add link
        </Button>
        <Button size="sm" variant="yellow" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : dirty ? 'Save menu' : 'Saved'}
        </Button>
      </div>
    </Card>
  );
}
