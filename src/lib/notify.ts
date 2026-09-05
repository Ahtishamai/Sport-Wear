import 'server-only';
import { money } from './utils';
import { getMailConfig, isMailReady, sendMail, type MailConfig } from './mail';
import { getSettings } from './settings';

/**
 * Lead notifications.
 *
 * Email is optional — with nothing configured the lead is still stored and this
 * logs a one-line summary so nothing is silently lost.
 *
 * The mail server comes from Site settings → Email, the same one order
 * confirmations use, because a shop that has set up sending once should not
 * have to do it again for quote requests. `SMTP_*` environment variables still
 * work and take precedence, for deployments that were configured that way
 * before the settings screen existed.
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

/** The environment-variable form, kept working for existing deployments. */
function envMail(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    fromName: '',
    fromEmail: process.env.SMTP_FROM || user,
    replyTo: '',
  };
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

  await deliver(`Quote request ${q.reference} — ${q.team}`, lines, q.email);
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

  await deliver(`Contact — ${c.name}`, lines, c.email);
}

/**
 * @param replyTo the person who filled the form, so hitting reply answers them
 *                rather than the website's own mailbox.
 */
async function deliver(subject: string, body: string, replyTo?: string) {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  const to =
    process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || settings?.email || '';

  // Environment variables win when present; otherwise the admin's settings.
  const override = envMail();
  const canSend = override !== null || isMailReady(await getMailConfig());

  if (!canSend || !to) {
    console.info(`[lead] ${subject}\n${body}\n`);
    return;
  }

  const html =
    '<pre style="font:400 14px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;">' +
    body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
    '</pre>';

  const res = await sendMail({ to, subject, text: body, html, replyTo }, override ?? undefined);
  if (!res.ok) {
    // Never lose the lead to a mail problem.
    console.error(`[lead] notification failed: ${res.error}\n${subject}\n${body}\n`);
  }
}
