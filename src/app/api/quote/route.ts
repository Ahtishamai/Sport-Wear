import { prisma, withDbRetry } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { isEmail, reference } from '@/lib/utils';
import { saveUpload } from '@/lib/upload';
import { notifyQuote } from '@/lib/notify';
import { cleanAttribution } from '@/lib/attribution';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`quote:${ip}`, 6, 10 * 60_000).ok) {
    return json({ error: 'Too many requests. Please try again shortly.' }, 429);
  }

  try {
    const form = await req.formData();
    const get = (k: string) => String(form.get(k) ?? '').trim();

    // Honeypot — bots fill hidden fields.
    if (get('company')) return json({ ok: true });

    // VARCHAR(191) columns: an over-long value is cut, never a lost lead.
    const team = get('team').slice(0, 191);
    const name = get('name').slice(0, 191);
    const phone = get('phone').slice(0, 60);
    const email = get('email').slice(0, 191);

    if (!team) return badRequest('Team or organization is required.');
    if (!name) return badRequest('Your name is required.');
    if (!phone || phone.replace(/\D/g, '').length < 7) return badRequest('A valid phone is required.');
    if (!email || !isEmail(email)) return badRequest('A valid email is required.');

    const rosterRaw = get('rosterSize');
    let rosterSize: number | null = null;
    if (rosterRaw) {
      if (!/^\d+$/.test(rosterRaw) || Number(rosterRaw) < 1) {
        return badRequest('Roster size must be a whole number of 1 or more.');
      }
      rosterSize = Number(rosterRaw);
    }

    let context: Record<string, unknown> = {};
    try {
      context = JSON.parse(get('context') || '{}');
    } catch {
      context = {};
    }

    // Attachments
    const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    const attachments: { url: string; filename: string; size: number }[] = [];
    for (const f of files.slice(0, 8)) {
      try {
        const saved = await saveUpload(f, 'quotes');
        attachments.push({ url: saved.url, filename: saved.filename, size: saved.size });
      } catch {
        // Skip files that fail validation rather than losing the whole lead.
      }
    }

    // Only trust a productId that actually exists.
    let productId: string | null = null;
    if (typeof context.productId === 'string') {
      const exists = await prisma.product.findUnique({
        where: { id: context.productId },
        select: { id: true },
      });
      productId = exists?.id ?? null;
    }

    const quote = await withDbRetry(() =>
      prisma.quoteRequest.create({
      data: {
        reference: reference('Q'),
        subject: get('subject').slice(0, 191) || 'Custom team kit',
        team,
        name,
        phone,
        email: email.toLowerCase(),
        sport: get('sport').slice(0, 191) || null,
        rosterSize,
        deadline: get('deadline').slice(0, 191) || null,
        message: get('message') || null,
        productId,
        productTitle: typeof context.productTitle === 'string' ? context.productTitle : null,
        colorway: typeof context.colorway === 'string' ? context.colorway : null,
        sizeRun: (context.sizeRun as object) ?? undefined,
        totalUnits: Number(context.totalUnits) || null,
        unitPrice: Number(context.unitPrice) || null,
        estTotal: Number(context.estTotal) || null,
        attachments: attachments.length ? attachments : undefined,
        // Both columns are VARCHAR(512); a long ad-click address must not
        // be the reason a lead fails to save.
        pageUrl: get('pageUrl').slice(0, 512) || null,
        referrer: get('referrer').slice(0, 512) || null,
        utm: cleanAttribution(get('utm')) ?? undefined,
        // Where on the site it was sent from: "landing:custom-baseball-jerseys"
        // for an ad landing page, otherwise the drawer every page shares.
        source: /^[a-z0-9:-]{1,60}$/.test(get('source')) ? get('source') : 'site',
        },
      })
    );

    await notifyQuote(quote).catch(() => {});

    return json({ ok: true, reference: quote.reference });
  } catch (err) {
    return serverError(err);
  }
}
