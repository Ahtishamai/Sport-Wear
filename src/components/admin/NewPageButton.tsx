'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { Button, Input, useToast } from './ui';
import { slugify } from '@/lib/utils';
import { BLOCKS } from '@/lib/blocks/registry';
import { defaultsFor } from '@/lib/blocks/types';

const STARTERS = [
  { key: 'blank', label: 'Blank page', blocks: ['pageHeader'] },
  { key: 'content', label: 'Content page', blocks: ['pageHeader', 'richText', 'ctaBand'] },
  {
    key: 'landing',
    label: 'Landing page',
    blocks: ['hero', 'statStrip', 'productGrid', 'steps', 'reviews', 'faq', 'ctaBand'],
  },
  { key: 'contact', label: 'Contact page', blocks: ['pageHeader', 'contactForm', 'mapEmbed', 'faq'] },
];

export function NewPageButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [starter, setStarter] = useState('content');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const preset = STARTERS.find((s) => s.key === starter) ?? STARTERS[0];
      const blocks = preset.blocks
        .map((type) => BLOCKS.find((b) => b.type === type))
        .filter(Boolean)
        .map((def) => defaultsFor(def!));

      // Seed the header with the page title.
      const header = blocks.find((b) => b.type === 'pageHeader');
      if (header) header.props.heading = title.trim();

      const res = await api.create<{ slug: string }>('pages', {
        title: title.trim(),
        slug: slugify(title),
        blocks,
        status: 'DRAFT',
      });
      toast('Page created');
      router.push(`/admin/pages/${res.item.slug}/edit`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the page', 'error');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ink" onClick={() => setOpen(true)}>
        New page
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 cursor-default bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-[440px] bg-white p-6">
        <h2 className="font-display text-[16px] font-extrabold uppercase tracking-[.08em]">
          New page
        </h2>

        <div className="mt-5">
          <span className="field-label">Page title</span>
          <Input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Shipping & returns"
          />
          {title && (
            <p className="mt-1.5 text-[12px] text-[#8A8C93]">URL: /{slugify(title)}</p>
          )}
        </div>

        <div className="mt-5">
          <span className="field-label">Start from</span>
          <div className="grid grid-cols-2 gap-2">
            {STARTERS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStarter(s.key)}
                className={
                  'border px-3 py-3 text-left text-[13px] font-semibold transition-colors ' +
                  (starter === s.key
                    ? 'border-ink bg-brand-tint'
                    : 'border-[#E3E3DF] hover:border-ink')
                }
              >
                {s.label}
                <span className="mt-1 block text-[11px] font-normal text-[#8A8C93]">
                  {s.blocks.length} section{s.blocks.length === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="yellow" onClick={create} disabled={busy || !title.trim()}>
            {busy ? 'Creating…' : 'Create page'}
          </Button>
        </div>
      </div>
    </div>
  );
}
