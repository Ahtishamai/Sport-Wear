'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PayPalButtons } from './PayPalButtons';
import { parsePayAmount, payMoney } from '@/lib/utils';

/**
 * Pay an invoice the shop has already sent.
 *
 * The customer holds the invoice, so they type the number and the amount.
 * Everything typed here is checked again on the server — these bounds only
 * exist to say what is wrong before PayPal opens, not to decide anything.
 */
export function PayForm({
  paypalClientId,
  currency,
  paymentsReady,
  min,
  max,
  help,
  successTitle,
  successBody,
}: {
  paypalClientId: string;
  currency: string;
  paymentsReady: boolean;
  min: number;
  max: number;
  help: string;
  successTitle: string;
  successBody: string;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  // Where the order goes. Kept as one object because it travels as one.
  const [ship, setShip] = useState({
    line1: '',
    line2: '',
    city: '',
    region: '',
    postcode: '',
    country: 'United States',
  });
  const setAddr = (k: keyof typeof ship, v: string) => setShip((a) => ({ ...a, [k]: v }));
  const [error, setError] = useState('');
  const [done, setDone] = useState<null | { reference: string; amount?: number }>(null);

  // The same parser the server uses, so what is shown here and what is charged
  // cannot drift apart.
  const { amount: value, problem } = parsePayAmount(amount, min, max);
  const amountOk = value !== null && !problem;
  const canPay = Boolean(invoiceNumber.trim()) && amountOk;
  // Nothing typed yet is not a mistake worth shouting about.
  const amountProblem = amount.trim() ? problem : '';

  if (done) {
    return (
      <div className="border border-hairline bg-surface p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E4F4EA] text-[22px] text-[#1F8A4C]">
          ✓
        </span>
        <h2 className="h-section" style={{ fontSize: 'clamp(20px,2vw,26px)' }}>
          {successTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-relaxed text-body">
          {successBody}
        </p>

        <dl className="mx-auto mt-6 max-w-[360px] border-t border-hairline pt-5 text-[14px]">
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">Payment reference</dt>
            <dd className="font-display font-bold">{done.reference}</dd>
          </div>
          {typeof done.amount === 'number' && (
            <div className="flex justify-between py-1.5">
              <dt className="text-muted">Amount paid</dt>
              <dd className="font-display font-bold">{payMoney(done.amount)}</dd>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">Invoice</dt>
            <dd className="font-semibold">{invoiceNumber}</dd>
          </div>
        </dl>

        <Link href="/" className="btn btn-ink btn-lg mt-7 inline-flex">
          Back to the site
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-hairline bg-white p-6 md:p-8">
      <div className="grid gap-5">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">
            Invoice number
          </span>
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="e.g. INV-2291"
            maxLength={64}
            autoComplete="off"
            className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">
            Amount to pay
          </span>
          <span className="relative flex items-center">
            <span className="pointer-events-none absolute left-4 font-display text-[18px] font-bold text-muted">
              $
            </span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              maxLength={12}
              autoComplete="off"
              className="w-full border border-hairline bg-white py-3 pl-9 pr-4 text-[16px] outline-none focus:border-ink"
            />
          </span>
          {amountProblem ? (
            <span className="mt-1.5 block text-[12px] font-semibold text-[#C42027]">
              {amountProblem}
            </span>
          ) : (
            <span className="mt-1.5 block text-[12px] text-muted">
              Exactly as shown on your invoice. {payMoney(min)}–{payMoney(max)} online.
            </span>
          )}
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">
              Your name <span className="font-normal normal-case tracking-normal">(optional)</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">
              Email for the receipt{' '}
              <span className="font-normal normal-case tracking-normal">(optional)</span>
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={160}
              className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
            />
          </label>
        </div>

        {/*
          The delivery address.
          Asked for here because an invoice is often paid by somebody other
          than whoever placed the order — a parent settling a coach's invoice
          — and the shop then has a payment with nowhere to send the kit.
          Optional, and all or nothing: a street with no town is not an
          address anybody can pack against, so a half filled one is kept out
          of the packer's way rather than shown as though it were usable.
        */}
        <fieldset className="border border-hairline p-4 sm:p-5">
          <legend className="px-1.5 text-[12px] font-bold uppercase tracking-[.1em] text-muted">
            Delivery address{' '}
            <span className="font-normal normal-case tracking-normal">(optional)</span>
          </legend>
          <p className="mb-4 text-[13px] text-body">
            Fill this in if the order still has to be sent somewhere. Leave it
            empty if we already have the address.
          </p>
          <div className="grid gap-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">Street address</span>
              <input
                value={ship.line1}
                onChange={(e) => setAddr('line1', e.target.value)}
                maxLength={120}
                autoComplete="address-line1"
                className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">
                Apartment, suite{' '}
                <span className="font-normal normal-case tracking-normal">(optional)</span>
              </span>
              <input
                value={ship.line2}
                onChange={(e) => setAddr('line2', e.target.value)}
                maxLength={120}
                autoComplete="address-line2"
                className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">Town or city</span>
                <input
                  value={ship.city}
                  onChange={(e) => setAddr('city', e.target.value)}
                  maxLength={80}
                  autoComplete="address-level2"
                  className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">State</span>
                <input
                  value={ship.region}
                  onChange={(e) => setAddr('region', e.target.value)}
                  maxLength={80}
                  autoComplete="address-level1"
                  className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">ZIP code</span>
                <input
                  value={ship.postcode}
                  onChange={(e) => setAddr('postcode', e.target.value)}
                  maxLength={20}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">Country</span>
              <input
                value={ship.country}
                onChange={(e) => setAddr('country', e.target.value)}
                maxLength={60}
                autoComplete="country-name"
                className="w-full border border-hairline bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
              />
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.1em] text-muted">
            Anything we should know{' '}
            <span className="font-normal normal-case tracking-normal">(optional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={800}
            className="w-full border border-hairline bg-white px-4 py-3 text-[15px] outline-none focus:border-ink"
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]"
        >
          {error}
        </p>
      )}

      <div className="mt-6 border-t border-hairline pt-6">
        {!paymentsReady ? (
          <p className="border border-hairline bg-surface px-4 py-3 text-[13px] text-body">
            Online payment is not switched on yet. Please contact us to settle this invoice.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-[13px] font-semibold uppercase tracking-[.1em] text-muted">
                Paying now
              </span>
              <span className="font-display text-[26px] font-black leading-none">
                {amountOk ? payMoney(value) : '—'}
              </span>
            </div>

            <div className={canPay ? '' : 'pointer-events-none opacity-40'}>
              <PayPalButtons
                clientId={paypalClientId}
                currency={currency}
                disabled={!canPay}
                createUrl="/api/pay/checkout"
                captureUrl="/api/pay/capture"
                onError={setError}
                buildBody={() => ({
                  invoiceNumber,
                  amount,
                  customerName: name,
                  email,
                  note,
                  shipTo: ship,
                })}
                onPaid={(result) => setDone({ reference: result.reference, amount: result.amount })}
              />
            </div>

            {!canPay && (
              <p className="mt-3 text-center text-[12px] text-muted">
                Enter your invoice number and amount to continue.
              </p>
            )}
          </>
        )}
      </div>

      {help && <p className="mt-5 text-[12px] leading-relaxed text-muted">{help}</p>}
    </div>
  );
}
