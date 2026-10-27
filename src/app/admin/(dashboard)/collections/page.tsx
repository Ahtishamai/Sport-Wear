import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, LinkButton, Table, Td, Th } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function CollectionsIndex() {
  const collections = await prisma.collection.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  // Listed as a tree: every primary collection, each followed by the
  // sub-collections filed under it, so the table reads like the menu does.
  const rows = plain(collections);
  const ordered = rows
    .filter((c) => !c.parentId)
    .flatMap((parent) => [
      { ...parent, depth: 0 },
      ...rows.filter((c) => c.parentId === parent.id).map((c) => ({ ...c, depth: 1 })),
    ]);
  // A sub-collection whose parent is a draft, or otherwise unreachable above,
  // would drop off the list entirely — keep it at the end rather than lose it.
  const shown = [
    ...ordered,
    ...rows.filter((c) => !ordered.some((o) => o.id === c.id)).map((c) => ({ ...c, depth: 0 })),
  ];

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
            <Th>Sits under</Th>
            <Th>URL</Th>
            <Th>Products</Th>
            <Th>Status</Th>
            <Th>Position</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {shown.map((c) => (
            <tr key={c.id}>
              <Td>
                <span style={c.depth ? { paddingLeft: 18 } : undefined} className="block">
                  {c.depth > 0 && <span className="mr-1.5 text-[#B5B7BC]">└</span>}
                  <Link
                    href={`/admin/collections/${c.handle}`}
                    className="font-semibold hover:underline"
                  >
                    {c.title}
                  </Link>
                  {c.subtitle && (
                    <span className="block text-[12px] text-[#8A8C93]">{c.subtitle}</span>
                  )}
                </span>
              </Td>
              <Td className="text-[13px] text-[#6B6D74]">
                {c.parentId
                  ? (rows.find((r) => r.id === c.parentId)?.title ?? '—')
                  : 'Primary collection'}
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
