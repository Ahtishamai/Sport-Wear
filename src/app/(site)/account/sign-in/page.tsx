import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer';
import { SignInForm } from '@/components/account/AuthForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to see your orders and order the same kit again.',
  robots: { index: false, follow: true },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCustomerSession()) redirect(next?.startsWith('/') ? next : '/account');

  return (
    <section className="gutter py-14 md:py-20">
      <SignInForm next={next} />
    </section>
  );
}
