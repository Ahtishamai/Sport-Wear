import 'server-only';
import { getSettings } from './settings';

/**
 * Order tracking backed by a Google Sheet.
 *
 * The sheet is read as CSV, which needs no OAuth or API key — only that the
 * sheet is shared with "anyone with the link". That keeps setup to pasting a
 * URL into Site settings.
 */

export type StageState = 'complete' | 'in-progress' | 'pending';

export type TrackedStage = { label: string; state: StageState };

export type TrackedOrder = {
  orderId: string;
  teamName: string;
  lastUpdated: string;
  stages: TrackedStage[];
  status: 'Completed' | 'In production' | 'Not started';
  note: string;
};

export class TrackingError extends Error {
  constructor(
    message: string,
    readonly hint?: string
  ) {
    super(message);
  }
}

// ------------------------------------------------------------------ csv

/** Minimal RFC 4180 parser — handles quoted fields, embedded commas and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ------------------------------------------------------------------ url

/**
 * Accepts whatever the client pastes — a normal sheet URL, a "publish to web"
 * URL, or a bare id — and returns a CSV endpoint for it.
 *
 * Prefers Google's `export` endpoint. The `gviz` one infers headers and, on a
 * sheet whose columns are all text, folds the first data row into the header —
 * which silently loses that order. `gviz` is used only when a tab is named,
 * since `export` addresses tabs by numeric gid alone; there it is pinned with
 * `headers=1` so the same folding cannot happen.
 */
export function toCsvUrl(input: string, tab?: string): string {
  const value = (input ?? '').trim();
  if (!value) throw new TrackingError('No Google Sheet has been set.');

  // Already a CSV endpoint of some kind
  if (/output=csv|tqx=out:csv|format=csv/.test(value)) return value;

  // Published-to-web link
  const published = value.match(/\/spreadsheets\/d\/e\/([^/]+)\/pub/);
  if (published) {
    return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=csv`;
  }

  // Normal sheet URL, or a bare id
  const id =
    value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ??
    (/^[a-zA-Z0-9-_]{20,}$/.test(value) ? value : null);

  if (!id) {
    throw new TrackingError(
      'That does not look like a Google Sheet link.',
      'Paste the address from your browser while the sheet is open.'
    );
  }

  const gid = value.match(/[#&?]gid=(\d+)/)?.[1];

  if (tab?.trim()) {
    return (
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1` +
      `&sheet=${encodeURIComponent(tab.trim())}`
    );
  }

  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

// ------------------------------------------------------------------ fetch

export async function fetchSheetRows(
  sheetUrl: string,
  tab: string,
  cacheSeconds: number
): Promise<string[][]> {
  const url = toCsvUrl(sheetUrl, tab);

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: Math.max(0, cacheSeconds) },
      headers: { Accept: 'text/csv,*/*' },
    });
  } catch {
    throw new TrackingError('Could not reach Google Sheets.', 'Check the server has internet access.');
  }

  if (res.status === 404) {
    throw new TrackingError('That sheet was not found.', 'Check the link, and the tab name if you set one.');
  }
  if (!res.ok) {
    throw new TrackingError(`Google Sheets replied ${res.status}.`);
  }

  const body = await res.text();

  // An unshared sheet returns a sign-in page rather than an error status.
  if (/^\s*</.test(body) || /<!DOCTYPE html/i.test(body)) {
    throw new TrackingError(
      'The sheet is not readable without signing in.',
      'In Google Sheets: Share → General access → Anyone with the link → Viewer.'
    );
  }

  const rows = parseCsv(body);
  if (rows.length < 2) {
    throw new TrackingError('The sheet has no rows below the header.');
  }
  return rows;
}

// ------------------------------------------------------------------ shape

const normalise = (s: string) => (s ?? '').trim().toLowerCase();

/** Tolerant of the case and spelling drift real spreadsheets accumulate. */
export function toStageState(raw: string): StageState {
  const v = normalise(raw);
  if (!v) return 'pending';
  if (v.startsWith('comp')) return 'complete';      // Complete, COmplete, completed
  if (v.startsWith('done')) return 'complete';
  if (v.includes('progress')) return 'in-progress'; // In progress, in-progress
  if (v.startsWith('start')) return 'in-progress';
  return 'pending';                                  // Pending, PEnding, blank
}

type ColumnMap = { id: number; team: number; updated: number; stages: number[] };

export function mapColumns(header: string[]): ColumnMap {
  const h = header.map(normalise);
  const findBy = (test: (s: string) => boolean) => h.findIndex(test);

  const id = findBy((s) => s.includes('order') && s.includes('id'));
  const team = findBy((s) => s.includes('team'));
  const updated = findBy((s) => s.includes('updated') || s.includes('date'));

  if (id < 0) {
    throw new TrackingError(
      'No "Order ID" column found in the sheet.',
      `Columns seen: ${header.filter(Boolean).join(', ')}`
    );
  }

  // Everything that is not an id, team or date column is treated as a stage,
  // so adding a production step to the sheet needs no code change.
  const stages = header
    .map((_, i) => i)
    .filter((i) => i !== id && i !== team && i !== updated && header[i]?.trim());

  return { id, team, updated, stages };
}

export function findOrder(rows: string[][], orderId: string): TrackedOrder | null {
  const [header, ...body] = rows;
  const cols = mapColumns(header);
  const wanted = normalise(orderId).replace(/\s+/g, '');

  const row = body.find((r) => normalise(r[cols.id]).replace(/\s+/g, '') === wanted);
  if (!row) return null;

  const stages: TrackedStage[] = cols.stages.map((i) => ({
    label: header[i].trim(),
    state: toStageState(row[i] ?? ''),
  }));

  const allDone = stages.length > 0 && stages.every((s) => s.state === 'complete');
  const anyMoving = stages.some((s) => s.state !== 'pending');

  const status: TrackedOrder['status'] = allDone
    ? 'Completed'
    : anyMoving
      ? 'In production'
      : 'Not started';

  const current = stages.find((s) => s.state !== 'complete');
  const note = allDone
    ? 'Your order has been completed and shipped.'
    : current
      ? current.state === 'in-progress'
        ? `Your order is currently in ${current.label.toLowerCase()}.`
        : `Next up: ${current.label.toLowerCase()}.`
      : 'Your order is being prepared.';

  return {
    orderId: (row[cols.id] ?? orderId).trim(),
    teamName: cols.team >= 0 ? (row[cols.team] ?? '').trim() : '',
    lastUpdated: cols.updated >= 0 ? (row[cols.updated] ?? '').trim() : '',
    stages,
    status,
    note,
  };
}

// ------------------------------------------------------------------ entry

export async function lookupOrder(orderId: string): Promise<TrackedOrder | null> {
  const s = await getSettings();
  if (!s.trackingEnabled) {
    throw new TrackingError('Order tracking is turned off.', 'Enable it in Admin → Site settings.');
  }

  const rows = await fetchSheetRows(
    s.trackingSheetUrl,
    s.trackingSheetTab,
    Math.max(0, Number(s.trackingCacheMinutes) || 5) * 60
  );

  return findOrder(rows, orderId);
}
