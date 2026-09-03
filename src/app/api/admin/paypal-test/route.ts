import { getAccessor } from '@/lib/auth';
import { forbidden, json, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import { getPaymentSecrets } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOSTS = {
  live: 'https://api-m.paypal.com',
  sandbox: 'https://api-m.sandbox.paypal.com',
} as const;

type Mode = keyof typeof HOSTS;

// Per-environment overrides exist so tests can stand in a different fake for
// sandbox and live, which is the only way to exercise the mismatch path.
const hostFor = (mode: Mode) =>
  (mode === 'live' ? process.env.PAYPAL_API_BASE_LIVE : process.env.PAYPAL_API_BASE_SANDBOX) ||
  process.env.PAYPAL_API_BASE ||
  HOSTS[mode];

/** Asks PayPal for a token and reports what it said. */
async function tryAuth(mode: Mode, clientId: string, secret: string) {
  const res = await fetch(`${hostFor(mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    error_description?: string;
  };
  return { ok: res.ok, status: res.status, error: body.error, description: body.error_description };
}

/**
 * Checks PayPal credentials before they are relied on for real money.
 *
 * A plain "rejected" is a dead end, so when the chosen environment fails this
 * also tries the other one. Credentials that work in sandbox but not live are
 * the single most common mistake, and that is worth saying outright rather
 * than leaving someone to guess.
 */
export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  // Touches payment credentials.
  if (!canUseArea(user, 'settings')) return forbidden();

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const clientId = String((body as any)?.clientId ?? '').trim();
  const mode: Mode = (body as any)?.mode === 'live' ? 'live' : 'sandbox';
  const typed = String((body as any)?.secret ?? '').trim();
  const stored = (await getPaymentSecrets()).paypalSecret;
  const secret = typed || stored;
  const usingStoredSecret = !typed && Boolean(stored);

  if (!clientId) return json({ ok: false, message: 'Enter the PayPal client ID first.' });
  if (!secret) {
    return json({
      ok: false,
      message: 'Enter the PayPal secret first.',
      detail: 'Paste the secret from the same app as the client ID above.',
    });
  }

  try {
    const first = await tryAuth(mode, clientId, secret);

    if (first.ok) {
      return json({
        ok: true,
        message: `Connected to PayPal (${mode}).`,
        detail:
          mode === 'sandbox'
            ? 'Test payments only — no real money moves until you switch to live.'
            : 'Live mode: real payments will be taken.',
      });
    }

    // Not a credentials problem — surface whatever PayPal actually said.
    if (first.status !== 401) {
      return json({
        ok: false,
        message: `PayPal replied ${first.status}.`,
        detail: first.description || first.error || 'Try again in a moment.',
      });
    }

    // Same pair against the other environment: if that works, the Environment
    // dropdown is simply set the wrong way round.
    const other: Mode = mode === 'live' ? 'sandbox' : 'live';
    if (hostFor(other) !== hostFor(mode)) {
      const second = await tryAuth(other, clientId, secret);
      if (second.ok) {
        return json({
          ok: false,
          message: `These are ${other} credentials, but Environment is set to ${mode}.`,
          detail:
            other === 'sandbox'
              ? 'Switch Environment to “Sandbox — test money only”, or paste your Live client ID and secret instead. Live and sandbox credentials are different apps and are not interchangeable.'
              : 'Switch Environment to “Live — real money”, or paste your sandbox credentials instead.',
        });
      }
    }

    return json({
      ok: false,
      message: 'PayPal rejected these credentials.',
      detail:
        (usingStoredSecret
          ? 'The client ID above was checked against the secret already saved. If you pasted a new client ID, paste its matching secret too — a client ID from one app will not work with another app’s secret. '
          : 'The client ID and secret must come from the same app. ') +
        `In the PayPal developer dashboard, switch the ${mode === 'live' ? 'Live' : 'Sandbox'} toggle on, open your app under Apps & Credentials, and copy both values from that one page.`,
    });
  } catch {
    return json({
      ok: false,
      message: 'Could not reach PayPal from this server.',
      detail: 'Check the server has outbound internet access.',
    });
  }
}
