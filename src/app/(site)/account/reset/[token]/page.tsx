import type { Metadata } from 'next';
import { ResetForm } from '@/components/account/AuthForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

/**
 * The token is not spent here, only carried.
 *
 * Mail clients and link scanners open every address in a message before the
 * person does; spending it on render would burn the link before it reached
 * them. It is spent when the new password is submitted.
 */
export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <section className="gutter py-14 md:py-20">
      <ResetForm token={token} />
    </section>
  );
}
