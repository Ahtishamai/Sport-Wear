import { getAccessor } from '@/lib/auth';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { canUseResource } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { coversWholeSite, normalizePath, redirectProblem } from '@/lib/redirects';
import { siteBase } from '@/lib/seo';

/**
 * Asks the site what each of a list of addresses actually answers.
 *
 * A list of "broken" addresses is never only broken addresses. It comes out
 * of a crawler, or an old robots.txt, or a spreadsheet somebody kept, and it
 * will have live pages in it, addresses already handled, and patterns that
 * are not addresses at all. Writing the lot off because a list said so is
 * how a working page gets a 410.
 *
 * So each one is fetched before anything is offered, and the answer is
 * reported rather than acted on. Deciding is the next screen's job.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Enough to be useful, few enough not to hold a request open for a minute. */
const LIMIT = 60;

export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseResource(user, 'redirects')) return forbidden();

  try {
    const body = await req.json().catch(() => null);
    const raw = Array.isArray(body?.addresses)
      ? body.addresses
      : String(body?.addresses ?? '').split(/[\r\n,]+/);

    const paths: string[] = [];
    for (const entry of raw) {
      const text = String(entry ?? '').trim();
      if (!text) continue;
      const path = normalizePath(text);
      if (path && !paths.includes(path)) paths.push(path);
      if (paths.length >= LIMIT) break;
    }
    if (!paths.length) return badRequest('Paste some addresses first.');

    const base = siteBase();
    const existing = await prisma.redirect.findMany({ select: { from: true, to: true, active: true } });
    const known = new Map(existing.map((r) => [normalizePath(r.from), r]));

    const rows = await Promise.all(
      paths.map(async (path) => {
        const rule = known.get(path);
        const refusal = redirectProblem(path, '', true);

        /*
         * A pattern is reported rather than fetched. `/wp-content/plugins/*`
         * is not an address a server can answer, and `/*` is the whole site,
         * so neither tells us anything by being requested.
         */
        if (coversWholeSite(path)) {
          return { path, status: null, state: 'whole-site' as const, note: refusal };
        }
        if (path.includes('*')) {
          return { path, status: null, state: 'pattern' as const, note: refusal };
        }
        if (rule) {
          return {
            path,
            status: null,
            state: String(rule.to ?? '').trim()
              ? ('redirected' as const)
              : ('already-gone' as const),
            to: rule.to || null,
            active: rule.active,
          };
        }

        let status: number | null = null;
        try {
          const res = await fetch(base + path, { redirect: 'manual', cache: 'no-store' });
          status = res.status;
        } catch {
          status = null;
        }

        const state =
          status === null
            ? ('unreachable' as const)
            : status >= 200 && status < 300
              ? ('live' as const)
              : status >= 300 && status < 400
                ? ('redirected' as const)
                : status === 410
                  ? ('already-gone' as const)
                  : ('dead' as const);

        return { path, status, state, note: refusal };
      })
    );

    return json({
      rows,
      counted: rows.length,
      dead: rows.filter((r) => r.state === 'dead' && !r.note).length,
      truncated: raw.filter((e: unknown) => String(e ?? '').trim()).length > LIMIT,
    });
  } catch (err) {
    return serverError(err);
  }
}
