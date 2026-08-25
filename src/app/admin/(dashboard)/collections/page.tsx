import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, LinkButton, Table, Td, Th } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function CollectionsIndex() {
  const collections = await prisma.collection.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <AdminPage
      title="Collections"
      description="Each collection is its own catalog page with filters, SEO fields and optional extra sections."
      actions={
        <LinkButton href="/admin/collections/new" variant="ink">
          New collection
        </LinkButton>
      }
    >
      <Table>
        <thead>
          <tr>
            <Th>Collection</Th>
            <Th>URL</Th>
            <Th>Products</Th>
            <Th>Status</Th>
            <Th>Position</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plain(collections).map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/admin/collections/${c.handle}`} className="font-semibold hover:underline">
                  {c.title}
                </Link>
                {c.subtitle && (
                  <span className="block text-[12px] text-[#8A8C93]">{c.subtitle}</span>
                )}
              </Td>
              <Td className="text-[13px] text-[#6B6D74]">/collections/{c.handle}</Td>
              <Td className="text-[13px]">{c._count.products}</Td>
              <Td>
                <Badge tone={c.status === 'PUBLISHED' ? 'green' : 'neutral'}>{c.status}</Badge>
              </Td>
              <Td className="text-[13px]">{c.position}</Td>
              <Td className="text-right">
                <Link
                  href={`/collections/${c.handle}`}
                  target="_blank"
                  className="text-[12px] font-semibold text-[#8A8C93] hover:text-ink"
                >
                  View
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminPage>
  );
}
