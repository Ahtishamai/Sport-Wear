'use client';

import { useEffect, useState } from 'react';
import type { Field } from '@/lib/blocks/types';
import { emptyRow } from '@/lib/blocks/types';
import { ICON_CHOICES } from '@/lib/blocks/registry';
import { api } from '@/lib/admin-client';
import { Button, Checkbox, Input, Select, Textarea } from './ui';
import { ImageField } from './MediaPicker';
import { Icon } from '@/components/site/Icon';
import { cn } from '@/lib/utils';

type Values = Record<string, any>;

export function FieldSet({
  fields,
  values,
  onChange,
  depth = 0,
}: {
  fields: Field[];
  values: Values;
  onChange: (next: Values) => void;
  depth?: number;
}) {
  const visible = fields.filter((f) => {
    if (!f.showIf) return true;
    return f.showIf.equals.includes(values[f.showIf.field]);
  });

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
      {visible.map((f) => (
        <div key={f.name} className={f.width === 'half' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
          <FieldControl
            field={f}
            value={values[f.name]}
            onChange={(v) => onChange({ ...values, [f.name]: v })}
            depth={depth}
          />
        </div>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  depth,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  depth: number;
}) {
  const id = `f-${field.name}-${depth}`;

  const label = (
    <label htmlFor={id} className="field-label">
      {field.label}
    </label>
  );

  const help = field.help ? <p className="mt-1.5 text-[12px] text-[#8A8C93]">{field.help}</p> : null;

  switch (field.type) {
    case 'textarea':
      return (
        <div>
          {label}
          <Textarea
            id={id}
            rows={field.rows ?? 4}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );

    case 'number':
      return (
        <div>
          {label}
          <Input
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value ?? 0}
            onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          />
          {help}
        </div>
      );

    case 'boolean':
      return (
        <div className="pt-5">
          <Checkbox
            label={field.label}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {help}
        </div>
      );

    // A fixed set of values, several of which can be on at once — used for
    // per-user permissions, where free text would let a typo silently grant
    // or withhold access.
    case 'checklist': {
      const chosen: string[] = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string) =>
        onChange(chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v]);
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {(field.options ?? []).map((o) => (
              <Checkbox
                key={o.value}
                label={o.label}
                checked={chosen.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
            ))}
          </div>
          {help}
        </div>
      );
    }

    case 'select':
      return (
        <div>
          {label}
          <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {help}
        </div>
      );

    case 'color':
      return (
        <div>
          {label}
          <div className="flex gap-2">
            <input
              type="color"
              value={value || '#101114'}
              onChange={(e) => onChange(e.target.value)}
              className="h-[46px] w-[52px] cursor-pointer border border-[#D8D8D3] bg-white p-1"
              aria-label={field.label}
            />
            <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          </div>
          {help}
        </div>
      );

    case 'image':
      return (
        <div>
          {label}
          <ImageField value={value ?? ''} onChange={onChange} />
          {help}
        </div>
      );

    case 'icon':
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1.5">
            {ICON_CHOICES.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={value === name}
                onClick={() => onChange(name)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center border transition-colors',
                  value === name
                    ? 'border-ink bg-brand text-ink'
                    : 'border-[#E3E3DF] bg-white text-[#6B6D74] hover:border-ink'
                )}
              >
                <Icon name={name} size={17} />
              </button>
            ))}
          </div>
          {help}
        </div>
      );

    case 'tags':
      return (
        <div>
          {label}
          <TagsInput value={Array.isArray(value) ? value : []} onChange={onChange} />
          {help}
        </div>
      );

    case 'list':
      return (
        <ListField
          field={field}
          rows={Array.isArray(value) ? value : []}
          onChange={onChange}
          depth={depth}
        />
      );

    case 'link':
      return (
        <div>
          {label}
          <LinkField id={id} value={value ?? ''} placeholder={field.placeholder} onChange={onChange} />
          {help}
        </div>
      );

    case 'text':
    default:
      return (
        <div>
          {label}
          <Input
            id={id}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {help}
        </div>
      );
  }
}

type Destination = { href: string; label: string; group: string };

/**
 * Where a link points, picked from the pages and collections that exist
 * rather than typed from memory — a card that points at a deleted collection
 * is a dead end nobody notices until a customer hits it.
 *
 * The box underneath always shows what is actually saved, so an address the
 * list does not offer (an outside link, an anchor) can still be typed.
 */
function LinkField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const [places, setPlaces] = useState<Destination[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cols, pages] = await Promise.all([
          api.list<{ handle: string; title: string; status: string }>('collections', { take: 200 }),
          api.list<{ slug: string; title: string; status: string }>('pages', { take: 200 }),
        ]);
        if (!alive) return;
        setPlaces([
          { href: '/', label: 'Home', group: 'Pages' },
          ...pages.items
            .filter((p) => p.slug !== 'home')
            .map((p) => ({
              href: `/${p.slug}`,
              label: p.title + (p.status === 'PUBLISHED' ? '' : ` (${p.status.toLowerCase()})`),
              group: 'Pages',
            })),
          { href: '/collections', label: 'All products', group: 'Collections' },
          ...cols.items.map((c) => ({
            href: `/collections/${c.handle}`,
            label: c.title + (c.status === 'PUBLISHED' ? '' : ` (${c.status.toLowerCase()})`),
            group: 'Collections',
          })),
        ]);
      } catch {
        if (alive) setPlaces([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const known = places?.some((p) => p.href === value);
  const groups = [...new Set((places ?? []).map((p) => p.group))];

  return (
    <div className="space-y-2">
      <Select
        value={known ? value : ''}
        disabled={!places || places.length === 0}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="">
          {!places
            ? 'Loading pages…'
            : value
              ? known
                ? 'Pick a different page…'
                : `Typed in: ${value}`
              : 'Pick a page…'}
        </option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {places!
              .filter((p) => p.group === g)
              .map((p) => (
                <option key={p.href} value={p.href}>
                  {p.label}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
      <Input
        id={id}
        value={value}
        placeholder={placeholder ?? '/collections/…'}
        onChange={(e) => onChange(e.target.value)}
      />
      {places && value && !known && (
        <p className="text-[12px] text-[#C42027]">
          No page or collection has this address — check it before saving.
        </p>
      )}
    </div>
  );
}

function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1.5 border border-[#E3E3DF] bg-[#F7F7F5] px-2 py-1 text-[12px]"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`Remove ${t}`}
              className="text-[#8A8C93] hover:text-ink"
            >
              <Icon name="close" size={11} />
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-[12px] text-[#9A9CA2]">No items yet</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type and press Enter"
          className="!py-2 text-[13px]"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

function ListField({
  field,
  rows,
  onChange,
  depth,
}: {
  field: Field;
  rows: Values[];
  onChange: (v: Values[]) => void;
  depth: number;
}) {
  const [open, setOpen] = useState<number | null>(rows.length === 1 ? 0 : null);
  const subFields = field.fields ?? [];
  const single = field.name === 'primary' || field.name === 'secondary' || field.name === 'cta';

  function set(i: number, next: Values) {
    onChange(rows.map((r, j) => (j === i ? next : r)));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(j);
  }

  const rowTitle = (r: Values, i: number) =>
    String(r.title || r.name || r.label || r.heading || r.year || r.question || r.days || `Item ${i + 1}`);

  return (
    <div>
      <span className="field-label">{field.label}</span>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="border border-[#E3E3DF] bg-white">
            {!single && (
              <div className="flex items-center gap-1 border-b border-[#EFEFEC] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold"
                >
                  <span className="mr-2 text-[#9A9CA2]">{i + 1}.</span>
                  {rowTitle(r, i)}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="p-1 text-[#8A8C93] hover:text-ink disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Move down"
                  className="p-1 text-[#8A8C93] hover:text-ink disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  aria-label="Remove"
                  className="p-1 text-[#8A8C93] hover:text-[#C42027]"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            )}
            {(single || open === i) && (
              <div className="p-3">
                <FieldSet
                  fields={subFields}
                  values={r}
                  onChange={(next) => set(i, next)}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {(!single || rows.length === 0) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => {
            onChange([...rows, emptyRow(subFields)]);
            setOpen(rows.length);
          }}
        >
          + Add {field.label.replace(/s$/, '').toLowerCase()}
        </Button>
      )}
    </div>
  );
}
