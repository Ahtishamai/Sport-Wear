'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Checkbox, Input, useToast } from './ui';

/**
 * Setting up the live Google reviews.
 *
 * Three things have to line up — a Google API key, the Places API switched on
 * for it, and the right listing — and each fails in its own way, so each step
 * reports back on its own rather than leaving one "it didn't work".
 */

export type GoogleSummary = {
  keySet: boolean;
  keyHint: string;
  placeId: string;
  enabled: boolean;
  lastFetched: string | null;
  rating: number | null;
  total: number | null;
  reviewsCached: number;
};

type Place = { placeId: string; name: string; address: string; rating: number | null; total: number | null };

export function GoogleReviewsPanel({ initial }: { initial: GoogleSummary }) {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState(initial);
  const [apiKey, setApiKey] = useState('');
  const [placeId, setPlaceId] = useState(initial.placeId);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'find' | 'refresh'>('');
  const [error, setError] = useState('');

  async function call(body: Record<string, unknown>, what: typeof busy) {
    setBusy(what);
    setError('');
    try {
      const res = await fetch('/api/admin/google-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong.');
        return null;
      }
      return data;
    } catch {
      setError('Could not reach the server.');
      return null;
    } finally {
      setBusy('');
    }
  }

  async function save(extra: Record<string, unknown> = {}) {
    const data = await call({ action: 'save', apiKey: apiKey || undefined, placeId, ...extra }, 'save');
    if (!data) return;
    setSummary(data);
    setApiKey('');
    toast('Saved');
    router.refresh();
  }

  async function find() {
    const data = await call({ action: 'find', query, apiKey: apiKey || undefined }, 'find');
    if (!data) return;
    setPlaces(data.places);
    if (!data.places.length) toast(data.message, 'error');
  }

  async function refresh() {
    const data = await call({ action: 'refresh' }, 'refresh');
    if (!data) return;
    setSummary(data.summary);
    toast(data.message);
    router.refresh();
  }

  return (
    <Card
      title="Google reviews"
      description="Shows your Google score and newest reviews on the site, refreshed by itself a few times a day."
    >
      {error && (
        <p role="alert" className="mb-4 border border-[#F3C6C8] bg-[#FBE7E8] px-4 py-3 text-[13px] text-[#C42027]">
          {error}
        </p>
      )}

      <div className="grid gap-4">
        <div>
          <span className="field-label">Google API key</span>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={summary.keySet ? `Saved — ${summary.keyHint}. Leave blank to keep it.` : 'AIza…'}
            autoComplete="off"
          />
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#8A8C93]">
            From console.cloud.google.com → APIs &amp; Services → Credentials. Switch on{' '}
            <strong>Places API (New)</strong> for the project and leave billing enabled; Google gives a monthly free
            allowance, and this page asks for the reviews a few times a day, not on every visit.
          </p>
          {summary.keySet && (
            <button
              type="button"
              onClick={() => save({ apiKey: null })}
              className="mt-1.5 text-[12px] font-semibold text-[#C42027] hover:underline"
            >
              Forget the saved key
            </button>
          )}
        </div>

        <div>
          <span className="field-label">Find your listing</span>
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Design Sportswear, Springfield MA"
              className="!w-[320px]"
            />
            <Button variant="outline" onClick={find} disabled={busy !== ''}>
              {busy === 'find' ? 'Searching…' : 'Search Google'}
            </Button>
          </div>

          {places && places.length > 0 && (
            <ul className="mt-3 divide-y divide-[#EFEFEC] border border-[#E3E3DF]">
              {places.map((pl) => (
                <li key={pl.placeId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{pl.name}</span>
                    <span className="block text-[12.5px] text-[#8A8C93]">
                      {pl.address}
                      {pl.rating ? ` · ${pl.rating} from ${pl.total} reviews` : ' · no reviews yet'}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant={placeId === pl.placeId ? 'ink' : 'outline'}
                    onClick={() => {
                      setPlaceId(pl.placeId);
                      setPlaces(null);
                    }}
                  >
                    {placeId === pl.placeId ? 'Chosen' : 'Use this one'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <span className="field-label">Place ID</span>
          <Input value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" />
          <p className="mt-1.5 text-[12px] text-[#8A8C93]">Filled in by the search above, or paste it yourself.</p>
        </div>

        <Checkbox
          label="Show the Google score and reviews on the site"
          checked={summary.enabled}
          onChange={(e) => setSummary({ ...summary, enabled: e.target.checked })}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="yellow" onClick={() => save({ enabled: summary.enabled })} disabled={busy !== ''}>
            {busy === 'save' ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outline" onClick={refresh} disabled={busy !== '' || !summary.keySet || !summary.placeId}>
            {busy === 'refresh' ? 'Fetching…' : 'Fetch reviews now'}
          </Button>
          {summary.lastFetched && (
            <span className="text-[12.5px] text-[#8A8C93]">
              Last fetched {new Date(summary.lastFetched).toLocaleString()}
              {summary.rating ? ` · ${summary.rating} from ${summary.total} reviews · ${summary.reviewsCached} shown` : ''}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
