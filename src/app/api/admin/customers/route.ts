import { prisma } from '@/lib/db';
import { badRequest, forbidden, json, serverError, unauthorized } from '@/lib/api';
import { getAccessor } from '@/lib/auth';
import { canUseResource } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shop accounts, for the admin.
 *
 * Its own endpoint rather than a generic resource, because almost nothing
 * here should be editable from the panel. An account's name and address
 * belong to the customer; all the operator ever needs is to see who has one,
 * to confirm an address by hand when email is not working, and to delete an
 * account when somebody asks.
 */

const LIMIT = 300;

export async function GET(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseResource(user, 'customers')) return forbidden();

  try {
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();

    const rows = await prisma.customer.findMany({
      where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {},
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        verifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    });

    // Orders placed as a guest with the same address count too — the same
    // rule the account itself goes by, so the number here is the number the
    // customer sees.
    const guest = await prisma.shopOrder.groupBy({
      by: ['email'],
      where: { email: { in: rows.map((r) => r.email) }, customerId: null },
      _count: { _all: true },
    });
    const byEmail = new Map(guest.map((g) => [g.email, g._count._all]));

    return json({
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        phone: r.phone,
        verified: Boolean(r.verifiedAt),
        lastLoginAt: r.lastLoginAt,
        createdAt: r.createdAt,
        orders: r._count.orders + (r.verifiedAt ? (byEmail.get(r.email) ?? 0) : 0),
      })),
      truncated: rows.length === LIMIT,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  if (!canUseResource(user, 'customers')) return forbidden();

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');
    const id = body?.id ? String(body.id) : '';
    if (!id) return badRequest('An id is required.');

    switch (action) {
      // For when email is not set up, or a customer cannot receive ours.
      // Only ever done on purpose, by someone who has checked who they are.
      case 'verify':
      case 'unverify': {
        const row = await prisma.customer.update({
          where: { id },
          data: { verifiedAt: action === 'verify' ? new Date() : null },
          select: { id: true, email: true, verifiedAt: true },
        });
        return json({ item: { ...row, verified: Boolean(row.verifiedAt) } });
      }

      // The orders stay — they are the shop's own books. They simply stop
      // belonging to an account.
      case 'delete': {
        await prisma.$transaction([
          prisma.shopOrder.updateMany({ where: { customerId: id }, data: { customerId: null } }),
          prisma.customer.delete({ where: { id } }),
        ]);
        return json({ ok: true });
      }

      default:
        return badRequest(`Unknown action "${action}"`);
    }
  } catch (err) {
    return serverError(err);
  }
}
