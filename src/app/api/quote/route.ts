import { prisma, withDbRetry } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { isEmail, reference } from '@/lib/utils';
import { saveUpload } from '@/lib/upload';
import { notifyQuote } from '@/lib/notify';

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

    const team = get('team');
    const name = get('name');
    const phone = get('phone');
    const email = get('email');

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
        subject: get('subject') || 'Custom team kit',
        team,
        name,
        phone,
        email: email.toLowerCase(),
        sport: get('sport') || null,
        rosterSize,
        deadline: get('deadline') || null,
        message: get('message') || null,
        productId,
        productTitle: typeof context.productTitle === 'string' ? context.productTitle : null,
        colorway: typeof context.colorway === 'string' ? context.colorway : null,
        sizeRun: (context.sizeRun as object) ?? undefined,
        totalUnits: Number(context.totalUnits) || null,
        unitPrice: Number(context.unitPrice) || null,
        estTotal: Number(context.estTotal) || null,
        attachments: attachments.length ? attachments : undefined,
        pageUrl: get('pageUrl') || null,
        referrer: get('referrer') || null,
        },
      })
    );

    await notifyQuote(quote).catch(() => {});

    return json({ ok: true, reference: quote.reference });
  } catch (err) {
    return serverError(err);
  }
}
