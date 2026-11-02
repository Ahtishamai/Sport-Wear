import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer';
import { SignUpForm } from '@/components/account/AuthForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Make an account',
  description: 'Keep your orders together and reorder in one press.',
  robots: { index: false, follow: true },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCustomerSession()) redirect(next?.startsWith('/') ? next : '/account');

  return (
    <section className="gutter py-14 md:py-20">
      <SignUpForm next={next} />
    </section>
  );
}
