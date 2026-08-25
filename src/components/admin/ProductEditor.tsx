'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { DEFAULT_TIERS, money, slugify, type VolumeTier } from '@/lib/utils';
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
import { MediaPicker } from './MediaPicker';
import { Icon } from '@/components/site/Icon';

export type EditableProduct = {
  id?: string;
  handle: string;
  title: string;
  subtitle: string | null;
  description: string;
  basePrice: number | string;
  compareAt: number | string | null;
  badge: string | null;
  categoryLabel: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured: boolean;
  position: number;
  sku: string | null;
  sports: string[] | null;
  colorways: { name: string; from: string; to: string }[] | null;
  sizes: string[] | null;
  defaultQty: Record<string, number> | null;
  volumeTiers: VolumeTier[] | null;
  specs: { q: string; a: string }[] | null;
  trustPoints: string[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { url: string; alt: string }[];
  collections: { collection: { id: string } }[];
};

type CollectionOption = { id: string; title: string; handle: string };

export function ProductEditor({
  product,
  collections,
}: {
  product: EditableProduct;
  collections: CollectionOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !product.id;

  const [f, setF] = useState(() => ({
    handle: product.handle ?? '',
    title: product.title ?? '',
    subtitle: product.subtitle ?? '',
    description: product.description ?? '',
    basePrice: String(product.basePrice ?? ''),
    compareAt: product.compareAt == null ? '' : String(product.compareAt),
    badge: product.badge ?? '',
    categoryLabel: product.categoryLabel ?? 'Fully customizable',
    status: product.status ?? 'PUBLISHED',
    featured: Boolean(product.featured),
    position: product.position ?? 0,
    sku: product.sku ?? '',
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
  }));

  const [images, setImages] = useState(product.images ?? []);
  const [collectionIds, setCollectionIds] = useState<string[]>(
    (product.collections ?? []).map((c) => c.collection.id)
  );
  const [sports, setSports] = useState<string[]>(
    product.sports ?? ['Baseball', 'Softball', 'Other']
  );
  const [sizes, setSizes] = useState<string[]>(
    product.sizes ?? ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL']
  );
  const [defaultQty, setDefaultQty] = useState<Record<string, number>>(
    product.defaultQty ?? { S: 2, M: 4, L: 4, XL: 2 }
  );
  const [colorways, setColorways] = useState(
    product.colorways ?? [{ name: 'Navy / Gold', from: '#16264B', to: '#FFD100' }]
  );
  const [tiers, setTiers] = useState<VolumeTier[]>(product.volumeTiers ?? DEFAULT_TIERS);
  const [specs, setSpecs] = useState(product.specs ?? []);
  const [trustPoints, setTrustPoints] = useState<string[]>(
    product.trustPoints ?? ['No deposit to get a quote', 'Names & numbers included', 'Reorders anytime']
  );

  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setError('');
    if (!f.title.trim()) return setError('A product title is required.');
    if (!f.description.trim()) return setError('A description is required — it is the PDP copy.');
    if (!f.basePrice || Number.isNaN(Number(f.basePrice))) {
      return setError('Starting price must be a number.');
    }

    setBusy(true);
    try {
      const payload = {
        ...f,
        handle: f.handle.trim() || slugify(f.title),
        basePrice: Number(f.basePrice),
        compareAt: f.compareAt === '' ? null : Number(f.compareAt),
        position: Number(f.position) || 0,
        sports,
        sizes,
        defaultQty,
        colorways,
        volumeTiers: tiers,
        specs,
        trustPoints,
        images,
        collectionIds,
      };

      if (isNew) {
        const res = await api.create<{ handle: string }>('products', payload);
        toast('Product created');
        router.push(`/admin/products/${res.item.handle}`);
        router.refresh();
      } else {
        await api.update('products', product.id!, payload);
        toast('Product saved');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!product.id) return;
    try {
      await api.remove('products', product.id);
      toast('Product deleted');
      router.push('/admin/products');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  return (
    <AdminPage
      title={isNew ? 'New product' : f.title || 'Product'}
      back={{ href: '/admin/products', label: 'All products' }}
      actions={
        <>
          {!isNew && (
            <Link
              href={`/products/${product.handle}`}
              target="_blank"
              className="rounded-[2px] border border-[#D6D6D1] px-4 py-2.5 text-[13px] font-semibold hover:border-ink"
            >
              View on site
            </Link>
          )}
          {!isNew && (
            <ConfirmButton onConfirm={destroy} message="Delete this product permanently?">
              Delete
            </ConfirmButton>
          )}
          <Button variant="yellow" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create product' : 'Save product'}
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
                </div>
                <div>
                  <span className="field-label">Card sub-label</span>
                  <Input
                    value={f.categoryLabel}
                    onChange={(e) => set('categoryLabel', e.target.value)}
                    placeholder="Shirts · Fully customizable"
                  />
                </div>
              </div>
              <div>
                <span className="field-label">Description (PDP copy)</span>
                <Textarea
                  rows={5}
                  value={f.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Fabric, construction and the sublimation benefit — 2 to 3 sentences."
                />
              </div>
            </div>
          </Card>

          <Card
            title="Images"
            description="The first image is the card thumbnail; the first four appear in the PDP gallery."
            actions={
              <Button size="sm" variant="outline" onClick={() => setPicker(true)}>
                Add image
              </Button>
            }
          >
            {images.length === 0 ? (
              <p className="text-[13px] text-[#8A8C93]">No images yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((im, i) => (
                  <div key={i} className="border border-[#E3E3DF]">
                    <div className="relative h-[110px] bg-[#F0F0ED]">
                      <Image src={im.url} alt={im.alt} fill sizes="200px" className="object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 bg-brand px-1.5 py-1 text-[9px] font-bold uppercase tracking-[.1em]">
                          Main
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <Input
                        value={im.alt}
                        onChange={(e) =>
                          setImages(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))
                        }
                        placeholder="Alt text"
                        className="!py-1.5 text-[12px]"
                      />
                      <div className="mt-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (i === 0) return;
                            const next = [...images];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            setImages(next);
                          }}
                          disabled={i === 0}
                          className="px-1.5 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-30"
                          aria-label="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (i === images.length - 1) return;
                            const next = [...images];
                            [next[i + 1], next[i]] = [next[i], next[i + 1]];
                            setImages(next);
                          }}
                          disabled={i === images.length - 1}
                          className="px-1.5 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-30"
                          aria-label="Move right"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, j) => j !== i))}
                          className="ml-auto px-1.5 text-[#8A8C93] hover:text-[#C42027]"
                          aria-label="Remove image"
                        >
                          <Icon name="close" size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <MediaPicker
              open={picker}
              onClose={() => setPicker(false)}
              folder="products"
              onPick={(m) => setImages((p) => [...p, { url: m.url, alt: m.alt || '' }])}
            />
          </Card>

          <Card title="Volume pricing" description="Discounts applied per unit on the PDP calculator.">
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Input
                    value={t.label}
                    onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="12–23"
                    className="!py-2 text-[13px]"
                  />
                  <Input
                    type="number"
                    value={t.minQty}
                    onChange={(e) =>
                      setTiers(tiers.map((x, j) => (j === i ? { ...x, minQty: Number(e.target.value) } : x)))
                    }
                    placeholder="Min"
                    className="!py-2 text-[13px]"
                  />
                  <Input
                    type="number"
                    value={t.maxQty ?? ''}
                    onChange={(e) =>
                      setTiers(
                        tiers.map((x, j) =>
                          j === i ? { ...x, maxQty: e.target.value === '' ? null : Number(e.target.value) } : x
                        )
                      )
                    }
                    placeholder="Max (blank = ∞)"
                    className="!py-2 text-[13px]"
                  />
                  <Input
                    type="number"
                    step="0.5"
                    value={t.discount}
                    onChange={(e) =>
                      setTiers(tiers.map((x, j) => (j === i ? { ...x, discount: Number(e.target.value) } : x)))
                    }
                    placeholder="− $"
                    className="!py-2 text-[13px]"
                  />
                  <div className="flex gap-1">
                    <Input
                      value={t.savingsLabel}
                      onChange={(e) =>
                        setTiers(tiers.map((x, j) => (j === i ? { ...x, savingsLabel: e.target.value } : x)))
                      }
                      placeholder="Save 10%"
                      className="!py-2 text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                      className="px-2 text-[#8A8C93] hover:text-[#C42027]"
                      aria-label="Remove tier"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() =>
                setTiers([...tiers, { label: '', minQty: 0, maxQty: null, discount: 0, savingsLabel: '' }])
              }
            >
              + Add tier
            </Button>
            <p className="mt-3 text-[12px] text-[#8A8C93]">
              At {tiers[tiers.length - 1]?.minQty ?? 48}+ units the unit price becomes{' '}
              {money(Math.max(0, Number(f.basePrice || 0) - (tiers[tiers.length - 1]?.discount ?? 0)))}.
            </p>
          </Card>

          <Card title="Spec accordion" description="Shown collapsed on the product page; the first row opens by default.">
            <div className="space-y-3">
              {specs.map((s, i) => (
                <div key={i} className="border border-[#E3E3DF] p-3">
                  <div className="flex gap-2">
                    <Input
                      value={s.q}
                      onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                      placeholder="Fabric & construction"
                      className="!py-2 text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                      className="px-2 text-[#8A8C93] hover:text-[#C42027]"
                      aria-label="Remove spec"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                  <Textarea
                    rows={3}
                    value={s.a}
                    onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                    className="mt-2 text-[13px]"
                  />
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setSpecs([...specs, { q: '', a: '' }])}
            >
              + Add spec row
            </Button>
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
                  placeholder={f.description.slice(0, 150)}
                />
                <p className="mt-1.5 text-[12px] text-[#8A8C93]">
                  {f.seoDescription.length} characters — aim for 150–160.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------ sidebar */}
        <div className="space-y-5">
          <Card title="Status & pricing">
            <div className="grid gap-4">
              <div>
                <span className="field-label">Status</span>
                <Select value={f.status} onChange={(e) => set('status', e.target.value as typeof f.status)}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="field-label">Starting at ($)</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={f.basePrice}
                    onChange={(e) => set('basePrice', e.target.value)}
                  />
                </div>
                <div>
                  <span className="field-label">Compare at ($)</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={f.compareAt}
                    onChange={(e) => set('compareAt', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="field-label">Badge</span>
                  <Input
                    value={f.badge}
                    onChange={(e) => set('badge', e.target.value)}
                    placeholder="Best seller"
                  />
                </div>
                <div>
                  <span className="field-label">Sort position</span>
                  <Input
                    type="number"
                    value={f.position}
                    onChange={(e) => set('position', Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <span className="field-label">SKU</span>
                <Input value={f.sku} onChange={(e) => set('sku', e.target.value)} />
              </div>
              <Checkbox
                label="Feature this product"
                checked={f.featured}
                onChange={(e) => set('featured', e.target.checked)}
              />
            </div>
          </Card>

          <Card title="Collections" description="Shopify-style — a product can sit in several.">
            {collections.length === 0 ? (
              <p className="text-[13px] text-[#8A8C93]">No collections yet.</p>
            ) : (
              <div className="space-y-2">
                {collections.map((c) => (
                  <Checkbox
                    key={c.id}
                    label={c.title}
                    checked={collectionIds.includes(c.id)}
                    onChange={(e) =>
                      setCollectionIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                      )
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Configurator">
            <ListEditor label="Sports" values={sports} onChange={setSports} placeholder="Baseball" />

            <div className="mt-5">
              <span className="field-label">Size run</span>
              <ListEditor label="" values={sizes} onChange={setSizes} placeholder="XL" />
            </div>

            <div className="mt-5">
              <span className="field-label">Default quantities</span>
              <div className="grid grid-cols-3 gap-2">
                {sizes.map((s) => (
                  <label key={s} className="border border-[#E3E3DF] px-2 py-1.5 text-center">
                    <span className="block text-[10px] font-bold uppercase text-[#8A8C93]">{s}</span>
                    <input
                      type="number"
                      min={0}
                      value={defaultQty[s] ?? 0}
                      onChange={(e) =>
                        setDefaultQty({ ...defaultQty, [s]: Math.max(0, Number(e.target.value) || 0) })
                      }
                      aria-label={`Default ${s} quantity`}
                      className="no-spin w-full border-0 bg-transparent text-center font-display text-[15px] font-black outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <span className="field-label">Colorways</span>
              <div className="space-y-2">
                {colorways.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className="h-8 w-8 shrink-0 rounded-full border border-[#E0E0DB]"
                      style={{ background: `linear-gradient(135deg, ${c.from} 50%, ${c.to} 50%)` }}
                    />
                    <Input
                      value={c.name}
                      onChange={(e) =>
                        setColorways(colorways.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                      }
                      className="!py-1.5 text-[12px]"
                    />
                    <input
                      type="color"
                      value={c.from}
                      onChange={(e) =>
                        setColorways(colorways.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))
                      }
                      aria-label="First colour"
                      className="h-8 w-8 shrink-0 cursor-pointer border border-[#D8D8D3] p-0.5"
                    />
                    <input
                      type="color"
                      value={c.to}
                      onChange={(e) =>
                        setColorways(colorways.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))
                      }
                      aria-label="Second colour"
                      className="h-8 w-8 shrink-0 cursor-pointer border border-[#D8D8D3] p-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => setColorways(colorways.filter((_, j) => j !== i))}
                      className="px-1 text-[#8A8C93] hover:text-[#C42027]"
                      aria-label="Remove colorway"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() =>
                  setColorways([...colorways, { name: 'New colorway', from: '#101114', to: '#FFD100' }])
                }
              >
                + Add colorway
              </Button>
            </div>

            <div className="mt-5">
              <span className="field-label">Trust ticks</span>
              <ListEditor
                label=""
                values={trustPoints}
                onChange={setTrustPoints}
                placeholder="No deposit to get a quote"
              />
            </div>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}

function ListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      {label && <span className="field-label">{label}</span>}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1.5 border border-[#E3E3DF] bg-[#F7F7F5] px-2 py-1 text-[12px]"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label={`Remove ${v}`}
              className="text-[#8A8C93] hover:text-ink"
            >
              <Icon name="close" size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (draft.trim()) {
                onChange([...values, draft.trim()]);
                setDraft('');
              }
            }
          }}
          placeholder={placeholder}
          className="!py-1.5 text-[12px]"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (draft.trim()) {
              onChange([...values, draft.trim()]);
              setDraft('');
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
