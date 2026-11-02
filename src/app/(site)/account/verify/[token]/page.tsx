import type { Metadata } from 'next';
import { VerifyPanel } from '@/components/account/VerifyPanel';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
};

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <section className="gutter py-14 md:py-20">
      <VerifyPanel token={token} />
    </section>
  );
}
