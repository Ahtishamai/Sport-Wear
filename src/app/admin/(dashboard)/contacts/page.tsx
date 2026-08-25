import { prisma, plain } from '@/lib/db';
import { AdminPage } from '@/components/admin/ui';
import { ContactList } from '@/components/admin/ContactList';

export const dynamic = 'force-dynamic';

export default async function ContactsIndex() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <AdminPage
      title="Contact messages"
      description="Everything sent through the contact form."
    >
      <ContactList messages={plain(messages)} />
    </AdminPage>
  );
}
