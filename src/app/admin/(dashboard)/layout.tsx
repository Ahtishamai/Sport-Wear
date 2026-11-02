import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAccessor } from '@/lib/auth';
import { allowedAreas, canUsePath, landingPath } from '@/lib/permissions';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFont } from '../admin-font';

export const metadata = {
  title: 'Admin — Design Sportswear',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAccessor();
  if (!session) redirect('/admin/login');

  // Typing a URL should not get anyone into an area they cannot use. The API
  // refuses them too, but a half-loading screen is a poor way to find out.
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (pathname && !canUsePath(session, pathname)) {
    redirect(landingPath(session));
  }

  return (
    <div className={`${adminFont.variable} admin-type`}>
      <AdminShell user={session} areas={allowedAreas(session)}>
        {children}
      </AdminShell>
    </div>
  );
}
