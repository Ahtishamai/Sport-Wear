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
  items: [],
};

export default function NewStorePage() {
  return <StoreEditor store={EMPTY} />;
}
