import type { Block } from '@/lib/blocks/types';
import {
  getCollectionCards,
  getFaqs,
  getPackages,
  getProductsForBlock,
  getReviews,
} from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { FaqBlock } from './FaqBlock';
import { ContactFormBlock } from './ContactFormBlock';
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
  ReviewsBlock,
  QuoteCalloutBlock,
  RichTextBlock,
  SpacerBlock,
  NumbersGridBlock,
  StatStripBlock,
  StepsBlock,
  TeamGridBlock,
  TileGroupsBlock,
  TimelineBlock,
} from './sections';

export type RenderContext = {
  breadcrumb?: { label: string; href?: string }[];
  /** Excluded from product grids (used on the PDP). */
  excludeProductId?: string;
};

export async function BlockRenderer({
  blocks,
  context,
}: {
  blocks: Block[] | unknown;
  context?: RenderContext;
}) {
  const list = normalizeBlocks(blocks);
  if (!list.length) return null;

  const rendered = await Promise.all(
    list.map((b, i) => renderBlock(b, i, context ?? {}))
  );

  return <>{rendered}</>;
}

export function normalizeBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(
    (b): b is Block =>
      !!b && typeof b === 'object' && typeof (b as Block).type === 'string' && !(b as Block).hidden
  );
}

async function renderBlock(block: Block, index: number, ctx: RenderContext) {
  const p = (block.props ?? {}) as Record<string, any>;
  const key = block.id || `${block.type}-${index}`;

  switch (block.type) {
    case 'hero':
      return <HeroBlock key={key} p={p} bid={block.id} priority={index === 0} />;

    case 'pageHeader':
      return <PageHeaderBlock key={key} p={p} bid={block.id} breadcrumb={ctx.breadcrumb} />;

    case 'numbersGrid':
      return <NumbersGridBlock key={key} p={p} bid={block.id} />;

    case 'statStrip':
      return <StatStripBlock key={key} p={p} bid={block.id} />;

    case 'marquee':
      return <MarqueeBlock key={key} p={p} bid={block.id} />;

    case 'featuredTiles':
      return <FeaturedTilesBlock key={key} p={p} bid={block.id} />;

    case 'tileGroups':
      return <TileGroupsBlock key={key} p={p} bid={block.id} />;

    case 'categoryCards':
      return <CategoryCardsBlock key={key} p={p} bid={block.id} />;

    case 'productGrid': {
      const products = await getProductsForBlock({
        source: p.source,
        collectionHandle: p.collectionHandle,
        handles: p.handles,
        limit: p.limit,
        excludeId: ctx.excludeProductId,
      });
      return <ProductGridBlock key={key} p={p} bid={block.id} products={products} />;
    }

    case 'packagesGrid': {
      const packages = await getPackages(Number(p.limit) || 4);
      return <PackagesGridBlock key={key} p={p} bid={block.id} packages={packages} />;
    }

    case 'collectionList': {
      const collections = await getCollectionCards(Number(p.limit) || 12);
      return <CollectionListBlock key={key} p={p} bid={block.id} collections={collections} />;
    }

    case 'steps':
      return <StepsBlock key={key} p={p} bid={block.id} />;

    case 'iconFeatures':
      return <IconFeaturesBlock key={key} p={p} bid={block.id} />;

    case 'ctaBand':
      return <CtaBandBlock key={key} p={p} bid={block.id} />;

    case 'quoteCallout':
      return <QuoteCalloutBlock key={key} p={p} bid={block.id} />;

    case 'reviews': {
      const reviews = await getReviews(Number(p.limit) || 12);
      return <ReviewsBlock key={key} p={p} bid={block.id} reviews={reviews} />;
    }

    case 'faq': {
      const faqs = await getFaqs(p.group || 'home');
      return <FaqBlock key={key} p={p} bid={block.id} faqs={faqs} />;
    }

    case 'richText':
      return <RichTextBlock key={key} p={p} bid={block.id} />;

    case 'imageText':
      return <ImageTextBlock key={key} p={p} bid={block.id} />;

    case 'gallery':
      return <GalleryBlock key={key} p={p} bid={block.id} />;

    case 'teamGrid':
      return <TeamGridBlock key={key} p={p} bid={block.id} />;

    case 'timeline':
      return <TimelineBlock key={key} p={p} bid={block.id} />;

    case 'contactForm': {
      const s = await getSettings();
      return (
        <ContactFormBlock
          key={key}
          p={p}
          details={{
            phone: s.phone,
            phoneHref: s.phoneHref,
            email: s.email,
            address: s.address,
          }}
        />
      );
    }

    case 'mapEmbed':
      return <MapEmbedBlock key={key} p={p} bid={block.id} />;

    case 'spacer':
      return <SpacerBlock key={key} p={p} bid={block.id} />;

    case 'html':
      return <HtmlBlock key={key} p={p} bid={block.id} />;

    default:
      if (process.env.NODE_ENV === 'development') {
        return (
          <div
            key={key}
            className="gutter border-y border-hairline bg-surface py-6 text-[13px] text-muted"
          >
            Unknown block type: <code>{block.type}</code>
          </div>
        );
      }
      return null;
  }
}

