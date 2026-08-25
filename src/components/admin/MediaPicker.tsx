'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type MediaItem } from '@/lib/admin-client';
import { Button, Input } from './ui';
import { Icon } from '@/components/site/Icon';
import { cn } from '@/lib/utils';

export function MediaPicker({
  open,
  onClose,
  onPick,
  folder = 'general',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (item: MediaItem) => void;
  folder?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list<MediaItem>('media', { q, take: 120 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load media');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.upload(Array.from(files), folder);
      setItems((prev) => [...res.items, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div className="relative flex max-h-[86vh] w-full max-w-[900px] flex-col bg-white">
        <header className="flex items-center gap-3 border-b border-[#E3E3DF] px-5 py-4">
          <h2 className="font-display text-[14px] font-extrabold uppercase tracking-[.12em]">
            Media library
          </h2>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search filenames…"
            className="ml-auto max-w-[220px] !py-2 text-[13px]"
          />
          <Button variant="yellow" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div
          className="min-h-[280px] flex-1 overflow-y-auto p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {error && <p className="field-error mb-3">{error}</p>}
          {loading ? (
            <p className="py-10 text-center text-[13px] text-[#8A8C93]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#8A8C93]">
              Nothing here yet — drop images anywhere in this panel to upload.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onPick(m);
                    onClose();
                  }}
                  className="group border border-[#E3E3DF] text-left transition-colors hover:border-ink"
                >
                  <span className="relative block h-[110px] bg-[#F0F0ED]">
                    <Image src={m.url} alt={m.alt || m.filename} fill sizes="200px" className="object-cover" />
                  </span>
                  <span className="block truncate px-2 py-1.5 text-[11px] text-[#6B6D74]">
                    {m.filename}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Image field: preview + pick from library + paste a URL. */
export function ImageField({
  value,
  onChange,
  folder,
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative h-[64px] w-[80px] shrink-0 border border-[#E3E3DF] bg-[#F0F0ED]">
        {value ? (
          <Image src={value} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] text-[#9A9CA2]">
            None
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/uploads/… or https://…"
          className="!py-2 text-[13px]"
        />
        <div className="mt-1.5 flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            Choose
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
              Clear
            </Button>
          )}
        </div>
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(m) => onChange(m.url)}
        folder={folder}
      />
    </div>
  );
}
