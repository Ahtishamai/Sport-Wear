import { notFound } from 'next/navigation';
import { prisma, plain } from '@/lib/db';
import { PageBuilder, type BuilderPage } from '@/components/admin/PageBuilder';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) notFound();

  return <PageBuilder page={plain(page) as unknown as BuilderPage} />;
}
