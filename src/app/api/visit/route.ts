import 'server-only';
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { botCheck, classify, deviceOf } from '@/lib/traffic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Where every page view is counted.
 *
 * It has to be a beacon from the browser rather than a count taken while
 * the page renders, because the pages are cached: a collection page is
 * rendered once and served to a hundred people, so counting at render time
 * would count one of them.
 *
 * The write is the part that needs care. This database allows five hundred
 * new connections an hour, across the whole shop, and the pool is two wide.
 * A row per view would spend the entire budget on analytics and leave the
 * storefront unable to open a connection. So views are held in memory and
 * written in batches: a hundred views an hour become about six inserts.
 */

type Pending = {
  visitor: string;
  session: string;
  path: string;
  channel: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  device: string;
  bot: boolean;
  crawler: string | null;
  at: Date;
};

/** Views waiting to be written. */
const buffer: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastPrune = 0;

/** Write after this many views, or this long, whichever comes first. */
const BATCH = 25;
const EVERY_MS = 15_000;
/** Beyond this the server is being flooded; drop rather than fill memory. */
const CEILING = 2_000;
/** How long views are kept. The reports reach back sixty days. */
const KEEP_DAYS = 180;

async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;
  const rows = buffer.splice(0, buffer.length);
  try {
    await prisma.visit.createMany({ data: rows });

    // Once an hour, and only on the back of a write that already holds a
    // connection, drop what is too old to appear in any report.
    const now = Date.now();
    if (now - lastPrune > 3_600_000) {
      lastPrune = now;
      await prisma.visit.deleteMany({
        where: { at: { lt: new Date(now - KEEP_DAYS * 86_400_000) } },
      });
    }
  } catch (err) {
    // A lost batch of analytics is not worth a failed request, and never
    // worth retrying into a database that is already refusing connections.
    console.error('[visit] could not write a batch of', rows.length, err);
  }
}

function schedule() {
  if (buffer.length >= BATCH) {
    void flush();
    return;
  }
  if (!timer) timer = setTimeout(() => void flush(), EVERY_MS);
}

/**
 * Who this is, for today only.
 *
 * A hash of the address, the browser and a salt that changes at midnight.
 * The same person is one visitor all day and a different one tomorrow, the
 * hash cannot be turned back into an address, and no cookie is set. It is
 * enough to count people without knowing who any of them are.
 */
function visitorHash(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.AUTH_SECRET ?? 'design-sportswear';
  return createHash('sha256').update(`${day}|${salt}|${ip}|${ua}`).digest('base64url').slice(0, 32);
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return (fwd.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim();
}

const cut = (s: string | null | undefined, n: number) =>
  s ? String(s).slice(0, n) : null;

export async function POST(req: NextRequest) {
  // Always answer the same way and never make the browser wait on a write.
  const ok = new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store' },
  });

  try {
    // The shop's own staff are not customers. Counting the owner reading
    // their own product pages would be the loudest source on the report.
    if (req.cookies.get('ds_session')) return ok;

    const body = (await req.json()) as {
      path?: string;
      landing?: string;
      referrer?: string;
      session?: string;
    };
    const path = String(body.path ?? '').trim();
    if (!path.startsWith('/')) return ok;
    // Attribution comes from where the visit began, not from the page being
    // read: only the first address carries the campaign tags.
    const landing = String(body.landing ?? '').trim() || path;

    const ua = req.headers.get('user-agent') ?? '';
    const { isBot, crawler } = botCheck(ua);

    const self = req.headers.get('host') ?? '';
    const where = classify({ referrer: body.referrer, landing, self });

    if (buffer.length < CEILING) {
      buffer.push({
        visitor: visitorHash(clientIp(req), ua),
        session: cut(body.session, 40) ?? 'unknown',
        path: path.slice(0, 500),
        channel: where.channel,
        source: where.source.slice(0, 90),
        medium: cut(where.medium, 40),
        campaign: cut(where.campaign, 110),
        referrer: cut(body.referrer, 500),
        device: deviceOf(ua),
        bot: isBot,
        crawler,
        at: new Date(),
      });
      schedule();
    }
  } catch {
    // A malformed beacon is not an error worth reporting.
  }
  return ok;
}
