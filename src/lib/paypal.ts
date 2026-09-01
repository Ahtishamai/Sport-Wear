import 'server-only';
import { getSettings } from './settings';
import { getPaymentSecrets } from './payments';

/**
 * PayPal Orders v2.
 *
 * The browser only ever sees the client id. The secret stays here, and the
 * amount charged is the one this server computed — the create call sends its
 * own total, and the capture is checked against it before an order is marked
 * paid.
 */

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly detail?: string
  ) {
    super(message);
  }
}

export type PayPalConfig = {
  enabled: boolean;
  mode: 'sandbox' | 'live';
  clientId: string;
  secret: string;
  currency: string;
};

export async function getPayPalConfig(): Promise<PayPalConfig> {
  const [s, secrets] = await Promise.all([getSettings(), getPaymentSecrets()]);
  return {
    enabled: Boolean(s.paypalEnabled),
    mode: s.paypalMode === 'live' ? 'live' : 'sandbox',
    clientId: (s.paypalClientId ?? '').trim(),
    secret: secrets.paypalSecret,
    currency: (s.storeCurrency || 'USD').toUpperCase(),
  };
}

const apiBase = (mode: string) =>
  mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

/** Overridable so tests can point at a local stand-in instead of PayPal. */
const base = (mode: string) => process.env.PAYPAL_API_BASE || apiBase(mode);

async function accessToken(cfg: PayPalConfig): Promise<string> {
  if (!cfg.clientId || !cfg.secret) {
    throw new PayPalError(
      'PayPal is not configured.',
      'Add the client ID and secret in Admin → Site settings → Payments.'
    );
  }
  const auth = Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString('base64');
  let res: Response;
  try {
    res = await fetch(`${base(cfg.mode)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
  } catch {
    throw new PayPalError('Could not reach PayPal.');
  }
  if (!res.ok) {
    throw new PayPalError(
      'PayPal rejected the account credentials.',
      `Token request returned ${res.status}. Check the client ID and secret, and that they match the ${cfg.mode} environment.`
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new PayPalError('PayPal did not return an access token.');
  return json.access_token;
}

type CreateArgs = {
  reference: string;
  total: number;
  currency: string;
  description: string;
};

export async function createPayPalOrder(args: CreateArgs): Promise<string> {
  const cfg = await getPayPalConfig();
  if (!cfg.enabled) throw new PayPalError('Card payment is switched off.');
  const token = await accessToken(cfg);

  const res = await fetch(`${base(cfg.mode)}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: args.reference,
          custom_id: args.reference,
          description: args.description.slice(0, 127),
          amount: { currency_code: args.currency, value: args.total.toFixed(2) },
        },
      ],
    }),
  });

  const json = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok || !(json as { id?: string }).id) {
    throw new PayPalError(
      'PayPal could not start this payment.',
      typeof (json as { message?: string }).message === 'string'
        ? (json as { message: string }).message
        : `Create order returned ${res.status}.`
    );
  }
  return (json as { id: string }).id;
}

export type CaptureResult = {
  captureId: string;
  status: string;
  amount: number;
  currency: string;
  payerEmail: string | null;
};

export async function capturePayPalOrder(paypalOrderId: string): Promise<CaptureResult> {
  const cfg = await getPayPalConfig();
  const token = await accessToken(cfg);

  const res = await fetch(`${base(cfg.mode)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new PayPalError(
      'PayPal could not take that payment.',
      typeof json?.message === 'string' ? json.message : `Capture returned ${res.status}.`
    );
  }

  const capture = json?.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture?.id) throw new PayPalError('PayPal did not confirm the payment.');

  return {
    captureId: String(capture.id),
    status: String(capture.status ?? json.status ?? ''),
    amount: Number(capture.amount?.value ?? 0),
    currency: String(capture.amount?.currency_code ?? cfg.currency),
    payerEmail: json?.payer?.email_address ?? null,
  };
}
