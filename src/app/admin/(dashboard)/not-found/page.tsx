'use client';

import { AdminPage, LinkButton } from '@/components/admin/ui';
import { NotFoundMonitor } from '@/components/admin/NotFoundMonitor';

export default function NotFoundAdmin() {
  return (
    <AdminPage
      title="Dead ends"
      description="Every address a visitor or a search engine asked for and did not get. The loudest one is the one worth mending first — type where it should go and the redirect is written for you."
      actions={<LinkButton href="/admin/redirects">Redirects</LinkButton>}
    >
      <NotFoundMonitor />
    </AdminPage>
  );
}
