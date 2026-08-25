'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type MediaItem } from '@/lib/admin-client';
import { Button, EmptyState, Input, useToast } from './ui';
import { Icon } from '@/components/site/Icon';
import { formatDate } from '@/lib/utils';

export function MediaLibrary() {
  const toast = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list<MediaItem>('media', { q: q || undefined, take: 300 });
      setItems(res.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load media', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const res = await api.upload(Array.from(files), folder);
      setItems((prev) => [...res.items, ...prev]);
      toast(`${res.items.length} file${res.items.length === 1 ? '' : 's'} uploaded`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function saveAlt(item: MediaItem, alt: string) {
    try {
      await api.update('media', item.id, { alt });
      setItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, alt } : m)));
      toast('Alt text saved');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Delete ${item.filename}? Pages using it will show an empty slot.`)) return;
    try {
      await api.remove('media', item.id);
      setItems((prev) => prev.filter((m) => m.id !== item.id));
      setSelected(null);
      toast('File removed from the library');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search filenames or alt text…"
          className="max-w-[280px] !py-2 text-[13px]"
        />
        <Input
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Upload folder"
          className="max-w-[160px] !py-2 text-[13px]"
        />
        <Button variant="yellow" onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload images'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className="border border-dashed bg-white p-5 transition-colors"
        style={{ borderColor: dragging ? '#101114' : '#D6D6D1' }}
      >
        {loading ? (
          <p className="py-10 text-center text-[13px] text-[#8A8C93]">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No media yet"
            body="Drop images here, or use the upload button. JPG, PNG, WebP and SVG up to 25MB."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m)}
                className="group border border-[#E3E3DF] bg-white text-left transition-colors hover:border-ink"
              >
                <span className="relative block h-[120px] bg-[#F0F0ED]">
                  <Image
                    src={m.url}
                    alt={m.alt || m.filename}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </span>
                <span className="block truncate px-2 py-1.5 text-[11px] text-[#6B6D74]">
                  {m.filename}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <MediaDetail item={selected} onClose={() => setSelected(null)} onSaveAlt={saveAlt} onDelete={remove} />}
    </div>
  );
}

function MediaDetail({
  item,
  onClose,
  onSaveAlt,
  onDelete,
}: {
  item: MediaItem;
  onClose: () => void;
  onSaveAlt: (item: MediaItem, alt: string) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const toast = useToast();

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/50" />
      <div className="relative grid w-full max-w-[840px] gap-0 bg-white md:grid-cols-[1.2fr_1fr]">
        <div className="relative min-h-[300px] bg-[#F0F0ED]">
          <Image src={item.url} alt={item.alt || item.filename} fill sizes="500px" className="object-contain" />
        </div>
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-display text-[15px] font-extrabold uppercase tracking-[.08em]">
              File details
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1">
              <Icon name="close" size={18} />
            </button>
          </div>

          <dl className="space-y-3 text-[13px]">
            <div>
              <dt className="field-label">Filename</dt>
              <dd className="break-all">{item.filename}</dd>
            </div>
            <div>
              <dt className="field-label">URL</dt>
              <dd className="break-all font-mono text-[12px]">{item.url}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="field-label">Dimensions</dt>
                <dd>{item.width && item.height ? `${item.width} × ${item.height}` : '—'}</dd>
              </div>
              <div>
                <dt className="field-label">Size</dt>
                <dd>{(item.size / 1024).toFixed(0)} KB</dd>
              </div>
            </div>
            <div>
              <dt className="field-label">Uploaded</dt>
              <dd>{formatDate(item.createdAt)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <span className="field-label">Alt text</span>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers and SEO"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="yellow" onClick={() => onSaveAlt(item, alt)} disabled={alt === item.alt}>
              Save alt text
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(item.url);
                toast('URL copied');
              }}
            >
              Copy URL
            </Button>
            <Button variant="danger" onClick={() => onDelete(item)}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
