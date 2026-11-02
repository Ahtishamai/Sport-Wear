import type { Metadata } from 'next';
import { ForgotForm } from '@/components/account/AuthForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forgotten password',
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <section className="gutter py-14 md:py-20">
      <ForgotForm />
    </section>
  );
}
