import Link from 'next/link';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, Table, Td, Th } from '@/components/admin/ui';
import { NewPageButton } from '@/components/admin/NewPageButton';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PagesIndex() {
  const pages = await prisma.page.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] });

  return (
    <AdminPage
      title="Pages"
      description="Every page is built from sections. Open one to edit it visually with a live preview."
      actions={<NewPageButton />}
    >
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>URL</Th>
            <Th>Sections</Th>
            <Th>Status</Th>
            <Th>Updated</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plain(pages).map((p) => {
            const count = Array.isArray(p.blocks) ? p.blocks.length : 0;
            const href = p.slug === 'home' ? '/' : `/${p.slug}`;
            return (
              <tr key={p.id}>
                <Td>
                  <Link
                    href={`/admin/pages/${p.slug}/edit`}
                    className="font-semibold hover:underline"
                  >
                    {p.title}
                  </Link>
                  {p.isSystem && (
                    <span className="ml-2 text-[11px] font-semibold uppercase tracking-[.1em] text-[#9A9CA2]">
                      system
                    </span>
                  )}
                </Td>
                <Td className="text-[13px] text-[#6B6D74]">{href}</Td>
                <Td className="text-[13px]">{count}</Td>
                <Td>
                  <Badge tone={p.status === 'PUBLISHED' ? 'green' : 'neutral'}>{p.status}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-[12px] text-[#8A8C93]">
                  {formatDate(p.updatedAt)}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/admin/pages/${p.slug}/edit`}
                    className="text-[12px] font-semibold hover:text-brand-text"
                  >
                    Edit →
                  </Link>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </AdminPage>
  );
}
