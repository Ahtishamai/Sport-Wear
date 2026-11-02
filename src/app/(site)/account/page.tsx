import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCustomer, ordersWhere } from '@/lib/customer';
import { getMailConfig, isMailReady } from '@/lib/mail';
import { money } from '@/lib/utils';
import { PageHeaderBlock } from '@/components/blocks/sections';
import {
  DetailsForm,
  PasswordForm,
  SignOutButton,
  VerifyBanner,
} from '@/components/account/AccountPanels';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

const STATUS: Record<string, { label: string; tone: string }> = {
  PAID: { label: 'Paid', tone: 'bg-[#E4F4EA] text-[#15663a]' },
  PENDING: { label: 'Awaiting payment', tone: 'bg-brand-tint text-brand-deep' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-[#FBE7E8] text-[#8c1319]' },
  REFUNDED: { label: 'Refunded', tone: 'bg-plate text-body' },
};

const when = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default async function AccountPage() {
  const me = await getCustomer();
  if (!me) redirect('/account/sign-in?next=/account');

  const [orders, mail] = await Promise.all([
    prisma.shopOrder.findMany({
      where: ordersWhere(me),
      select: {
        reference: true,
        status: true,
        total: true,
        createdAt: true,
        items: { select: { quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    getMailConfig(),
  ]);

  const ship = (me.shipTo ?? {}) as Record<string, string>;

  return (
    <>
      <PageHeaderBlock
        p={{
          // Not the email address: the eyebrow is set in capitals, and an
          // address shouted back at someone reads as a mistake. It is printed
          // plainly beside the sign-out link instead.
          eyebrow: 'Your account',
          heading: `Hello, ${me.name.split(' ')[0]}`,
          body: '',
          showBreadcrumb: true,
        }}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'My account' }]}
      />

      <section className="gutter py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-14">
          <div>
            {!me.verifiedAt && (
              <div className="mb-7">
                <VerifyBanner email={me.email} mailReady={isMailReady(mail)} />
              </div>
            )}

            <h2 className="h-display text-[20px] md:text-[22px]">Your orders</h2>

            {orders.length === 0 ? (
              <div className="mt-5 border border-dashed border-hairline bg-surface px-6 py-12 text-center">
                <p className="text-[15px] text-body">
                  {me.verifiedAt
                    ? 'Nothing here yet. Whatever you order will be waiting next time.'
                    : 'Nothing here yet — and any orders you placed as a guest stay hidden until the address above is confirmed.'}
                </p>
                <Link href="/collections" className="btn btn-yellow btn-md mt-6">
                  Browse the catalogue
                </Link>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-hairline border border-hairline bg-white">
                {orders.map((o) => {
                  const units = o.items.reduce((n, i) => n + i.quantity, 0);
                  const badge = STATUS[o.status] ?? { label: o.status, tone: 'bg-plate text-body' };
                  return (
                    <li key={o.reference}>
                      <Link
                        href={`/account/orders/${o.reference}`}
                        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-surface"
                      >
                        <span className="min-w-[160px]">
                          <span className="block font-display text-[15px] font-extrabold">
                            {o.reference}
                          </span>
                          <span className="micro block text-faint">{when(o.createdAt)}</span>
                        </span>
                        <span
                          className={`inline-block whitespace-nowrap px-2 py-1 text-[11px] font-bold uppercase tracking-[.08em] ${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[14px] text-body">
                          {units} {units === 1 ? 'item' : 'items'}
                        </span>
                        <span className="font-display text-[16px] font-extrabold tabular-nums">
                          {money(Number(o.total))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-10">
            <div className="border border-hairline bg-white p-6">
              <h2 className="h-display text-[18px]">Your details</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-body">
                The next checkout starts from these, so you are not typing your address out again.
              </p>
              <div className="mt-5">
                <DetailsForm
                  initial={{
                    name: me.name,
                    phone: me.phone ?? '',
                    shipTo: {
                      line1: ship.line1 ?? '',
                      line2: ship.line2 ?? '',
                      city: ship.city ?? '',
                      state: ship.state ?? '',
                      postcode: ship.postcode ?? '',
                    },
                  }}
                />
              </div>
            </div>

            <div className="border border-hairline bg-white p-6">
              <h2 className="h-display text-[18px]">Password</h2>
              <div className="mt-5">
                <PasswordForm />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-hairline pt-5">
              <span className="text-[13.5px] text-muted">{me.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
