import { forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import { getAccessor } from '@/lib/auth';
import { fetchSheetRows, mapColumns, toCsvUrl, TrackingError } from '@/lib/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Checks a sheet before it is saved, so the admin sees exactly what went wrong
 * rather than a dead tracking page.
 */
export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  // Reads the tracking sheet configured in settings.
  if (!canUseArea(user, 'settings')) return forbidden();

  try {
    const body = await req.json().catch(() => ({}));
    const sheetUrl = String(body?.sheetUrl ?? '').trim();
    const tab = String(body?.tab ?? '').trim();

    if (!sheetUrl) return json({ ok: false, error: 'Paste a Google Sheet link first.' }, 400);

    // No caching here — a test must reflect the sheet as it is right now.
    const rows = await fetchSheetRows(sheetUrl, tab, 0);
    const [header] = rows;
    const cols = mapColumns(header);

    return json({
      ok: true,
      csvUrl: toCsvUrl(sheetUrl, tab),
      orders: rows.length - 1,
      idColumn: header[cols.id],
      teamColumn: cols.team >= 0 ? header[cols.team] : null,
      updatedColumn: cols.updated >= 0 ? header[cols.updated] : null,
      stages: cols.stages.map((i) => header[i]),
      sample: rows[1]?.[cols.id] ?? null,
    });
  } catch (err) {
    if (err instanceof TrackingError) {
      return json({ ok: false, error: err.message, hint: err.hint ?? null }, 400);
    }
    return serverError(err);
  }
}
