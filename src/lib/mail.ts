import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from './db';

/**
 * Outgoing mail.
 *
 * The whole SMTP block lives in its own `Setting` row rather than in
 * SiteSettings, for the same reason the PayPal secret does: SiteSettings is
 * handed whole to the site layout and on to the footer, so anything in it is
 * one `'use client'` away from being serialised into the HTML of every page.
 * A mail server, its login and its password have no business being there.
 */

const KEY = 'email';

export type MailConfig = {
  host: string;
  port: number;
  /** True for implicit TLS (port 465). False means STARTTLS, the usual 587. */
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export const DEFAULT_MAIL: MailConfig = {
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromName: '',
  fromEmail: '',
  replyTo: '',
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v.trim() : fallback);

export async function getMailConfig(): Promise<MailConfig> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    const v = (row?.value ?? {}) as Partial<MailConfig>;
    const port = Number(v.port);
    return {
      host: str(v.host),
      port: Number.isFinite(port) && port > 0 ? Math.trunc(port) : 587,
      secure: v.secure === true,
      user: str(v.user),
      pass: typeof v.pass === 'string' ? v.pass : '',
      fromName: str(v.fromName),
      fromEmail: str(v.fromEmail),
      replyTo: str(v.replyTo),
    };
  } catch {
    return { ...DEFAULT_MAIL };
  }
}

/**
 * Saves the SMTP block. A blank password leaves the stored one alone, so the
 * form can be submitted without the admin re-typing a password it never shows;
 * an explicit null clears it, which is the only way to actually remove one.
 */
export async function saveMailConfig(patch: Partial<MailConfig> & { pass?: string | null }) {
  const current = await getMailConfig();
  const { pass, ...rest } = patch;
  const next: MailConfig = { ...current, ...(rest as Partial<MailConfig>) };

  if (pass === null) next.pass = '';
  else if (typeof pass === 'string' && pass.trim()) next.pass = pass;
  else next.pass = current.pass;

  const port = Number(next.port);
  next.port = Number.isFinite(port) && port > 0 ? Math.trunc(port) : 587;
  next.secure = next.secure === true;

  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next as unknown as object },
    update: { value: next as unknown as object },
  });
  return next;
}

export type MailSummary = Omit<MailConfig, 'pass'> & { passSet: boolean; ready: boolean };

/** Safe for the admin UI: everything except the password. */
export async function mailConfigSummary(): Promise<MailSummary> {
  const c = await getMailConfig();
  const { pass, ...rest } = c;
  return { ...rest, passSet: Boolean(pass), ready: isMailReady(c) };
}

export function isMailReady(c: MailConfig) {
  return Boolean(c.host && c.fromEmail);
}

/** `Name <address>`, falling back to the bare address. */
export function fromHeader(c: MailConfig) {
  return c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail;
}

function transportFor(c: MailConfig): Transporter {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.pass } : undefined,
    // Shared hosting is slow to answer; the default 2 minutes would hold a
    // checkout response open far longer than a shopper will wait.
    connectionTimeout: 15_000,
    greetingTimeout: 12_000,
    socketTimeout: 25_000,
  });
}

export type MailResult = { ok: boolean; messageId?: string; error?: string };

/**
 * Sends one message and never throws.
 *
 * Every caller is doing something more important than the email — confirming a
 * payment, most of all. A mail server that is down, slow or misconfigured must
 * not turn a completed order into an error for the shopper, so failures are
 * logged and reported, not raised.
 */
export async function sendMail(
  msg: {
    to: string;
    subject: string;
    html: string;
    text: string;
    bcc?: string;
    replyTo?: string;
  },
  /** Settings typed into the admin form but not saved yet, for a test send. */
  override?: MailConfig
): Promise<MailResult> {
  const c = override ?? (await getMailConfig());
  if (!isMailReady(c)) return { ok: false, error: 'Email is not set up yet.' };
  if (!msg.to.trim() && !msg.bcc?.trim()) return { ok: false, error: 'No recipient.' };

  try {
    const info = await transportFor(c).sendMail({
      from: fromHeader(c),
      to: msg.to || undefined,
      bcc: msg.bcc || undefined,
      replyTo: msg.replyTo || c.replyTo || undefined,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[mail] send failed:', error);
    return { ok: false, error };
  }
}

/** Opens a connection and authenticates, without sending anything. */
export async function verifyMail(override?: Partial<MailConfig>): Promise<MailResult> {
  const stored = await getMailConfig();
  const c: MailConfig = { ...stored, ...(override ?? {}) };
  if (override && typeof override.pass === 'string' && !override.pass.trim()) c.pass = stored.pass;
  if (!c.host) return { ok: false, error: 'Enter the mail server address first.' };

  try {
    await transportFor(c).verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Splits a comma or semicolon separated list of addresses. */
export function addressList(raw: string): string[] {
  return String(raw ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
