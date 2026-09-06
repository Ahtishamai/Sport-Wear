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
        <h2 className="h-section" style={{ fontSize: 'clamp(22px,3vw,30px)' }}>
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
