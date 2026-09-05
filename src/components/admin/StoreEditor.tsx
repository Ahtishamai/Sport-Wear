'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, isSessionExpired } from '@/lib/admin-client';
import { slugify } from '@/lib/utils';
import {
  AdminPage,
  Button,
  Card,
  Checkbox as UiCheckbox,
  ConfirmButton,
  Field,
  Input as UiInput,
  Select as UiSelect,
  Textarea as UiTextarea,
  useToast,
} from './ui';
import { MediaPicker } from './MediaPicker';

export type EditableCategory = {
  id?: string;
  name: string;
  position: number;
  /** Set for rows added in this session, so designs can point at them before
   *  they have a database id. */
  tempId: string;
};

export type EditableStoreItem = {
  id?: string;
  name: string;
  /** Either a saved category id, or the tempId of one added in this session. */
  categoryKey: string;
  category: string;
  description: string;
  price: number | string;
  images: { url: string; alt?: string }[];
  sizes: string[];
  options: { name: string; values: string[] }[];
  allowName: boolean;
  namePrice: number | string;
  allowNumber: boolean;
  numberPrice: number | string;
  position: number;
  status: string;
};

export type EditableStore = {
  id?: string;
  slug: string;
  name: string;
  intro: string;
  logoUrl: string;
  heroUrl: string;
  status: string;
  opensAt: string;
  closesAt: string;
  shipNote: string;
  contactNote: string;
  seoTitle: string;
  seoDescription: string;
  categories: EditableCategory[];
  items: EditableStoreItem[];
};


/* The shared kit pairs a bare <Field> with a native control. These wrappers keep
   the call sites below to label + value + onChange. */

function Input({
  label,
  value,
  onChange,
  help,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} help={help}>
      <UiInput
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  help?: string;
}) {
  return (
    <Field label={label} help={help}>
      <UiTextarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  help?: string;
}) {
  return (
    <Field label={label} help={help}>
      <UiSelect value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </UiSelect>
    </Field>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return <UiCheckbox label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}

type TabKey = 'store' | 'sections' | 'designs';

function Tabs({
  tab,
  onChange,
  counts,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  counts: { sections: number; designs: number };
}) {
  const items: { key: TabKey; label: string; count?: number }[] = [
    { key: 'store', label: 'Store details' },
    { key: 'sections', label: 'Sections', count: counts.sections },
    { key: 'designs', label: 'Designs', count: counts.designs },
  ];

  return (
    <div role="tablist" className="mb-5 flex gap-1 border-b border-[#E3E3DF]">
      {items.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={
              'relative -mb-px border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ' +
              (active
                ? 'border-ink text-ink'
                : 'border-transparent text-[#8A8C93] hover:text-ink')
            }
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={
                  'ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold ' +
                  (active ? 'bg-ink text-white' : 'bg-[#EFEFEC] text-[#6B6D74]')
                }
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const DEFAULT_SIZES = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const blankItem = (position: number, categoryKey: string): EditableStoreItem => ({
  name: '',
  categoryKey,
  category: '',
  description: '',
  price: 0,
  images: [],
  sizes: [...DEFAULT_SIZES],
  options: [],
  allowName: true,
  namePrice: 0,
  allowNumber: true,
  numberPrice: 0,
  position,
  status: 'PUBLISHED',
});

export function StoreEditor({ store }: { store: EditableStore }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !store.id;

  const [f, setF] = useState<EditableStore>(store);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // A save that failed only because the sign-in lapsed is worth telling
  // apart: the work is still on screen and one sign-in brings it back.
  const [expired, setExpired] = useState(false);
  const [picking, setPicking] = useState<{ kind: 'logo' | 'hero' | 'item'; index?: number } | null>(
    null
  );
  // Everything used to sit on one long page. Edits live in `f`, so moving
  // between tabs keeps unsaved work and Save still writes all of it.
  const [tab, setTab] = useState<TabKey>('store');
  // Which design is expanded. One at a time: the point is to stop the page
  // being a wall of open forms.
  const [openDesign, setOpenDesign] = useState<number | null>(null);

  const set = <K extends keyof EditableStore>(key: K, value: EditableStore[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const newKey = () => 'new-' + Math.random().toString(36).slice(2, 9);

  const setCategory = (index: number, patch: Partial<EditableCategory>) =>
    setF((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const moveCategory = (index: number, dir: -1 | 1) =>
    setF((prev) => {
      const next = [...prev.categories];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, categories: next };
    });

  async function removeCategory(index: number) {
    const cat = f.categories[index];
    const used = f.items.filter((i) => i.categoryKey === cat.tempId).length;
    if (used > 0) {
      toast(`Move or remove the ${used} design(s) in “${cat.name}” first.`, 'error');
      return;
    }
    if (cat.id && !window.confirm(`Delete the “${cat.name}” section?`)) return;
    if (cat.id) {
      try {
        await api.remove('storeCategories', cat.id);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Delete failed', 'error');
        return;
      }
    }
    setF((prev) => ({ ...prev, categories: prev.categories.filter((_, i) => i !== index) }));
  }

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= f.items.length) return;
    // Follow the design that was open, so reordering does not expand a
    // different one under the cursor.
    setOpenDesign((cur) => (cur === index ? target : cur === target ? index : cur));
    setF((prev) => {
      const next = [...prev.items];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, items: next };
    });
  };

  /** Insert a fresh design straight after this one and open it, so a long
   *  list can be worked through without returning to the top. */
  const addDesignBelow = (index: number) => {
    setF((prev) => {
      const next = [...prev.items];
      next.splice(index + 1, 0, blankItem(index + 1, prev.items[index]?.categoryKey || prev.categories[0]?.tempId || ''));
      return { ...prev, items: next };
    });
    setOpenDesign(index + 1);
  };

  const setItem = (index: number, patch: Partial<EditableStoreItem>) =>
    setF((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));

  async function save() {
    setBusy(true);
    setError('');
    setExpired(false);
    try {
      const slug = (f.slug || slugify(f.name)).trim();
      if (!f.name.trim()) throw new Error('Give the store a team name.');
      if (!slug) throw new Error('Give the store a web address.');

      const payload = {
        slug,
        name: f.name,
        intro: f.intro,
        logoUrl: f.logoUrl,
        heroUrl: f.heroUrl,
        status: f.status,
        opensAt: f.opensAt || null,
        closesAt: f.closesAt || null,
        shipNote: f.shipNote,
        contactNote: f.contactNote,
        seoTitle: f.seoTitle,
        seoDescription: f.seoDescription,
      };

      const saved = isNew
        ? ((await api.create('stores', payload)) as { item: { id: string; slug: string } })
        : ((await api.update('stores', f.id!, payload)) as { item: { id: string; slug: string } });

      const storeId = saved.item.id;

      // Categories are saved first so every design has a real id to point at.
      const categoryIds = new Map<string, string>();
      const savedCategories: EditableCategory[] = [];
      for (const [i, cat] of f.categories.entries()) {
        if (!cat.name.trim()) continue;
        const body = { storeId, name: cat.name.trim(), position: i };
        const row = cat.id
          ? ((await api.update('storeCategories', cat.id, body)) as { item: { id: string } })
          : ((await api.create('storeCategories', body)) as { item: { id: string } });
        categoryIds.set(cat.tempId, row.item.id);
        savedCategories.push({ ...cat, id: row.item.id, tempId: row.item.id, position: i });
      }

      // Items are saved one by one against the generic resource endpoint.
      const savedItems: EditableStoreItem[] = [];
      for (const [i, item] of f.items.entries()) {
        const categoryId = categoryIds.get(item.categoryKey) ?? null;
        const body = {
          storeId,
          categoryId,
          name: item.name,
          category:
            f.categories.find((c) => c.tempId === item.categoryKey)?.name.trim() || 'Other',
          description: item.description,
          price: item.price,
          images: item.images,
          sizes: item.sizes,
          options: item.options,
          allowName: item.allowName,
          namePrice: item.namePrice,
          allowNumber: item.allowNumber,
          numberPrice: item.numberPrice,
          position: i,
          status: item.status,
        };
        if (!item.name.trim()) continue;
        const row = item.id
          ? ((await api.update('storeItems', item.id, body)) as { item: { id: string } })
          : ((await api.create('storeItems', body)) as { item: { id: string } });
        savedItems.push({
          ...item,
          id: row.item.id,
          categoryKey: categoryId ?? '',
          position: i,
        });
      }

      // Write the new ids straight back into the form. Without this a second
      // Save saw every design as new again and created a fresh copy of the
      // whole store — the page reloads to the same URL, so this component is
      // not remounted and would otherwise keep the id-less state forever.
      setF((prev) => ({
        ...prev,
        id: storeId,
        slug: saved.item.slug,
        categories: savedCategories,
        items: savedItems,
      }));

      toast(isNew ? 'Store created' : 'Store saved');
      // Only navigate when the address actually changed. Pushing the same URL
      // scrolls back to the top, which undoes the point of a Save button next
      // to the design being edited.
      if (saved.item.slug !== store.slug) {
        router.push(`/admin/stores/${saved.item.slug}`);
      }
      router.refresh();
    } catch (e) {
      setExpired(isSessionExpired(e));
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!f.id) return;
    try {
      await api.remove('stores', f.id);
      toast('Store deleted');
      router.push('/admin/stores');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  async function removeItem(index: number) {
    const item = f.items[index];
    if (item.id && !window.confirm(`Delete “${item.name}” from this store?`)) return;
    if (item.id) {
      try {
        await api.remove('storeItems', item.id);
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Delete failed', 'error');
        return;
      }
    }
    setOpenDesign((cur) => (cur === index ? null : cur !== null && cur > index ? cur - 1 : cur));
    setF((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  return (
    <AdminPage
      title={isNew ? 'New team store' : f.name || 'Team store'}
      back={{ href: '/admin/stores', label: 'All stores' }}
      description={
        isNew
          ? 'A self-contained shop at its own web address, with its own designs and checkout.'
          : `Live at /${f.slug}`
      }
      actions={
        <>
          {!isNew && (
            <Link
              href={`/${f.slug}`}
              target="_blank"
              className="rounded-[2px] border border-[#D6D6D1] px-4 py-2.5 text-[13px] font-semibold hover:border-ink"
            >
              View store
            </Link>
          )}
          {!isNew && (
            <ConfirmButton onConfirm={destroy} message="Delete this store and all its designs?">
              Delete
            </ConfirmButton>
          )}
          <Button variant="yellow" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create store' : 'Save store'}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]">
          {error}
          {expired && (
            <a
              href="/admin/login"
              target="_blank"
              rel="noopener"
              className="ml-2 font-semibold underline"
            >
              Sign in again
            </a>
          )}
        </p>
      )}

      <Tabs
        tab={tab}
        onChange={setTab}
        counts={{ sections: f.categories.length, designs: f.items.length }}
      />

      {tab === 'store' && (
        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
          <div className="space-y-5">
          <Card title="The team">
            <div className="grid gap-4">
              <Input
                label="Team name"
                value={f.name}
                onChange={(v) => {
                  set('name', v);
                  if (isNew) set('slug', slugify(v));
                }}
                placeholder="Mid Illini Bandits"
              />
              <Input
                label="Web address"
                value={f.slug}
                onChange={(v) => set('slug', slugify(v))}
                help={`The store will be at /${f.slug || 'team-name'}`}
              />
              <Textarea
                label="Intro"
                rows={3}
                value={f.intro}
                onChange={(v) => set('intro', v)}
                help="Shown under the team name at the top of the store."
              />
            </div>
          </Card>
          </div>

        <div className="space-y-5">
          <Card title="Availability">
            <div className="grid gap-4">
              <Select
                label="Status"
                value={f.status}
                onChange={(v) => set('status', v)}
                options={[
                  { label: 'Draft — hidden', value: 'DRAFT' },
                  { label: 'Open — taking orders', value: 'OPEN' },
                  { label: 'Closed — visible, no ordering', value: 'CLOSED' },
                ]}
              />
              <Input
                label="Opens"
                type="datetime-local"
                value={f.opensAt}
                onChange={(v) => set('opensAt', v)}
                help="Optional, US Eastern. Before this, the store shows as not yet open."
              />
              <Input
                label="Closes"
                type="datetime-local"
                value={f.closesAt}
                onChange={(v) => set('closesAt', v)}
                help="Optional, US Eastern. The storefront counts down to it, then ordering stops."
              />
            </div>
          </Card>

          <Card title="Artwork">
            <ImageField
              label="Team logo"
              value={f.logoUrl}
              onPick={() => setPicking({ kind: 'logo' })}
              onClear={() => set('logoUrl', '')}
            />
            <div className="mt-4">
              <ImageField
                label="Banner photo"
                value={f.heroUrl}
                onPick={() => setPicking({ kind: 'hero' })}
                onClear={() => set('heroUrl', '')}
              />
            </div>
          </Card>

          <Card title="Notes for shoppers">
            <div className="grid gap-4">
              <Textarea
                label="Shipping / collection note"
                rows={3}
                value={f.shipNote}
                onChange={(v) => set('shipNote', v)}
              />
              <Textarea
                label="Contact note"
                rows={2}
                value={f.contactNote}
                onChange={(v) => set('contactNote', v)}
              />
            </div>
          </Card>

          <Card title="Search listing">
            <div className="grid gap-4">
              <Input label="SEO title" value={f.seoTitle} onChange={(v) => set('seoTitle', v)} />
              <Textarea
                label="SEO description"
                rows={2}
                value={f.seoDescription}
                onChange={(v) => set('seoDescription', v)}
              />
            </div>
          </Card>
          </div>
        </div>
      )}

      {tab === 'sections' && (
        <div className="max-w-[780px]">
          <Card
            title="Sections"
            description="The tabs down the store page. Designs are added under one of these."
            actions={
              <Button
                variant="ink"
                size="sm"
                onClick={() =>
                  setF((prev) => ({
                    ...prev,
                    categories: [
                      ...prev.categories,
                      { name: '', position: prev.categories.length, tempId: newKey() },
                    ],
                  }))
                }
              >
                + Add a section
              </Button>
            }
          >
            {f.categories.length === 0 ? (
              <p className="py-5 text-center text-[14px] text-[#8A8C93]">
                No sections yet. Add Shirts, Pants, Hoodies — whatever this team is ordering.
              </p>
            ) : (
              <ul className="space-y-2">
                {f.categories.map((cat, i) => (
                  <li key={cat.tempId} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-[12px] font-bold text-[#8A8C93]">
                      {i + 1}.
                    </span>
                    <input
                      className="field !py-2 text-[14px]"
                      placeholder="Shirts"
                      value={cat.name}
                      onChange={(e) => setCategory(i, { name: e.target.value })}
                    />
                    <span className="shrink-0 text-[12px] text-[#8A8C93]">
                      {f.items.filter((it) => it.categoryKey === cat.tempId).length}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => moveCategory(i, -1)} disabled={i === 0}>
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveCategory(i, 1)}
                      disabled={i === f.categories.length - 1}
                    >
                      ↓
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeCategory(i)}
                      className="shrink-0 text-[12px] font-semibold text-[#C42027] hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'designs' && (
        <div>
          <Card
            title="Designs"
            actions={
              <Button
                variant="ink"
                size="sm"
                disabled={f.categories.length === 0}
                onClick={() => {
                  setOpenDesign(f.items.length);
                  setF((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      blankItem(prev.items.length, prev.categories[0]?.tempId ?? ''),
                    ],
                  }));
                }}
              >
                + Add a design
              </Button>
            }
          >
            {f.categories.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[#8A8C93]">
                Add a section first — designs live under one.
              </p>
            ) : f.items.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[#8A8C93]">
                No designs yet. Add a shirt, pants or anything else this team can order.
              </p>
            ) : (
              <div className="space-y-2">
                {f.items.map((item, i) => (
                  <ItemFields
                    key={item.id ?? `new-${i}`}
                    item={item}
                    categories={f.categories}
                    position={i}
                    total={f.items.length}
                    onChange={(patch) => setItem(i, patch)}
                    onRemove={() => removeItem(i)}
                    onMove={(dir) => moveItem(i, dir)}
                    onPickImage={() => setPicking({ kind: 'item', index: i })}
                    open={openDesign === i}
                    onToggle={() => setOpenDesign((cur) => (cur === i ? null : i))}
                    onSave={save}
                    onAddBelow={() => addDesignBelow(i)}
                    saving={busy}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

            <MediaPicker
        open={picking !== null}
        folder="stores"
        onClose={() => setPicking(null)}
        onPick={(m) => {
          if (!picking) return;
          if (picking.kind === 'logo') set('logoUrl', m.url);
          else if (picking.kind === 'hero') set('heroUrl', m.url);
          else if (picking.index !== undefined) {
            const item = f.items[picking.index];
            setItem(picking.index, {
              images: [...item.images, { url: m.url, alt: '' }],
            });
          }
          setPicking(null);
        }}
      />
    </AdminPage>
  );
}

function ImageField({
  label,
  value,
  onPick,
  onClear,
}: {
  label: string;
  value: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-3">
        <span className="relative block h-[56px] w-[56px] shrink-0 border border-[#E3E3DF] bg-[#F0F0ED]">
          {value ? <Image src={value} alt="" fill sizes="56px" className="object-contain" /> : null}
        </span>
        <Button variant="ghost" size="sm" onClick={onPick}>
          {value ? 'Replace' : 'Choose'}
        </Button>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-semibold text-[#C42027] hover:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function ItemFields({
  item,
  categories,
  position,
  total,
  onChange,
  onRemove,
  onMove,
  onPickImage,
  open,
  onToggle,
  onSave,
  onAddBelow,
  saving,
}: {
  item: EditableStoreItem;
  categories: EditableCategory[];
  position: number;
  total: number;
  onChange: (patch: Partial<EditableStoreItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onPickImage: () => void;
  open: boolean;
  onToggle: () => void;
  onSave: () => void;
  onAddBelow: () => void;
  saving: boolean;
}) {
  const section = categories.find((c) => c.tempId === item.categoryKey)?.name || 'no section';

  return (
    <div className="border border-[#E3E3DF]">
      {/* Collapsed, a design is one summary row. A store with twenty designs
          was otherwise an unreadable wall of open forms. */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="w-5 shrink-0 text-[12px] text-[#8A8C93]">{open ? '▾' : '▸'}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">
              {position + 1}. {item.name || 'Untitled design'}
            </span>
            <span className="mt-0.5 block text-[12px] text-[#8A8C93]">
              {section} · ${Number(item.price) || 0}
              {item.status !== 'PUBLISHED' && ' · Draft'}
            </span>
          </span>
        </button>

        <span className="flex shrink-0 gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={position === 0}>
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(1)}
            disabled={position === total - 1}
          >
            ↓
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {open ? 'Close' : 'Edit'}
          </Button>
        </span>
      </div>

      {!open ? null : (
      <div className="border-t border-[#EFEFEC] p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Design name" value={item.name} onChange={(v) => onChange({ name: v })} />
        <Select
          label="Section"
          value={item.categoryKey}
          onChange={(v) => onChange({ categoryKey: v })}
          options={categories.map((c) => ({
            label: c.name || 'Untitled section',
            value: c.tempId,
          }))}
          help="This design shows only under this section."
        />
      </div>

      <div className="mt-4">
        <Textarea
          label="Description"
          rows={2}
          value={item.description}
          onChange={(v) => onChange({ description: v })}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Input
          label="Price ($)"
          type="number"
          value={String(item.price)}
          onChange={(v) => onChange({ price: v })}
        />
        <Input
          label="Name charge ($)"
          type="number"
          value={String(item.namePrice)}
          onChange={(v) => onChange({ namePrice: v })}
        />
        <Input
          label="Number charge ($)"
          type="number"
          value={String(item.numberPrice)}
          onChange={(v) => onChange({ numberPrice: v })}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-5">
        <Checkbox
          label="Can add a name"
          checked={item.allowName}
          onChange={(v) => onChange({ allowName: v })}
        />
        <Checkbox
          label="Can add a number"
          checked={item.allowNumber}
          onChange={(v) => onChange({ allowNumber: v })}
        />
      </div>

      <div className="mt-4">
        <span className="field-label">Sizes offered</span>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_SIZES.map((s) => {
            const on = item.sizes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() =>
                  onChange({
                    sizes: on ? item.sizes.filter((x) => x !== s) : [...item.sizes, s],
                  })
                }
                className={
                  'rounded-[2px] border px-2.5 py-1 text-[12px] font-semibold transition-colors ' +
                  (on ? 'border-ink bg-ink text-white' : 'border-[#D6D6D1] bg-white hover:border-ink')
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <OptionEditor
        options={item.options}
        onChange={(options) => onChange({ options })}
      />

      <div className="mt-4">
        <span className="field-label">Design photos</span>
        <div className="flex flex-wrap items-start gap-3">
          {item.images.map((img, idx) => (
            <div key={`${img.url}-${idx}`} className="w-[104px]">
              <span className="relative block h-[104px] w-[104px] border border-[#E3E3DF] bg-[#F0F0ED]">
                <Image src={img.url} alt="" fill sizes="104px" className="object-cover" />
              </span>
              <input
                className="field mt-1 !py-1 text-[11px]"
                placeholder="Design label"
                value={img.alt ?? ''}
                onChange={(e) =>
                  onChange({
                    images: item.images.map((x, i) =>
                      i === idx ? { ...x, alt: e.target.value } : x
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() => onChange({ images: item.images.filter((_, i) => i !== idx) })}
                className="mt-1 text-[11px] font-semibold text-[#C42027] hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={onPickImage}>
            + Add photo
          </Button>
        </div>
        <p className="mt-2 text-[12px] text-[#8A8C93]">
          Give a photo the same label as a design option value and the store swaps to it when that
          option is picked.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-[#EFEFEC] pt-3">
        <Select
          label="Status"
          value={item.status}
          onChange={(v) => onChange({ status: v })}
          options={[
            { label: 'Published', value: 'PUBLISHED' },
            { label: 'Draft', value: 'DRAFT' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRemove}
            className="mr-1 text-[12px] font-semibold text-[#C42027] hover:underline"
          >
            Remove this design
          </button>
          <Button variant="ghost" size="sm" onClick={onAddBelow}>
            + Add another design
          </Button>
          <Button variant="yellow" size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save store'}
          </Button>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

/** Design / colourway choices, e.g. Design: Home, Away, Alternate. */
function OptionEditor({
  options,
  onChange,
}: {
  options: { name: string; values: string[] }[];
  onChange: (next: { name: string; values: string[] }[]) => void;
}) {
  return (
    <div className="mt-4">
      <span className="field-label">Choices the buyer makes</span>
      {options.map((opt, i) => (
        <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input
            className="field !py-2 text-[13px]"
            placeholder="Design"
            value={opt.name}
            onChange={(e) =>
              onChange(options.map((o, x) => (x === i ? { ...o, name: e.target.value } : o)))
            }
          />
          <input
            className="field !py-2 text-[13px]"
            placeholder="Home, Away, Alternate"
            value={opt.values.join(', ')}
            onChange={(e) =>
              onChange(
                options.map((o, x) =>
                  x === i
                    ? { ...o, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }
                    : o
                )
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, x) => x !== i))}
            className="text-[12px] font-semibold text-[#C42027] hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([...options, { name: '', values: [] }])}
      >
        + Add a choice
      </Button>
    </div>
  );
}

