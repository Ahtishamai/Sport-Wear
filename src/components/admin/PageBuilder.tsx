'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BLOCK_GROUPS, BLOCKS, blockDef } from '@/lib/blocks/registry';
import { defaultsFor, newBlockId, type Block } from '@/lib/blocks/types';
import { api } from '@/lib/admin-client';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { Button, Input, Select, Textarea, useToast } from './ui';
import { FieldSet } from './BlockFields';

export type BuilderPage = {
  id: string;
  slug: string;
  title: string;
  blocks: unknown;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isSystem: boolean;
  showInNav: boolean;
  navLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
};

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '100%',
  tablet: '834px',
  mobile: '390px',
};

export function PageBuilder({ page }: { page: BuilderPage }) {
  const toast = useToast();
  const iframe = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);

  const [blocks, setBlocks] = useState<Block[]>(() =>
    Array.isArray(page.blocks) ? (page.blocks as Block[]) : []
  );
  const [meta, setMeta] = useState({
    title: page.title,
    slug: page.slug,
    status: page.status,
    showInNav: page.showInNav,
    navLabel: page.navLabel ?? '',
    seoTitle: page.seoTitle ?? '',
    seoDescription: page.seoDescription ?? '',
    ogImage: page.ogImage ?? '',
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<'outline' | 'add' | 'settings'>('outline');
  const [device, setDevice] = useState<Device>('desktop');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selected) ?? null,
    [blocks, selected]
  );

  // ---------------------------------------------------------- iframe sync
  const post = useCallback((msg: unknown) => {
    iframe.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (msg?.type === 'ds:ready') {
        iframeReady.current = true;
        post({ type: 'ds:blocks', blocks });
      }
      if (msg?.type === 'ds:selected') {
        setSelected(msg.id);
        setPanel('outline');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [blocks, post]);

  useEffect(() => {
    if (iframeReady.current) post({ type: 'ds:blocks', blocks });
  }, [blocks, post]);

  useEffect(() => {
    if (iframeReady.current) post({ type: 'ds:select', id: selected });
  }, [selected, post]);

  // ---------------------------------------------------------- guards
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // ---------------------------------------------------------- mutations
  function mutate(next: Block[]) {
    setBlocks(next);
    setDirty(true);
  }

  function addBlock(type: string, atIndex?: number) {
    const def = blockDef(type);
    if (!def) return;
    const block = defaultsFor(def);
    const next = [...blocks];
    next.splice(atIndex ?? next.length, 0, block);
    mutate(next);
    setSelected(block.id);
    setPanel('outline');
  }

  function updateProps(id: string, props: Record<string, unknown>) {
    mutate(blocks.map((b) => (b.id === id ? { ...b, props } : b)));
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    mutate(next);
  }

  function duplicate(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy: Block = { ...structuredClone(blocks[i]), id: newBlockId() };
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    mutate(next);
    setSelected(copy.id);
  }

  function remove(id: string) {
    mutate(blocks.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
  }

  function toggleHidden(id: string) {
    mutate(blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await api.update('pages', page.id, {
        blocks,
        title: meta.title,
        ...(page.isSystem ? {} : { slug: meta.slug }),
        status: meta.status,
        showInNav: meta.showInNav,
        navLabel: meta.navLabel || null,
        seoTitle: meta.seoTitle || null,
        seoDescription: meta.seoDescription || null,
        ogImage: meta.ogImage || null,
      });
      setDirty(false);
      toast('Page saved');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  const publicHref = page.slug === 'home' ? '/' : `/${meta.slug}`;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col lg:h-screen">
      {/* ----------------------------------------------------- top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E3DF] bg-white px-4 py-2.5">
        <Link
          href="/admin/pages"
          className="text-[13px] font-medium text-[#6B6D74] hover:text-ink"
        >
          ← Pages
        </Link>
        <span className="font-display text-[14px] font-extrabold uppercase tracking-[.06em]">
          {meta.title}
        </span>
        <span
          className={cn(
            'rounded-[2px] px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em]',
            meta.status === 'PUBLISHED'
              ? 'bg-[#E4F4EA] text-[#1F8A4C]'
              : 'bg-[#F0F0ED] text-[#55575E]'
          )}
        >
          {meta.status}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-0.5 rounded-[2px] border border-[#E3E3DF] p-0.5 md:flex">
            {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                className={cn(
                  'px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors',
                  device === d ? 'bg-ink text-white' : 'text-[#6B6D74] hover:text-ink'
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <Link
            href={publicHref}
            target="_blank"
            className="rounded-[2px] border border-[#D6D6D1] px-3 py-2 text-[12px] font-semibold hover:border-ink"
          >
            View live
          </Link>
          <Button variant="yellow" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* --------------------------------------------------- left panel */}
        <aside className="flex w-full shrink-0 flex-col border-r border-[#E3E3DF] bg-white lg:w-[380px]">
          <nav className="flex border-b border-[#E3E3DF]">
            {(
              [
                ['outline', 'Sections'],
                ['add', 'Add section'],
                ['settings', 'Page settings'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanel(key)}
                className={cn(
                  'flex-1 border-b-2 px-3 py-3 text-[12px] font-semibold transition-colors',
                  panel === key
                    ? 'border-brand text-ink'
                    : 'border-transparent text-[#6B6D74] hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {panel === 'add' && <BlockPalette onAdd={(t) => addBlock(t)} />}

            {panel === 'settings' && (
              <PageSettings
                meta={meta}
                isSystem={page.isSystem}
                onChange={(m) => {
                  setMeta(m);
                  setDirty(true);
                }}
              />
            )}

            {panel === 'outline' && (
              <div>
                <ol className="border-b border-[#E3E3DF]">
                  {blocks.map((b, i) => {
                    const def = blockDef(b.type);
                    const isSel = selected === b.id;
                    return (
                      <li key={b.id}>
                        <div
                          className={cn(
                            'flex items-center gap-1.5 border-b border-[#EFEFEC] px-3 py-2.5 transition-colors',
                            isSel ? 'bg-brand-tint' : 'hover:bg-[#FAFAF8]'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelected(isSel ? null : b.id)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            <span className="w-5 shrink-0 text-center text-[13px] text-[#9A9CA2]">
                              {def?.glyph ?? '▢'}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  'block truncate text-[13px] font-semibold',
                                  b.hidden && 'text-[#B4B5BA] line-through'
                                )}
                              >
                                {def?.label ?? b.type}
                              </span>
                              <span className="block truncate text-[11px] text-[#9A9CA2]">
                                {summarise(b)}
                              </span>
                            </span>
                          </button>
                          <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                            ↑
                          </IconBtn>
                          <IconBtn
                            label="Move down"
                            onClick={() => move(i, 1)}
                            disabled={i === blocks.length - 1}
                          >
                            ↓
                          </IconBtn>
                          <IconBtn label="Duplicate" onClick={() => duplicate(b.id)}>
                            ⧉
                          </IconBtn>
                          <IconBtn
                            label={b.hidden ? 'Show' : 'Hide'}
                            onClick={() => toggleHidden(b.id)}
                          >
                            {b.hidden ? '◌' : '◉'}
                          </IconBtn>
                          <IconBtn
                            label="Delete"
                            danger
                            onClick={() => {
                              if (window.confirm(`Remove the "${def?.label ?? b.type}" section?`)) {
                                remove(b.id);
                              }
                            }}
                          >
                            <Icon name="close" size={13} />
                          </IconBtn>
                        </div>

                        {isSel && selectedBlock && (
                          <div className="border-b border-[#E3E3DF] bg-[#FAFAF8] p-4">
                            <p className="mb-4 text-[12px] leading-relaxed text-[#6B6D74]">
                              {def?.description}
                            </p>
                            <FieldSet
                              fields={def?.fields ?? []}
                              values={selectedBlock.props as Record<string, any>}
                              onChange={(props) => updateProps(b.id, props)}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>

                {blocks.length === 0 && (
                  <p className="px-4 py-8 text-center text-[13px] text-[#8A8C93]">
                    No sections yet.
                  </p>
                )}

                <div className="p-3">
                  <Button variant="outline" className="w-full" onClick={() => setPanel('add')}>
                    + Add a section
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* --------------------------------------------------- preview */}
        <div className="min-h-0 flex-1 overflow-auto bg-[#E9E9E6] p-4">
          <div
            className="mx-auto h-full bg-white shadow-sm transition-[width] duration-200"
            style={{ width: DEVICE_WIDTH[device], maxWidth: '100%' }}
          >
            <iframe
              ref={iframe}
              src={`/admin/preview?slug=${encodeURIComponent(page.slug)}`}
              title="Page preview"
              className="h-full min-h-[560px] w-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] text-[12px] transition-colors disabled:opacity-25',
        danger ? 'text-[#8A8C93] hover:bg-[#FBE7E8] hover:text-[#C42027]' : 'text-[#8A8C93] hover:bg-[#EFEFEC] hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function BlockPalette({ onAdd }: { onAdd: (type: string) => void }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();

  return (
    <div className="p-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search sections…"
        className="mb-3 !py-2 text-[13px]"
      />
      {BLOCK_GROUPS.map((group) => {
        const items = BLOCKS.filter(
          (b) =>
            b.group === group &&
            (!term ||
              b.label.toLowerCase().includes(term) ||
              b.description.toLowerCase().includes(term))
        );
        if (!items.length) return null;
        return (
          <div key={group} className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#9A9CA2]">
              {group}
            </div>
            <div className="grid gap-1.5">
              {items.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => onAdd(b.type)}
                  className="flex gap-2.5 border border-[#E3E3DF] bg-white p-2.5 text-left transition-colors hover:border-ink"
                >
                  <span className="mt-0.5 w-5 shrink-0 text-center text-[14px] text-[#6B6D74]">
                    {b.glyph}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold">{b.label}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-[#8A8C93]">
                      {b.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Meta = {
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  showInNav: boolean;
  navLabel: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
};

function PageSettings({
  meta,
  isSystem,
  onChange,
}: {
  meta: Meta;
  isSystem: boolean;
  onChange: (m: Meta) => void;
}) {
  const set = <K extends keyof Meta>(k: K, v: Meta[K]) => onChange({ ...meta, [k]: v });

  return (
    <div className="space-y-5 p-4">
      <div>
        <span className="field-label">Page title</span>
        <Input value={meta.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div>
        <span className="field-label">URL slug</span>
        <Input
          value={meta.slug}
          onChange={(e) => set('slug', e.target.value)}
          disabled={isSystem}
        />
        <p className="mt-1.5 text-[12px] text-[#8A8C93]">
          {isSystem
            ? 'This is a built-in route — its URL is fixed.'
            : `The page will live at /${meta.slug}`}
        </p>
      </div>

      <div>
        <span className="field-label">Status</span>
        <Select
          value={meta.status}
          onChange={(e) => set('status', e.target.value as Meta['status'])}
        >
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft (hidden from the site)</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      <div>
        <span className="field-label">SEO title</span>
        <Input
          value={meta.seoTitle}
          onChange={(e) => set('seoTitle', e.target.value)}
          placeholder={meta.title}
        />
      </div>

      <div>
        <span className="field-label">SEO description</span>
        <Textarea
          rows={3}
          value={meta.seoDescription}
          onChange={(e) => set('seoDescription', e.target.value)}
          placeholder="150–160 characters that describe this page in search results."
        />
        <p className="mt-1.5 text-[12px] text-[#8A8C93]">
          {meta.seoDescription.length} characters
        </p>
      </div>

      <div>
        <span className="field-label">Social share image</span>
        <Input
          value={meta.ogImage}
          onChange={(e) => set('ogImage', e.target.value)}
          placeholder="/uploads/…"
        />
      </div>
    </div>
  );
}

function summarise(b: Block) {
  const p = b.props as Record<string, any>;
  return String(p?.heading || p?.title || p?.eyebrow || p?.body || b.type).slice(0, 46);
}
