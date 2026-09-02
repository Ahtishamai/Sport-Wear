import { StoreEditor, type EditableStore } from '@/components/admin/StoreEditor';

export const dynamic = 'force-dynamic';

const EMPTY: EditableStore = {
  slug: '',
  name: '',
  intro: '',
  logoUrl: '',
  heroUrl: '',
  status: 'DRAFT',
  opensAt: '',
  closesAt: '',
  shipNote: '',
  contactNote: '',
  seoTitle: '',
  seoDescription: '',
  // A starting set so a new store is usable straight away; rename, reorder or
  // remove them like any other section.
  categories: [
    { name: 'Shirts', position: 0, tempId: 'seed-shirts' },
    { name: 'Pants', position: 1, tempId: 'seed-pants' },
    { name: 'Hoodies', position: 2, tempId: 'seed-hoodies' },
  ],
  items: [],
};

export default function NewStorePage() {
  return <StoreEditor store={EMPTY} />;
}
