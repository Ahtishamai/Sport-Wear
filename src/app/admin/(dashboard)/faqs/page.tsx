'use client';

import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';

const FIELDS: Field[] = [
  { name: 'question', label: 'Question', type: 'text', default: '' },
  { name: 'answer', label: 'Answer', type: 'textarea', rows: 4, default: '' },
  {
    name: 'group',
    label: 'Group',
    type: 'select',
    width: 'half',
    default: 'home',
    options: [
      { label: 'Home', value: 'home' },
      { label: 'Product', value: 'product' },
      { label: 'Contact', value: 'contact' },
    ],
  },
  { name: 'published', label: 'Published', type: 'boolean', width: 'half', default: true },
];

export default function FaqsAdmin() {
  return (
    <AdminPage
      title="FAQs"
      description="Each FAQ block on a page pulls from one of these groups. Answers are also eligible for FAQ rich results."
    >
      <ResourceManager
        resource="faqs"
        fields={FIELDS}
        title="Questions"
        singularLabel="FAQ"
        rowTitle={(r) => String(r.question)}
        rowMeta={(r) => `${r.group} · ${r.published ? 'published' : 'hidden'}`}
      />
    </AdminPage>
  );
}
