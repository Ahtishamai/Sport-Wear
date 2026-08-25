'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { slugify } from '@/lib/utils';
import type { Block } from '@/lib/blocks/types';
import {
  AdminPage,
  Button,
  Card,
  Checkbox,
  ConfirmButton,
  Input,
  Select,
  Textarea,
  useToast,
} from './ui';
import { ImageField } from './MediaPicker';
import { BlockListEditor } from './BlockListEditor';

export type EditableCollection = {
  id?: string;
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  bannerUrl: string | null;
  thumbUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  position: number;
  showInNav: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: unknown;
};

type ProductOption = {
  id: string;
  title: string;
  handle: string;
  image?: string | null;
  collectionIds: string[];
};

export function CollectionEditor({
  collection,
  products,
  memberIds,
}: {
  collection: EditableCollection;
  products: ProductOption[];
  memberIds: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !collection.id;

  const [f, setF] = useState(() => ({
    handle: collection.handle ?? '',
    title: collection.title ?? '',
    subtitle: collection.subtitle ?? '',
    description: collection.description ?? '',
    bannerUrl: collection.bannerUrl ?? '',
    thumbUrl: collection.thumbUrl ?? '',
    status: collection.status ?? 'PUBLISHED',
    position: collection.position ?? 0,
    showInNav: collection.showInNav ?? true,
    seoTitle: collection.seoTitle ?? '',
    seoDescription: collection.seoDescription ?? '',
  }));

  const [blocks, setBlocks] = useState<Block[]>(
    Array.isArray(collection.blocks) ? (collection.blocks as Block[]) : []
  );
  const [members, setMembers] = useState<string[]>(memberIds);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const filtered = q.trim()
    ? products.filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase()))
    : products;

  async function save() {
    setError('');
    if (!f.title.trim()) return setError('A collection title is required.');

    setBusy(true);
    try {
      const payload = {
        ...f,
        handle: f.handle.trim() || slugify(f.title),
        position: Number(f.position) || 0,
        blocks,
      };

      let collectionId = collection.id;
      if (isNew) {
        const res = await api.create<{ id: string; handle: string }>('collections', payload);
        collectionId = res.item.id;
        // Membership is stored on the product side, so assign after creation.
        await assignMembers(collectionId, members, products);
        toast('Collection created');
        router.push(`/admin/collections/${res.item.handle}`);
        router.refresh();
        return;
      }

      await api.update('collections', collection.id!, payload);
      await assignMembers(collection.id!, members, products);
      toast('Collection saved');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!collection.id) return;
    try {
      await api.remove('collections', collection.id);
      toast('Collection deleted');
      router.push('/admin/collections');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  return (
    <AdminPage
      title={isNew ? 'New collection' : f.title || 'Collection'}
      back={{ href: '/admin/collections', label: 'All collections' }}
      description="Collections get their own page at /collections/handle, with the sidebar filters and grid."
      actions={
        <>
          {!isNew && (
            <Link
              href={`/collections/${collection.handle}`}
              target="_blank"
              className="rounded-[2px] border border-[#D6D6D1] px-4 py-2.5 text-[13px] font-semibold hover:border-ink"
            >
              View on site
            </Link>
          )}
          {!isNew && (
            <ConfirmButton onConfirm={destroy} message="Delete this collection? Products are not deleted.">
              Delete
            </ConfirmButton>
          )}
          <Button variant="yellow" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create collection' : 'Save collection'}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card title="Basics">
            <div className="grid gap-4">
              <div>
                <span className="field-label">Title</span>
                <Input value={f.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="field-label">URL handle</span>
                  <Input
                    value={f.handle}
                    onChange={(e) => set('handle', e.target.value)}
                    placeholder={slugify(f.title) || 'auto'}
                  />
                  <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                    /collections/{f.handle || slugify(f.title) || '…'}
                  </p>
                </div>
                <div>
                  <span className="field-label">Short label</span>
                  <Input
                    value={f.subtitle}
                    onChange={(e) => set('subtitle', e.target.value)}
                    placeholder="Custom sublimated jerseys"
                  />
                </div>
              </div>
              <div>
                <span className="field-label">Intro copy</span>
                <Textarea
                  rows={4}
                  value={f.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Shown under the H1 on the collection page."
                />
              </div>
            </div>
          </Card>

          <Card title="Products in this collection" description={`${members.length} selected`}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter products…"
              className="mb-3 !py-2 text-[13px]"
            />
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 border border-transparent px-2 py-1.5 hover:border-[#E3E3DF]"
                >
                  <input
                    type="checkbox"
                    checked={members.includes(p.id)}
                    onChange={(e) =>
                      setMembers((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                      )
                    }
                    style={{ accentColor: '#101114' }}
                    className="h-4 w-4"
                  />
                  <span className="relative h-9 w-9 shrink-0 bg-[#F0F0ED]">
                    {p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{p.title}</span>
                    <span className="block truncate text-[11px] text-[#9A9CA2]">/{p.handle}</span>
                  </span>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-[13px] text-[#8A8C93]">No products match.</p>
              )}
            </div>
          </Card>

          <Card
            title="Extra sections"
            description="Optional blocks rendered below the product grid on this collection page."
          >
            <BlockListEditor blocks={blocks} onChange={setBlocks} />
          </Card>

          <Card title="Search engine listing">
            <div className="grid gap-4">
              <div>
                <span className="field-label">SEO title</span>
                <Input
                  value={f.seoTitle}
                  onChange={(e) => set('seoTitle', e.target.value)}
                  placeholder={f.title}
                />
              </div>
              <div>
                <span className="field-label">Meta description</span>
                <Textarea
                  rows={3}
                  value={f.seoDescription}
                  onChange={(e) => set('seoDescription', e.target.value)}
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  {f.seoDescription.length} characters
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Visibility">
            <div className="grid gap-4">
              <div>
                <span className="field-label">Status</span>
                <Select value={f.status} onChange={(e) => set('status', e.target.value as typeof f.status)}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>
              <div>
                <span className="field-label">Sort position</span>
                <Input
                  type="number"
                  value={f.position}
                  onChange={(e) => set('position', Number(e.target.value))}
                />
              </div>
              <Checkbox
                label="Show in the catalog sidebar"
                checked={f.showInNav}
                onChange={(e) => set('showInNav', e.target.checked)}
              />
            </div>
          </Card>

          <Card title="Imagery">
            <div className="grid gap-5">
              <div>
                <span className="field-label">Banner (collection page)</span>
                <ImageField
                  value={f.bannerUrl}
                  onChange={(v) => set('bannerUrl', v)}
                  folder="collections"
                />
              </div>
              <div>
                <span className="field-label">Thumbnail (collection cards)</span>
                <ImageField
                  value={f.thumbUrl}
                  onChange={(v) => set('thumbUrl', v)}
                  folder="collections"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}

/**
 * Collection membership lives on the product records, so syncing means
 * patching each product whose membership actually changed.
 */
async function assignMembers(
  collectionId: string,
  members: string[],
  products: ProductOption[]
) {
  const wanted = new Set(members);
  const jobs: Promise<unknown>[] = [];

  for (const p of products) {
    const current = new Set(p.collectionIds ?? []);
    const has = current.has(collectionId);
    const should = wanted.has(p.id);
    if (has === should) continue;

    const next = should
      ? [...current, collectionId]
      : [...current].filter((id) => id !== collectionId);
    jobs.push(api.update('products', p.id, { collectionIds: next }));
  }

  await Promise.all(jobs);
}
