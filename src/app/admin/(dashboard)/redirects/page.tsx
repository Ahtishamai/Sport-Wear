'use client';

import { AdminPage } from '@/components/admin/ui';
import { ResourceManager } from '@/components/admin/ResourceManager';
import type { Field } from '@/lib/blocks/types';

const FIELDS: Field[] = [
  {
    name: 'from',
    label: 'Old address',
    type: 'text',
    width: 'half',
    default: '',
    placeholder: '/baseball-jerseys',
    help: 'The part after the domain. Capitals and a trailing slash do not matter. End it in /* to catch everything below it.',
  },
  {
    name: 'to',
    label: 'Send it to',
    type: 'text',
    width: 'half',
    default: '',
    placeholder: '/collections/baseball-uniform',
    help: 'A path on this site, or a full https:// address. If the old address ends in /*, ending this in /* too carries the rest across.',
  },
  {
    name: 'kind',
    label: 'Kind',
    type: 'select',
    width: 'half',
    default: 'PERMANENT',
    options: [
      { label: 'Permanent — the page has moved for good', value: 'PERMANENT' },
      { label: 'Temporary — it will be back', value: 'TEMPORARY' },
    ],
    help: 'Permanent is what passes the old address’s search ranking to the new one. Use temporary only while something is genuinely away.',
  },
  {
    name: 'active',
    label: 'Active',
    type: 'boolean',
    width: 'half',
    default: true,
    help: 'Switch off to stop a rule without deleting it.',
  },
  { name: 'note', label: 'Note to yourself', type: 'textarea', rows: 2, default: '' },
];

export default function RedirectsAdmin() {
  return (
    <AdminPage
      title="Redirects"
      description="Where to send a visitor who asks for an address that no longer works. A rule is only consulted after the site has failed to find the page itself, so adding one can never take a live page off the site."
    >
      <ResourceManager
        resource="redirects"
        fields={FIELDS}
        title="Rules"
        singularLabel="redirect"
        rowTitle={(r) => `${r.from}  →  ${r.to}`}
        rowMeta={(r) => {
          const kind = r.kind === 'TEMPORARY' ? 'temporary' : 'permanent';
          const used = r.hits ? `used ${r.hits} ${r.hits === 1 ? 'time' : 'times'}` : 'not used yet';
          return `${kind} · ${used}${r.active ? '' : ' · switched off'}`;
        }}
      />
    </AdminPage>
  );
}
