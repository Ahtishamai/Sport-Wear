import { getAccessor } from '@/lib/auth';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import { sendOrderEmail } from '@/lib/emails/send-order';
import { getMailConfig, isMailReady } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sends an order's confirmation again, optionally to a different address.
 *
 * Confirmations go out on their own when a payment settles, but they get lost,
 * mistyped and caught by spam filters, and a shop needs a way to put one back
 * in front of a customer without asking them to order twice.
 */
export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseArea(user, 'orders')) return forbidden();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = String(body.orderId ?? '').trim();
  const to = String(body.to ?? '').trim();
  if (!orderId) return badRequest('Which order?');

  if (!isMailReady(await getMailConfig())) {
    return json({
      ok: false,
      message: 'Email is not set up yet.',
      detail: 'Add your mail server under Site settings → Email, then try again.',
    });
  }

  try {
    const res = await sendOrderEmail(orderId, to ? { to } : {});
    if (res.skipped === 'no-recipient') {
      return json({
        ok: false,
        message: 'This order has no email address on it.',
        detail: 'Type an address in the box and send it there instead.',
      });
    }
    if (!res.ok) {
      return json({ ok: false, message: 'The email would not send.', detail: res.error ?? '' });
    }
    return json({ ok: true, message: `Confirmation sent${to ? ` to ${to}` : ''}.` });
  } catch (err) {
    return serverError(err);
  }
}
