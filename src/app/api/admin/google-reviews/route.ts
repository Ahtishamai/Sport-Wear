import { revalidatePath } from 'next/cache';
import { getAccessor } from '@/lib/auth';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import {
  findGooglePlaces,
  getGoogleListing,
  googleConfigSummary,
  saveGoogleConfig,
} from '@/lib/google-reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Setting up the live Google reviews: save the key, find the listing, pull it
 * in now. The key itself is never sent back — only whether one is saved.
 */
export async function GET() {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseArea(user, 'settings')) return forbidden();
  try {
    return json(await googleConfigSummary());
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  // Holds a billable API key.
  if (!canUseArea(user, 'settings')) return forbidden();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? 'save');

  try {
    if (action === 'find') {
      const places = await findGooglePlaces(String(body.query ?? ''), String(body.apiKey ?? ''));
      return json({
        places,
        message: places.length
          ? `${places.length} match${places.length === 1 ? '' : 'es'} — pick your listing.`
          : 'Google found nothing for that. Try the business name with the town.',
      });
    }

    if (action === 'refresh') {
      const listing = await getGoogleListing({ force: true });
      if (!listing) return badRequest('Add the API key and pick your listing first.');
      // The pages showing the reviews need to pick up the new ones.
      for (const p of ['/', '/about']) {
        try {
          revalidatePath(p);
        } catch {
          /* best-effort */
        }
      }
      return json({
        listing: { name: listing.name, rating: listing.rating, total: listing.total, reviews: listing.reviews.length },
        summary: await googleConfigSummary(),
        message: listing.total
          ? `${listing.name}: ${listing.rating.toFixed(1)} from ${listing.total} reviews, ${listing.reviews.length} shown on the site.`
          : 'That listing has no reviews yet.',
      });
    }

    const summary = await saveGoogleConfig({
      apiKey: body.apiKey === null ? null : typeof body.apiKey === 'string' ? body.apiKey : undefined,
      placeId: body.placeId === undefined ? undefined : String(body.placeId),
      enabled: body.enabled === undefined ? undefined : body.enabled === true,
    });
    return json({ ...summary, message: 'Saved.' });
  } catch (err) {
    // Google's own complaints are the useful part here, so they are passed on.
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 400);
  }
}
