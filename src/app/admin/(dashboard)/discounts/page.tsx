'use client';

import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';

const FIELDS: Field[] = [
  {
    name: 'code',
    label: 'Code',
    type: 'text',
    width: 'half',
    default: '',
    placeholder: 'SPRING25',
    help: 'What the customer types at the cart. Case does not matter.',
  },
  {
    name: 'label',
    label: 'Shown as',
    type: 'text',
    width: 'half',
    default: '',
    placeholder: 'Spring team offer',
    help: 'Printed on the cart and the invoice. Blank reads as "25% off".',
  },
  {
    name: 'kind',
    label: 'Takes off',
    type: 'select',
    width: 'half',
    default: 'PERCENT',
    options: [
      { label: 'A percentage', value: 'PERCENT' },
      { label: 'An amount in dollars', value: 'FIXED' },
    ],
  },
  {
    name: 'value',
    label: 'How much',
    type: 'number',
    width: 'half',
    default: 10,
    min: 0,
    step: 0.5,
    help: '10 means 10% or $10, depending on the row above.',
  },
  {
    name: 'scope',
    label: 'Applies to',
    type: 'select',
    width: 'half',
    default: 'ALL',
    options: [
      { label: 'The whole order', value: 'ALL' },
      { label: 'Certain collections', value: 'COLLECTIONS' },
      { label: 'Certain products', value: 'PRODUCTS' },
    ],
  },
  {
    name: 'targets',
    label: 'Which ones',
    type: 'tags',
    width: 'half',
    default: [],
    showIf: { field: 'scope', equals: ['COLLECTIONS', 'PRODUCTS'] },
    help: 'Handles — the end of the address, e.g. baseball-uniform. One per tag.',
  },
  {
    name: 'minSubtotal',
    label: 'Minimum order ($)',
    type: 'number',
    width: 'half',
    min: 0,
    step: 5,
    help: 'Leave blank for no minimum.',
  },
  {
    name: 'usageLimit',
    label: 'Total uses allowed',
    type: 'number',
    width: 'half',
    min: 1,
    step: 1,
    help: 'Blank means unlimited. Counted when an order is paid for.',
  },
  {
    name: 'perEmailLimit',
    label: 'Uses per customer',
    type: 'number',
    width: 'half',
    min: 1,
    step: 1,
    help: 'Blank means unlimited. Counted by email address.',
  },
  { name: 'startsAt', label: 'Live from', type: 'datetime', width: 'half' },
  { name: 'endsAt', label: 'Live until', type: 'datetime', width: 'half' },
  {
    name: 'active',
    label: 'Active',
    type: 'boolean',
    width: 'half',
    default: true,
    help: 'Switch off to stop a code without deleting it.',
  },
  { name: 'note', label: 'Note to yourself', type: 'textarea', rows: 2, default: '' },
];

export default function DiscountsAdmin() {
  return (
    <AdminPage
      title="Discount codes"
      description="Codes a customer types at the cart. Every one is checked again on the server when the order is placed, so an expired or used-up code cannot be spent from a stale page."
    >
      <ResourceManager
        resource="discounts"
        fields={FIELDS}
        title="Codes"
        singularLabel="code"
        rowTitle={(r) => String(r.code)}
        rowMeta={(r) => {
          const off = r.kind === 'PERCENT' ? `${Number(r.value)}% off` : `$${Number(r.value)} off`;
          const used =
            r.usageLimit === null || r.usageLimit === undefined
              ? `${r.usedCount ?? 0} used`
              : `${r.usedCount ?? 0} of ${r.usageLimit} used`;
          const where =
            r.scope === 'ALL'
              ? 'whole order'
              : `${Array.isArray(r.targets) ? r.targets.length : 0} ${String(r.scope).toLowerCase()}`;
          return `${off} · ${where} · ${used}${r.active ? '' : ' · switched off'}`;
        }}
      />
    </AdminPage>
  );
}
