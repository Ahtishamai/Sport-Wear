/**
 * Block model shared by the renderer (server) and the visual editor (client).
 * A page is simply an ordered list of blocks; each block is `{ id, type, props }`.
 */

export type BlockProps = Record<string, unknown>;

export type Block = {
  id: string;
  type: string;
  props: BlockProps;
  /** Hidden blocks stay in the document but are skipped by the renderer. */
  hidden?: boolean;
};

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'image'
  | 'link'
  | 'list'
  | 'tags'
  | 'icon';

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  /** for `list` fields — the shape of each row */
  fields?: Field[];
  /** default value used when a new row / block is created */
  default?: unknown;
  /** show this field only when another field has one of these values */
  showIf?: { field: string; equals: unknown[] };
  width?: 'full' | 'half';
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
};

export type BlockDefinition = {
  type: string;
  label: string;
  /** grouping in the "add block" palette */
  group: 'Hero & headers' | 'Commerce' | 'Content' | 'Social proof' | 'Conversion' | 'Layout';
  description: string;
  /** short glyph shown in the palette + outline */
  glyph: string;
  fields: Field[];
  defaults: BlockProps;
  /** blocks that should only ever appear once per page */
  singleton?: boolean;
};

export function newBlockId() {
  return 'b_' + Math.random().toString(36).slice(2, 10);
}

export function defaultsFor(def: BlockDefinition): Block {
  return { id: newBlockId(), type: def.type, props: structuredClone(def.defaults) };
}

/** Build an empty row for a `list` field from its sub-field defaults. */
export function emptyRow(fields: Field[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const f of fields) {
    row[f.name] =
      f.default !== undefined
        ? structuredClone(f.default)
        : f.type === 'boolean'
          ? false
          : f.type === 'number'
            ? 0
            : f.type === 'list'
              ? []
              : f.type === 'tags'
                ? []
                : '';
  }
  return row;
}
