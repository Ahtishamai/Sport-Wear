import 'server-only';
import { prisma } from './db';

/**
 * The shop's Google listing: score, review count and the newest reviews.
 *
 * Google's free share link cannot be read by a server, so the figures come
 * from the Places API instead. Two things make that safe to put on a page
 * every visitor loads:
 *
 *  - The key never leaves the server. It lives in its own settings row, is
 *    never sent to the browser, and the admin only ever sees whether one is
 *    saved.
 *  - The answer is cached. Google bills per call, so the listing is fetched
 *    at most once every few hours and kept in the database; a page view
 *    reads the cache, and a failed refresh keeps showing the last good copy
 *    rather than emptying the section.
 *
 * Google allows at most five reviews per listing through this API, and asks
 * that they be shown with the reviewer's name and when they were written.
 */

const KEY = 'googleReviews';
const CACHE_HOURS = 6;
// Google's terms allow caching this content briefly, not indefinitely.
const STALE_DAYS = 25;

export type GoogleReview = {
  author: string;
  photo: string | null;
  rating: number;
  when: string;
  text: string;
  url: string | null;
};

export type GoogleListing = {
  name: string;
  rating: number;
  total: number;
  reviews: GoogleReview[];
  url: string | null;
  fetchedAt: string;
};

type Stored = {
  apiKey?: string;
  placeId?: string;
  /** Off hides the live figures without throwing the key away. */
  enabled?: boolean;
  cache?: GoogleListing | null;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

async function read(): Promise<Stored> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    return (row?.value ?? {}) as Stored;
  } catch {
    return {};
  }
}

async function write(next: Stored) {
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next as unknown as object },
    update: { value: next as unknown as object },
  });
}

export async function saveGoogleConfig(patch: { apiKey?: string | null; placeId?: string; enabled?: boolean }) {
  const current = await read();
  const next: Stored = { ...current };

  // Blank means "keep what is stored"; null means "forget it".
  if (patch.apiKey === null) next.apiKey = '';
  else if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) next.apiKey = patch.apiKey.trim();

  if (patch.placeId !== undefined && str(patch.placeId) !== str(current.placeId)) {
    next.placeId = str(patch.placeId);
    next.cache = null; // a different listing: the old figures no longer apply
  }
  if (patch.enabled !== undefined) next.enabled = patch.enabled === true;

  await write(next);
  return googleConfigSummary(next);
}

/** Safe for the admin: says whether a key is saved, never what it is. */
export async function googleConfigSummary(stored?: Stored) {
  const s = stored ?? (await read());
  return {
    keySet: Boolean(str(s.apiKey)),
    keyHint: str(s.apiKey) ? '••••••••' + str(s.apiKey).slice(-4) : '',
    placeId: str(s.placeId),
    enabled: s.enabled !== false,
    lastFetched: s.cache?.fetchedAt ?? null,
    rating: s.cache?.rating ?? null,
    total: s.cache?.total ?? null,
    reviewsCached: s.cache?.reviews.length ?? 0,
  };
}

/** How long ago, in the words a review carries on Google ("3 weeks ago"). */
function howLongAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 31) {
    const w = Math.floor(days / 7);
    return w === 1 ? 'a week ago' : `${w} weeks ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return m === 1 ? 'a month ago' : `${m} months ago`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? 'a year ago' : `${y} years ago`;
}

type PlaceResponse = {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    publishTime?: string;
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; photoUri?: string };
  }[];
};

/** One call to Google. Throws with a readable reason so the admin can fix it. */
async function fetchListing(apiKey: string, placeId: string): Promise<GoogleListing> {
  const id = placeId.startsWith('places/') ? placeId : `places/${placeId}`;
  const res = await fetch(`https://places.googleapis.com/v1/${id}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews',
    },
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => ({}))) as PlaceResponse & { error?: { message?: string; status?: string } };
  if (!res.ok) {
    const why = body?.error?.message || `Google replied ${res.status}`;
    throw new Error(
      /API key/i.test(why)
        ? 'Google rejected the API key. Check it is correct, that the Places API (New) is switched on for it, and that any website restriction allows this server.'
        : /not found|INVALID_ARGUMENT/i.test(why)
          ? 'Google could not find that place ID. Use "Find my listing" to pick the right one.'
          : why
    );
  }

  return {
    name: body.displayName?.text ?? '',
    rating: Number(body.rating ?? 0),
    total: Number(body.userRatingCount ?? 0),
    url: body.googleMapsUri ?? null,
    fetchedAt: new Date().toISOString(),
    reviews: (body.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? 'Google user',
        photo: r.authorAttribution?.photoUri ?? null,
        rating: Number(r.rating ?? 5),
        when: r.relativePublishTimeDescription || (r.publishTime ? howLongAgo(r.publishTime) : ''),
        text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
        url: r.googleMapsUri ?? null,
      }))
      .filter((r) => r.text),
  };
}

/** Businesses matching a search, for picking the right listing in the admin. */
export async function findGooglePlaces(query: string, apiKeyOverride?: string) {
  const stored = await read();
  const apiKey = str(apiKeyOverride) || str(stored.apiKey);
  if (!apiKey) throw new Error('Save your Google API key first.');
  if (!query.trim()) throw new Error('Type the business name and town to search for.');

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: query.trim(), maxResultCount: 5 }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as {
    places?: { id?: string; displayName?: { text?: string }; formattedAddress?: string; rating?: number; userRatingCount?: number }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body?.error?.message || `Google replied ${res.status}`);

  return (body.places ?? []).map((p) => ({
    placeId: p.id ?? '',
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    rating: p.rating ?? null,
    total: p.userRatingCount ?? null,
  }));
}

/**
 * The listing for the site to show.
 *
 * `force` is the admin pressing refresh. Everything else reads the cache and
 * only calls Google once it is a few hours old.
 */
export async function getGoogleListing({ force = false } = {}): Promise<GoogleListing | null> {
  const stored = await read();
  const apiKey = str(stored.apiKey);
  const placeId = str(stored.placeId);
  if (stored.enabled === false || !apiKey || !placeId) return null;

  const cached = stored.cache ?? null;
  const ageHours = cached ? (Date.now() - new Date(cached.fetchedAt).getTime()) / 3_600_000 : Infinity;
  if (!force && cached && ageHours < CACHE_HOURS) return cached;

  try {
    const fresh = await fetchListing(apiKey, placeId);
    await write({ ...stored, cache: fresh });
    return fresh;
  } catch (err) {
    if (force) throw err;
    // A page view must never fail because Google did. Keep the last good copy,
    // unless it is old enough that Google would rather it were not shown.
    if (cached && ageHours < STALE_DAYS * 24) return cached;
    console.error('[google-reviews] could not refresh:', err instanceof Error ? err.message : err);
    return null;
  }
}
