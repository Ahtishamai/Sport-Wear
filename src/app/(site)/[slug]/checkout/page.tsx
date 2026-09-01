import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTeamStore } from '@/lib/store-queries';
import { getSettings } from '@/lib/settings';
import { getPaymentSecrets } from '@/lib/payments';
import { StoreCheckout } from '@/components/store/StoreCheckout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function StoreCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getTeamStore(slug);
  if (!store) notFound();

  const [settings, secrets] = await Promise.all([getSettings(), getPaymentSecrets()]);

  // Only the client id crosses to the browser — it is public by design. The
  // secret is read here purely to decide whether payment can be offered.
  const paymentsReady = Boolean(
    settings.paypalEnabled && settings.paypalClientId.trim() && secrets.paypalSecret
  );

  return (
    <>
      <nav aria-label="Breadcrumb" className="gutter border-b border-hairline bg-surface py-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-muted">
          <li>
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${slug}`} className="hover:text-ink">
              {store.header.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>Checkout</li>
        </ol>
      </nav>

      <StoreCheckout
        slug={slug}
        storeName={store.header.name}
        currency={settings.storeCurrency || 'USD'}
        paypalClientId={settings.paypalClientId}
        paymentsReady={paymentsReady}
        orderNote={settings.storeOrderNote}
      />
    </>
  );
}
