import { AdminPage } from '@/components/admin/ui';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export const dynamic = 'force-dynamic';

export default function MediaPage() {
  return (
    <AdminPage
      title="Media"
      description="Every image used across the site. Files are stored under /public/uploads and served with long-lived caching."
    >
      <MediaLibrary />
    </AdminPage>
  );
}
