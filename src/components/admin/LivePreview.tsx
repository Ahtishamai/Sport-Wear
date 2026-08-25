'use client';

import { useEffect, useState } from 'react';
import type { Block } from '@/lib/blocks/types';
import type { CardPackage, CardProduct } from '@/components/blocks/primitives';
import type { CollectionCard, ReviewItem } from '@/components/blocks/sections';
import type { FaqItem } from '@/components/blocks/FaqBlock';
import { FaqBlock } from '@/components/blocks/FaqBlock';
import { ContactFormBlock } from '@/components/blocks/ContactFormBlock';
import {
  CategoryCardsBlock,
  CollectionListBlock,
  CtaBandBlock,
  FeaturedTilesBlock,
  GalleryBlock,
  HeroBlock,
  HtmlBlock,
  IconFeaturesBlock,
  ImageTextBlock,
  MapEmbedBlock,
  MarqueeBlock,
  PackagesGridBlock,
  PageHeaderBlock,
  ProductGridBlock,
  QuoteCalloutBlock,
  ReviewsBlock,
  RichTextBlock,
  SpacerBlock,
  NumbersGridBlock,
  StatStripBlock,
  StepsBlock,
  TileGroupsBlock,
  TeamGridBlock,
  TimelineBlock,
} from '@/components/blocks/sections';

export type PreviewData = {
  products: CardProduct[];
  featured: CardProduct[];
  byCollection: Record<string, CardProduct[]>;
  packages: CardPackage[];
  reviews: ReviewItem[];
  faqs: Record<string, FaqItem[]>;
  collections: CollectionCard[];
  contact: { phone: string; phoneHref: string; email: string; address: string };
};

/**
 * Client-side mirror of the server BlockRenderer used inside the builder's
 * preview iframe. Blocks arrive over postMessage so edits show up as you type.
 */
export function LivePreview({
  initialBlocks,
  data,
}: {
  initialBlocks: Block[];
  data: PreviewData;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ds:blocks' && Array.isArray(msg.blocks)) setBlocks(msg.blocks);
      if (msg.type === 'ds:select') {
        setSelected(msg.id ?? null);
        if (msg.id) {
          document
            .querySelector(`[data-block-id="${msg.id}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'ds:ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="ds-preview">
      <style>{`
        [data-block-id]{position:relative}
        [data-block-id]:hover{outline:2px dashed rgba(255,209,0,.9);outline-offset:-2px}
        [data-block-id][data-selected="true"]{outline:2px solid #101114;outline-offset:-2px}
        [data-block-id]::after{content:attr(data-block-label);position:absolute;top:0;left:0;z-index:40;
          background:#101114;color:#fff;font:600 11px/1 Poppins,system-ui,sans-serif;padding:5px 8px;
          opacity:0;transition:opacity .15s;pointer-events:none}
        [data-block-id]:hover::after{opacity:1}
      `}</style>
      {blocks
        .filter((b) => !b.hidden)
        .map((b, i) => (
          <div
            key={b.id || i}
            data-block-id={b.id}
            data-block-label={b.type}
            data-selected={selected === b.id ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelected(b.id);
              window.parent?.postMessage(
                { type: 'ds:selected', id: b.id },
                window.location.origin
              );
            }}
          >
            <PreviewBlock block={b} index={i} data={data} />
          </div>
        ))}
      {blocks.length === 0 && (
        <div className="gutter py-24 text-center text-[14px] text-muted">
          This page has no sections yet — add one from the panel on the left.
        </div>
      )}
    </div>
  );
}

function PreviewBlock({
  block,
  index,
  data,
}: {
  block: Block;
  index: number;
  data: PreviewData;
}) {
  const p = (block.props ?? {}) as Record<string, any>;

  switch (block.type) {
    case 'hero':
      return <HeroBlock p={p} bid={block.id} priority={index === 0} />;
    case 'pageHeader':
      return (
        <PageHeaderBlock
          p={p}
          breadcrumb={[{ label: 'Home', href: '/' }, { label: p.heading || 'Page' }]}
        />
      );
    case 'numbersGrid':
      return <NumbersGridBlock p={p} bid={block.id} />;
    case 'statStrip':
      return <StatStripBlock p={p} bid={block.id} />;
    case 'marquee':
      return <MarqueeBlock p={p} bid={block.id} />;
    case 'featuredTiles':
      return <FeaturedTilesBlock p={p} bid={block.id} />;
    case 'tileGroups':
      return <TileGroupsBlock p={p} bid={block.id} />;
    case 'categoryCards':
      return <CategoryCardsBlock p={p} bid={block.id} />;
    case 'productGrid':
      return <ProductGridBlock p={p} bid={block.id} products={pickProducts(p, data)} />;
    case 'packagesGrid':
      return <PackagesGridBlock p={p} bid={block.id} packages={data.packages.slice(0, Number(p.limit) || 4)} />;
    case 'collectionList':
      return (
        <CollectionListBlock p={p} bid={block.id} collections={data.collections.slice(0, Number(p.limit) || 12)} />
      );
    case 'steps':
      return <StepsBlock p={p} bid={block.id} />;
    case 'iconFeatures':
      return <IconFeaturesBlock p={p} bid={block.id} />;
    case 'ctaBand':
      return <CtaBandBlock p={p} bid={block.id} />;
    case 'quoteCallout':
      return <QuoteCalloutBlock p={p} bid={block.id} />;
    case 'reviews':
      return <ReviewsBlock p={p} bid={block.id} reviews={data.reviews.slice(0, Number(p.limit) || 12)} />;
    case 'faq':
      return <FaqBlock p={p} bid={block.id} faqs={data.faqs[p.group || 'home'] ?? []} />;
    case 'richText':
      return <RichTextBlock p={p} bid={block.id} />;
    case 'imageText':
      return <ImageTextBlock p={p} bid={block.id} />;
    case 'gallery':
      return <GalleryBlock p={p} bid={block.id} />;
    case 'teamGrid':
      return <TeamGridBlock p={p} bid={block.id} />;
    case 'timeline':
      return <TimelineBlock p={p} bid={block.id} />;
    case 'contactForm':
      return <ContactFormBlock p={p} bid={block.id} details={data.contact} />;
    case 'mapEmbed':
      return <MapEmbedBlock p={p} bid={block.id} />;
    case 'spacer':
      return <SpacerBlock p={p} bid={block.id} />;
    case 'html':
      return <HtmlBlock p={p} bid={block.id} />;
    default:
      return (
        <div className="gutter border-y border-hairline bg-surface py-6 text-[13px] text-muted">
          Unknown block: {block.type}
        </div>
      );
  }
}


function pickProducts(p: Record<string, any>, data: PreviewData): CardProduct[] {
  const limit = Number(p.limit) || 4;
  if (p.source === 'collection' && p.collectionHandle) {
    return (data.byCollection[p.collectionHandle] ?? []).slice(0, limit);
  }
  if (p.source === 'manual' && Array.isArray(p.handles)) {
    const map = new Map(data.products.map((x) => [x.handle, x]));
    return (p.handles as string[]).map((h) => map.get(h)).filter(Boolean).slice(0, limit) as CardProduct[];
  }
  if (p.source === 'featured') return data.featured.slice(0, limit);
  return data.products.slice(0, limit);
}
