import Link from 'next/link';
import Image from 'next/image';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Badge, LinkButton, Table, Td, Th } from '@/components/admin/ui';
import { money } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProductsIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const products = await prisma.product.findMany({
    where: q ? { OR: [{ title: { contains: q } }, { handle: { contains: q } }] } : undefined,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      collections: { include: { collection: { select: { title: true } } } },
    },
  });

  return (
    <AdminPage
      title="Products"
      description="Everything in the catalog. Prices are the “starting at” per-unit figure shown on the site."
      actions={
        <>
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search products…"
              className="field !py-2 text-[13px]"
            />
          </form>
          <LinkButton href="/admin/products/new" variant="ink">
            New product
          </LinkButton>
        </>
      }
    >
      <Table>
        <thead>
          <tr>
            <Th className="w-[64px]" />
            <Th>Product</Th>
            <Th>Collections</Th>
            <Th>From</Th>
            <Th>Badge</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {plain(products).map((p) => (
            <tr key={p.id}>
              <Td>
                <span className="relative block h-[44px] w-[44px] bg-[#F0F0ED]">
                  {p.images[0]?.url ? (
                    <Image
                      src={p.images[0].url}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
              </Td>
              <Td>
                <Link
                  href={`/admin/products/${p.handle}`}
                  className="font-semibold hover:underline"
                >
                  {p.title}
                </Link>
                <span className="block text-[12px] text-[#8A8C93]">/{p.handle}</span>
              </Td>
              <Td className="text-[13px] text-[#6B6D74]">
                {p.collections.map((c: { collection: { title: string } }) => c.collection.title).join(', ') || '—'}
              </Td>
              <Td className="whitespace-nowrap font-semibold">{money(Number(p.basePrice))}</Td>
              <Td className="text-[13px]">{p.badge || '—'}</Td>
              <Td>
                <Badge tone={p.status === 'PUBLISHED' ? 'green' : 'neutral'}>{p.status}</Badge>
                {p.featured && (
                  <span className="ml-1.5">
                    <Badge tone="yellow">Featured</Badge>
                  </span>
                )}
              </Td>
              <Td className="text-right">
                <Link
                  href={`/products/${p.handle}`}
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

      {products.length === 0 && (
        <p className="mt-6 text-center text-[14px] text-[#8A8C93]">
          No products found{q ? ` for “${q}”` : ''}.
        </p>
      )}
    </AdminPage>
  );
}
