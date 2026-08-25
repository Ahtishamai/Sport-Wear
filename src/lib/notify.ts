import 'server-only';
import { money } from './utils';

/**
 * Lead notifications.
 *
 * SMTP is optional — with no credentials configured the lead is still stored and
 * this logs a one-line summary so nothing is silently lost. Wire a provider
 * (Resend, Postmark, SES…) here when the client picks one; the shape is stable.
 */

type QuoteLike = {
  reference: string;
  subject: string;
  team: string;
  name: string;
  email: string;
  phone: string;
  sport: string | null;
  rosterSize: number | null;
  deadline: string | null;
  message: string | null;
  productTitle: string | null;
  colorway: string | null;
  totalUnits: number | null;
  estTotal: unknown;
};

type ContactLike = {
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
};

const to = () => process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || '';

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function notifyQuote(q: QuoteLike) {
  const lines = [
    `New quote request — ${q.reference}`,
    ``,
    `Subject:     ${q.subject}`,
    `Team:        ${q.team}`,
    `Contact:     ${q.name} · ${q.email} · ${q.phone}`,
    q.sport ? `Sport:       ${q.sport}` : '',
    q.rosterSize ? `Roster:      ${q.rosterSize}` : '',
    q.deadline ? `Timing:      ${q.deadline}` : '',
    q.productTitle ? `Product:     ${q.productTitle}` : '',
    q.colorway ? `Colorway:    ${q.colorway}` : '',
    q.totalUnits ? `Units:       ${q.totalUnits}` : '',
    q.estTotal ? `Estimate:    ${money(Number(q.estTotal))}` : '',
    q.message ? `\nNotes:\n${q.message}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await deliver(`Quote request ${q.reference} — ${q.team}`, lines);
}

export async function notifyContact(c: ContactLike) {
  const lines = [
    `New contact message`,
    ``,
    `From:    ${c.name} · ${c.email}${c.phone ? ` · ${c.phone}` : ''}`,
    c.subject ? `Subject: ${c.subject}` : '',
    ``,
    c.message,
  ]
    .filter(Boolean)
    .join('\n');

  await deliver(`Contact — ${c.name}`, lines);
}

async function deliver(subject: string, body: string) {
  if (!smtpConfigured() || !to()) {
    console.info(`[lead] ${subject}\n${body}\n`);
    return;
  }

  // nodemailer is intentionally not a hard dependency — install it to enable SMTP:
  //   npm i nodemailer && npm i -D @types/nodemailer
  try {
    const spec = 'nodemailer';
    const mod = await import(/* webpackIgnore: true */ spec).catch(() => null);
    if (!mod) {
      console.info(`[lead] ${subject}\n${body}\n`);
      return;
    }
    const nodemailer = (mod as { default?: unknown }).default ?? mod;
    const transport = (
      nodemailer as {
        createTransport: (o: unknown) => { sendMail: (o: unknown) => Promise<unknown> };
      }
    ).createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_USER,
      to: to(),
      subject,
      text: body,
    });
  } catch (err) {
    console.error('[lead] notification failed', err);
  }
}
