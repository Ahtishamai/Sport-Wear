import { prisma } from '@/lib/db';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { getAccessor } from '@/lib/auth';
import { canUseResource } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The 404 report.
 *
 * Its own endpoint rather than a generic resource, because these rows are a
 * log: they are never created by hand, and deleting one should erase it
 * rather than fill Trash with addresses nobody will ever restore.
 */

const LIMIT = 300;

export async function GET(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseResource(user, 'notFound')) return forbidden();

  try {
    const url = new URL(req.url);
    const showIgnored = url.searchParams.get('ignored') === '1';
    const q = (url.searchParams.get('q') ?? '').trim();

    const [items, ignoredCount] = await Promise.all([
      prisma.notFoundHit.findMany({
        where: {
          ...(showIgnored ? {} : { ignored: false }),
          ...(q ? { OR: [{ path: { contains: q } }, { referrer: { contains: q } }] } : {}),
        },
        // Loudest first: the address costing the most visitors is the one to
        // write a rule for.
        orderBy: [{ hits: 'desc' }, { lastSeenAt: 'desc' }],
        take: LIMIT,
      }),
      prisma.notFoundHit.count({ where: { ignored: true } }),
    ]);

    // Which of these already have a rule, so a path that was dealt with
    // reads as dealt with instead of looking outstanding.
    const covered = new Set(
      (
        await prisma.redirect.findMany({
          where: { from: { in: items.map((i) => i.path) } },
          select: { from: true },
        })
      ).map((r) => r.from)
    );

    return json({
      items: items.map((i) => ({ ...i, covered: covered.has(i.path) })),
      ignoredCount,
      truncated: items.length === LIMIT,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseResource(user, 'notFound')) return forbidden();

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');
    const id = body?.id ? String(body.id) : '';

    switch (action) {
      case 'ignore':
      case 'unignore': {
        if (!id) return badRequest('An id is required.');
        const row = await prisma.notFoundHit.update({
          where: { id },
          data: { ignored: action === 'ignore' },
        });
        return json({ item: row });
      }

      case 'delete': {
        if (!id) return badRequest('An id is required.');
        await prisma.notFoundHit.delete({ where: { id } });
        return json({ ok: true });
      }

      // Clears the whole report. The counts start again from the next visit,
      // which is the point: it is how you tell a fix worked.
      case 'clear': {
        const { count } = await prisma.notFoundHit.deleteMany({
          where: body?.includeIgnored ? {} : { ignored: false },
        });
        return json({ ok: true, cleared: count });
      }

      default:
        return badRequest(`Unknown action "${action}"`);
    }
  } catch (err) {
    return serverError(err);
  }
}
