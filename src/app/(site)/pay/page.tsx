import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import { getPayPalConfig } from '@/lib/paypal';
import { PayForm } from '@/components/pay/PayForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.payHeading || 'Pay for your order',
    description:
      s.payIntro ||
      'Settle an invoice from us online — enter your invoice number and amount and pay securely.',
    alternates: { canonical: '/pay' },
    // An invoice payment form has nothing to offer a search engine and should
    // not compete with the pages that do.
    robots: { index: false, follow: true },
  };
}

/**
 * Pay an invoice the shop has already sent.
 *
 * Separate from the team-store checkout on purpose: there is no cart, no
 * personalisation and nothing to price. The customer has a paper figure and
 * wants to hand it over.
 */
export default async function PayPage() {
  const [s, paypal] = await Promise.all([getSettings(), getPayPalConfig()]);
  if (!s.payEnabled) notFound();

  return (
    <>
      <section className="border-b border-hairline bg-ink py-14 text-white md:py-16">
        <div className="gutter">
          <span className="mb-4 inline-block bg-brand px-3 py-2 text-[10px] font-bold uppercase leading-snug tracking-[.14em] text-ink md:text-[12px]">
            Secure payment
          </span>
          <h1 className="h-display max-w-[760px] text-white" style={{ fontSize: 'clamp(28px,5vw,52px)' }}>
            {s.payHeading}
          </h1>
          {s.payIntro && (
            <p className="mt-4 max-w-[620px] text-[16px] leading-relaxed text-ondark md:text-[18px]">
              {s.payIntro}
            </p>
          )}
        </div>
      </section>

      <div className="gutter py-12 md:py-16">
        <div className="mx-auto max-w-[720px]">
          <PayForm
            paypalClientId={paypal.clientId}
            currency={paypal.currency}
            paymentsReady={paypal.enabled && Boolean(paypal.clientId)}
            min={Number(s.payMin) > 0 ? Number(s.payMin) : 1}
            max={Number(s.payMax) > 0 ? Number(s.payMax) : 10000}
            help={s.payHelp}
            successTitle={s.paySuccessTitle}
            successBody={s.paySuccessBody}
          />

          <p className="mt-6 text-center text-[13px] text-muted">
            Payments are handled by PayPal — you can pay with a PayPal balance or any card, and we
            never see your card details. Questions?{' '}
            {s.phone ? (
              <a href={s.phoneHref || `tel:${s.phone}`} className="font-semibold text-ink underline">
                {s.phone}
              </a>
            ) : null}
            {s.phone && s.email ? ' or ' : ''}
            {s.email ? (
              <a href={`mailto:${s.email}`} className="font-semibold text-ink underline">
                {s.email}
              </a>
            ) : null}
          </p>
        </div>
      </div>
    </>
  );
}
