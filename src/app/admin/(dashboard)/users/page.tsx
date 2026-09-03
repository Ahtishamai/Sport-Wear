'use client';

import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';
import { AREAS } from '@/lib/permissions';

const FIELDS: Field[] = [
  { name: 'name', label: 'Name', type: 'text', width: 'half', default: '' },
  { name: 'email', label: 'Email', type: 'text', width: 'half', default: '' },
  {
    name: 'role',
    label: 'Role',
    type: 'select',
    width: 'half',
    default: 'EDITOR',
    options: [
      { label: 'Admin — full access', value: 'ADMIN' },
      { label: 'Limited — only the areas ticked below', value: 'EDITOR' },
    ],
  },
  {
    name: 'permissions',
    label: 'Areas this account can use',
    type: 'checklist',
    default: ['orders'],
    // Only meaningful for a limited account; an admin sees everything.
    showIf: { field: 'role', equals: ['EDITOR'] },
    options: AREAS.map((a) => ({ label: `${a.label} — ${a.description}`, value: a.key })),
    help: 'Anything not ticked is hidden from the menu and refused by the server.',
  },
  {
    name: 'password',
    label: 'Password',
    type: 'text',
    width: 'half',
    default: '',
    help: 'Leave blank when editing to keep the current password. Minimum 8 characters.',
  },
];

export default function UsersAdmin() {
  return (
    <AdminPage title="Users" description="Who can sign in to this admin panel.">
      <ResourceManager
        resource="users"
        fields={FIELDS}
        title="Accounts"
        singularLabel="User"
        rowTitle={(r) => String(r.name)}
        rowMeta={(r) =>
          r.role === 'ADMIN'
            ? `${r.email} · full access`
            : `${r.email} · ${(Array.isArray(r.permissions) ? r.permissions : ['orders']).length} area(s)`
        }
      />
    </AdminPage>
  );
}
