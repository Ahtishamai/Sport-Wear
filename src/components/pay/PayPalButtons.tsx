'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Loads the PayPal SDK once and mounts the buttons.
 *
 * Shared by the team-store checkout and the invoice payment page, which differ
 * only in which endpoints start and finish the payment. The money path is
 * identical and there should only be one of it.
 *
 * Neither endpoint trusts the browser with the amount: `createUrl` returns the
 * PayPal order id for a total the server decided, and `captureUrl` re-checks
 * that total before anything is marked paid.
 */
export function PayPalButtons({
  clientId,
  currency,
  disabled,
  createUrl,
  captureUrl,
  buildBody,
  onPaid,
  onError,
  label = 'pay',
}: {
  clientId: string;
  currency: string;
  disabled: boolean;
  createUrl: string;
  captureUrl: string;
  buildBody: () => unknown;
  onPaid: (result: { reference: string; amount?: number; currency?: string }) => void;
  onError: (message: string) => void;
  label?: 'pay' | 'paypal' | 'checkout';
}) {
  const host = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  // Read through refs so the buttons always see current form state without
  // being torn down and re-rendered on every keystroke.
  const latest = useRef({ disabled, buildBody, onPaid, onError, createUrl, captureUrl });
  latest.current = { disabled, buildBody, onPaid, onError, createUrl, captureUrl };

  useEffect(() => {
    const id = 'paypal-sdk';
    if (document.getElementById(id)) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`;
    script.onload = () => setSdkReady(true);
    script.onerror = () => onError('Could not load PayPal. Please refresh and try again.');
    document.body.appendChild(script);
  }, [clientId, currency, onError]);

  useEffect(() => {
    const paypal = (window as any).paypal;
    if (!sdkReady || !paypal || !host.current || host.current.childElementCount > 0) return;

    paypal
      .Buttons({
        style: { layout: 'vertical', shape: 'rect', label, height: 46 },
        onClick: (_d: unknown, actions: any) =>
          latest.current.disabled ? actions.reject() : actions.resolve(),
        createOrder: async () => {
          latest.current.onError('');
          const res = await fetch(latest.current.createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(latest.current.buildBody()),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.paypalOrderId) {
            // Thrown so PayPal closes its window; the message is what the
            // server said, which is the only thing worth telling anyone.
            const message = json.error || 'Could not start the payment.';
            latest.current.onError(message);
            throw new Error(message);
          }
          return json.paypalOrderId;
        },
        onApprove: async (data: { orderID: string }) => {
          const res = await fetch(latest.current.captureUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paypalOrderId: data.orderID }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            latest.current.onError(json.error || 'The payment did not complete.');
            return;
          }
          latest.current.onPaid(json);
        },
        onError: (err: unknown) => {
          console.error('[paypal]', err);
          latest.current.onError('PayPal reported a problem. Please try again.');
        },
      })
      .render(host.current);
  }, [sdkReady, label]);

  return <div ref={host} />;
}
