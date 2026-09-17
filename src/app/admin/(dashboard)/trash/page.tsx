import { getAccessor } from '@/lib/auth';
import { plain } from '@/lib/db';
import { canUseResource } from '@/lib/permissions';
import { listTrash, TRASH } from '@/lib/trash';
import { AdminPage } from '@/components/admin/ui';
import { TrashList } from '@/components/admin/TrashList';

export const dynamic = 'force-dynamic';

/**
 * Everything deleted in the admin, until it is restored or deleted forever.
 * Each person only sees what came from areas they can manage.
 */
export default async function TrashPage() {
  const user = await getAccessor();
  const items = user
    ? (await listTrash())
        .filter((i) => canUseResource(user, i.resource))
        .map((i) => ({ ...i, kind: TRASH[i.resource]?.kind ?? i.resource }))
    : [];

  return (
    <AdminPage
      title="Trash"
      description="Deleted items wait here. Restore puts them back exactly where they were; nothing is erased until you choose Delete forever."
    >
      <TrashList items={plain(items)} canPurge={user?.role === 'ADMIN'} />
    </AdminPage>
  );
}
