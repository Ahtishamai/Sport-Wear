import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';

export const dynamic = 'force-dynamic';

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
      { label: 'Editor — content only', value: 'EDITOR' },
    ],
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
        rowMeta={(r) => `${r.email} · ${r.role}`}
      />
    </AdminPage>
  );
}
