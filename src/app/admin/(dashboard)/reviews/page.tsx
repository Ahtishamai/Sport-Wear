'use client';

import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';

const FIELDS: Field[] = [
  { name: 'name', label: 'Name', type: 'text', width: 'half', default: '' },
  { name: 'role', label: 'Role', type: 'text', width: 'half', default: 'Travel team coach' },
  { name: 'initials', label: 'Avatar initials', type: 'text', width: 'half', default: '' },
  { name: 'rating', label: 'Stars', type: 'number', width: 'half', min: 1, max: 5, default: 5 },
  { name: 'text', label: 'Review', type: 'textarea', rows: 4, default: '' },
  { name: 'published', label: 'Published', type: 'boolean', width: 'half', default: true },
];

export default function ReviewsAdmin() {
  return (
    <AdminPage
      title="Reviews"
      description="Feeds the auto-scrolling review carousel. Order here is the order on the site."
    >
      <ResourceManager
        resource="reviews"
        fields={FIELDS}
        title="Reviews"
        singularLabel="Review"
        rowTitle={(r) => `${r.name} — ${r.role}`}
        rowMeta={(r) => String(r.text ?? '').slice(0, 90)}
      />
    </AdminPage>
  );
}
