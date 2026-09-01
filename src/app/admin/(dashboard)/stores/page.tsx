import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, LinkButton, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/utils';
import { DeleteRecord } from '@/components/admin/DeleteRecord';

export const dynamic = 'force-dynamic';

const TONE = { OPEN: 'green', CLOSED: 'neutral', DRAFT: 'yellow' } as const;

export default async function StoresIndex() {
  const stores = await prisma.teamStore.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true, orders: true } },
    },
  });

  return (
    <AdminPage
      title="Team stores"
      description="Each store is its own shop at its own web address, with its own designs and checkout."
      actions={
        <LinkButton href="/admin/stores/new" variant="ink">
          New store
        </LinkButton>
      }
    >
      <Table>
        <thead>
          <tr>
            <Th>Team</Th>
            <Th>Address</Th>
            <Th>Designs</Th>
            <Th>Orders</Th>
            <Th>Closes</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plain(stores).map((s) => (
            <tr key={s.id}>
              <Td>
                <Link href={`/admin/stores/${s.slug}`} className="font-semibold hover:underline">
                  {s.name}
                </Link>
              </Td>
              <Td className="text-[13px] text-[#6B6D74]">/{s.slug}</Td>
              <Td className="text-[13px]">{s._count.items}</Td>
              <Td className="text-[13px]">{s._count.orders}</Td>
              <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                {s.closesAt ? formatDateTime(s.closesAt) : '—'}
              </Td>
              <Td>
                <Badge tone={TONE[s.status as keyof typeof TONE] ?? 'neutral'}>{s.status}</Badge>
              </Td>
              <Td className="text-right">
                <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[12px] font-semibold">
                  <Link href={`/admin/stores/${s.slug}`} className="text-ink hover:underline">
                    Edit
                  </Link>
                  <Link
                    href={`/${s.slug}`}
                    target="_blank"
                    className="text-[#8A8C93] hover:text-ink"
                  >
                    View
                  </Link>
                  <DeleteRecord resource="stores" id={s.id} name={`the ${s.name} store`} />
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {stores.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[#8A8C93]">
          No team stores yet. Create one to give a team its own ordering page.
        </p>
      )}
    </AdminPage>
  );
}
