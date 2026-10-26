import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import { getPaymentSecrets } from '@/lib/payments';
import { ShopCheckout } from '@/components/shop/ShopCheckout';
import { PageHeaderBlock } from '@/components/blocks/sections';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Confirm your order and pay securely.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const [settings, secrets] = await Promise.all([getSettings(), getPaymentSecrets()]);

  // Only the client id crosses to the browser — it is public by design. The
  // secret is read here purely to decide whether payment can be offered.
  const paymentsReady = Boolean(
    settings.paypalEnabled && settings.paypalClientId.trim() && secrets.paypalSecret
  );

  return (
    <>
      <PageHeaderBlock
        p={{ eyebrow: 'Almost there', heading: 'Checkout', body: '', showBreadcrumb: true }}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
      />
      <section className="gutter py-10 md:py-14">
        <ShopCheckout
          paypalClientId={settings.paypalClientId}
          paymentsReady={paymentsReady}
          currency={settings.storeCurrency || 'USD'}
        />
      </section>
    </>
  );
}
