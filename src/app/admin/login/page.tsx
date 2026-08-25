import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/components/admin/LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in — Admin', robots: { index: false } };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[22px] font-black uppercase tracking-[.08em] text-white">
            Design<span className="text-brand">SW</span>
          </h1>
          <p className="mt-2 text-[13px] text-white/50">Sign in to manage the site</p>
        </div>
        <div className="bg-white p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
