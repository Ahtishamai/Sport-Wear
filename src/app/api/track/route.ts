import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { lookupOrder, TrackingError } from '@/lib/tracking';
import { getSettings } from '@/lib/settings';

export const runtime = 'nodejs';

/** Public order lookup. Reads the configured Google Sheet. */
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`track:${ip}`, 30, 5 * 60_000).ok) {
    return json({ error: 'Too many lookups. Please wait a moment.' }, 429);
  }

  const orderId = new URL(req.url).searchParams.get('order')?.trim() ?? '';
  if (!orderId) return badRequest('Enter an order number.');
  if (orderId.length > 64) return badRequest('That order number is too long.');

  try {
    const order = await lookupOrder(orderId);
    if (!order) {
      const s = await getSettings();
      return json({ found: false, message: s.trackingNotFound }, 404);
    }
    return json({ found: true, order });
  } catch (err) {
    if (err instanceof TrackingError) {
      // The visitor gets a neutral message; the operator gets the detail.
      console.error('[tracking]', err.message, err.hint ?? '');
      return json(
        { error: 'Order tracking is unavailable right now. Please call us and we will check for you.' },
        503
      );
    }
    return serverError(err);
  }
}
