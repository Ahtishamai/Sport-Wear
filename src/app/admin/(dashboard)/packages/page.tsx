'use client';

import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';

const FIELDS: Field[] = [
  { name: 'tag', label: 'Tag', type: 'text', width: 'half', default: 'Deal 1', help: 'Small label above the name.' },
  { name: 'name', label: 'Package name', type: 'text', width: 'half', default: '' },
  { name: 'price', label: 'Price per player ($)', type: 'number', width: 'half', default: 350 },
  { name: 'note', label: 'Note line', type: 'text', width: 'half', default: '' },
  { name: 'items', label: 'What is included', type: 'tags', default: [] },
  { name: 'imageUrl', label: 'Photo', type: 'image', default: '' },
  { name: 'highlight', label: 'Highlight card (yellow)', type: 'boolean', width: 'half', default: false },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    width: 'half',
    default: 'PUBLISHED',
    options: [
      { label: 'Published', value: 'PUBLISHED' },
      { label: 'Draft', value: 'DRAFT' },
      { label: 'Archived', value: 'ARCHIVED' },
    ],
  },
];

export default function PackagesAdmin() {
  return (
    <AdminPage
      title="Team packages"
      description="Per-player bundles shown on the home page and /team-packages. Each card opens the quote drawer."
    >
      <ResourceManager
        resource="packages"
        fields={FIELDS}
        title="Packages"
        singularLabel="Package"
        rowTitle={(r) => `${r.tag} — ${r.name}`}
        rowMeta={(r) => `$${Number(r.price).toFixed(0)} / player · ${(r.items ?? []).length} items`}
      />
    </AdminPage>
  );
}
