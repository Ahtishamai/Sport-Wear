'use client';

import { useState } from 'react';
import { BLOCK_GROUPS, BLOCKS, blockDef } from '@/lib/blocks/registry';
import { defaultsFor, newBlockId, type Block } from '@/lib/blocks/types';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { Button } from './ui';
import { FieldSet } from './BlockFields';

/**
 * Compact section editor (no live preview) for places that append blocks to
 * something that is not a Page — currently collection pages.
 */
export function BlockListEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <ol className="space-y-2">
        {blocks.map((b, i) => {
          const def = blockDef(b.type);
          const isSel = selected === b.id;
          return (
            <li key={b.id} className="border border-[#E3E3DF] bg-white">
              <div className="flex items-center gap-1.5 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelected(isSel ? null : b.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className="w-5 shrink-0 text-center text-[13px] text-[#9A9CA2]">
                    {def?.glyph ?? '▢'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">
                      {def?.label ?? b.type}
                    </span>
                    <span className="block truncate text-[11px] text-[#9A9CA2]">
                      {String(
                        (b.props as Record<string, unknown>)?.heading ??
                          (b.props as Record<string, unknown>)?.title ??
                          b.type
                      ).slice(0, 48)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="px-1 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-25"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === blocks.length - 1}
                  aria-label="Move down"
                  className="px-1 text-[12px] text-[#8A8C93] hover:text-ink disabled:opacity-25"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const copy: Block = { ...structuredClone(b), id: newBlockId() };
                    const next = [...blocks];
                    next.splice(i + 1, 0, copy);
                    onChange(next);
                  }}
                  aria-label="Duplicate"
                  className="px-1 text-[12px] text-[#8A8C93] hover:text-ink"
                >
                  ⧉
                </button>
                <button
                  type="button"
                  onClick={() => onChange(blocks.filter((_, j) => j !== i))}
                  aria-label="Remove"
                  className="px-1 text-[#8A8C93] hover:text-[#C42027]"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
              {isSel && (
                <div className="border-t border-[#EFEFEC] bg-[#FAFAF8] p-4">
                  <FieldSet
                    fields={def?.fields ?? []}
                    values={b.props as Record<string, any>}
                    onChange={(props) =>
                      onChange(blocks.map((x, j) => (j === i ? { ...x, props } : x)))
                    }
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {blocks.length === 0 && (
        <p className="mb-3 text-[13px] text-[#8A8C93]">
          No extra sections — the product grid is shown on its own.
        </p>
      )}

      {adding ? (
        <div className="mt-3 max-h-[320px] overflow-y-auto border border-[#E3E3DF] bg-white p-3">
          {BLOCK_GROUPS.map((group) => {
            const items = BLOCKS.filter((b) => b.group === group);
            return (
              <div key={group} className="mb-4">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#9A9CA2]">
                  {group}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((b) => (
                    <button
                      key={b.type}
                      type="button"
                      onClick={() => {
                        const block = defaultsFor(b);
                        onChange([...blocks, block]);
                        setSelected(block.id);
                        setAdding(false);
                      }}
                      className={cn(
                        'border border-[#E3E3DF] px-2.5 py-1.5 text-[12px] font-semibold transition-colors hover:border-ink'
                      )}
                    >
                      {b.glyph} {b.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setAdding(true)}>
          + Add a section
        </Button>
      )}
    </div>
  );
}
