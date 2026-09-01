import { getSession } from '@/lib/auth';
import { json, unauthorized } from '@/lib/api';
import { getPaymentSecrets } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Checks PayPal credentials before they are relied on for real money.
 *
 * Uses whatever the admin has typed, falling back to the stored secret when the
 * field is left blank, so an existing setup can be re-tested without retyping.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const clientId = String((body as any)?.clientId ?? '').trim();
  const mode = (body as any)?.mode === 'live' ? 'live' : 'sandbox';
  const typed = String((body as any)?.secret ?? '').trim();
  const secret = typed || (await getPaymentSecrets()).paypalSecret;

  if (!clientId) return json({ ok: false, message: 'Enter the PayPal client ID first.' });
  if (!secret) return json({ ok: false, message: 'Enter the PayPal secret first.' });

  const base =
    process.env.PAYPAL_API_BASE ||
    (mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    if (res.ok) {
      return json({
        ok: true,
        message: `Connected to PayPal (${mode}).`,
        detail:
          mode === 'sandbox'
            ? 'Test payments only — no real money will move until you switch to live.'
            : 'Live mode: real payments will be taken.',
      });
    }

    return json({
      ok: false,
      message: 'PayPal rejected these credentials.',
      detail:
        res.status === 401
          ? `Check the client ID and secret, and that both come from the ${mode} environment.`
          : `PayPal replied ${res.status}.`,
    });
  } catch {
    return json({ ok: false, message: 'Could not reach PayPal from this server.' });
  }
}
