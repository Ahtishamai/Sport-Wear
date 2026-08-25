import { prisma, withDbRetry } from '@/lib/db';
import { badRequest, clientIp, json, rateLimit, serverError } from '@/lib/api';
import { isEmail } from '@/lib/utils';
import { notifyContact } from '@/lib/notify';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`contact:${ip}`, 6, 10 * 60_000).ok) {
    return json({ error: 'Too many messages. Please try again shortly.' }, 429);
  }

  try {
    const body = await req.json();
    const get = (k: string) => String(body?.[k] ?? '').trim();

    if (get('company')) return json({ ok: true }); // honeypot

    const name = get('name');
    const email = get('email');
    const message = get('message');

    if (!name) return badRequest('Your name is required.');
    if (!email || !isEmail(email)) return badRequest('A valid email is required.');
    if (message.length < 10) return badRequest('Please add a little more detail.');

    const row = await withDbRetry(() =>
      prisma.contactMessage.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: get('phone') || null,
        subject: get('subject') || null,
        message,
        pageUrl: get('pageUrl') || null,
        },
      })
    );

    await notifyContact(row).catch(() => {});

    return json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
