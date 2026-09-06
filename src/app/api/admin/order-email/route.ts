import { getAccessor } from '@/lib/auth';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import { sendOrderEmail } from '@/lib/emails/send-order';
import { sendPaymentReceipt } from '@/lib/emails/send-payment';
import { getMailConfig, isMailReady } from '@/lib/mail';
import { checkAddresses } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Nobody legitimately sends one order confirmation to more people than this. */
const MAX_RECIPIENTS = 20;

/**
 * Sends an order's confirmation again, optionally to other addresses.
 *
 * Confirmations go out on their own when a payment settles, but they get lost,
 * mistyped and caught by spam filters, and a shop needs a way to put one back
 * in front of a customer without asking them to order twice. The same box also
 * covers the everyday case of one order needing to reach several people — the
 * player, a parent and the coach — so it takes a list, not one address.
 */
export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseArea(user, 'orders')) return forbidden();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = String(body.orderId ?? '').trim();
  const paymentId = String(body.paymentId ?? '').trim();
  const typed = String(body.to ?? '').trim();
  if (!orderId && !paymentId) return badRequest('Which order or payment?');

  const { valid, invalid } = checkAddresses(typed);

  // Refusing the whole send on one typo beats quietly delivering to four of
  // the five people asked for and leaving the fifth wondering.
  if (invalid.length) {
    return json({
      ok: false,
      message: invalid.length === 1 ? 'That address is not valid.' : 'Some addresses are not valid.',
      detail: `Check ${invalid.join(', ')} and send again.`,
    });
  }

  if (typed && !valid.length) {
    return json({ ok: false, message: 'Type at least one address to send to.' });
  }

  if (valid.length > MAX_RECIPIENTS) {
    return json({
      ok: false,
      message: `That is ${valid.length} addresses.`,
      detail: `Send one email to at most ${MAX_RECIPIENTS} people at once.`,
    });
  }

  if (!isMailReady(await getMailConfig())) {
    return json({
      ok: false,
      message: 'Email is not set up yet.',
      detail: 'Add your mail server under Site settings → Email, then try again.',
    });
  }

  try {
    const res = paymentId
      ? await sendPaymentReceipt(paymentId, valid.length ? { to: valid } : {})
      : await sendOrderEmail(orderId, valid.length ? { to: valid } : {});
    const what = paymentId ? 'payment' : 'order';

    if (res.skipped === 'no-recipient') {
      return json({
        ok: false,
        message: `This ${what} has no email address on it.`,
        detail: 'Type an address and send it there instead.',
      });
    }
    if (!res.ok) {
      return json({ ok: false, message: 'The email would not send.', detail: res.error ?? '' });
    }
    const sentTo = res.recipients ?? [];
    const sent = paymentId ? 'Receipt' : 'Confirmation';
    return json({
      ok: true,
      message:
        sentTo.length > 1
          ? `${sent} sent to ${sentTo.length} addresses.`
          : `${sent} sent${sentTo[0] ? ` to ${sentTo[0]}` : ''}.`,
      detail: sentTo.length > 1 ? sentTo.join(', ') : '',
    });
  } catch (err) {
    return serverError(err);
  }
}
