import 'server-only';
import { getSettings } from '../settings';
import { sendMail, type MailResult } from '../mail';
import { esc } from './order';

/**
 * The two letters an account ever sends: prove this address, and set a new
 * password.
 *
 * Tables and inline styles, like every other email here, for the same reason
 * — Outlook renders with Word and Gmail strips <style>.
 */

const INK = '#101114';
const BRAND = '#ffd100';
const LINE = '#e3e4e7';
const MUTED = '#6b6d74';

type Letter = {
  heading: string;
  body: string;
  button: string;
  /** Said plainly under the button, for anyone who did not ask for this. */
  ifNotYou: string;
  expiry: string;
};

const LETTERS: Record<'VERIFY' | 'RESET', Letter> = {
  VERIFY: {
    heading: 'Confirm your email',
    body: 'One press and your account is ready. After that you will be able to see every order placed with this address, and reorder any of them without filling the form in again.',
    button: 'Confirm my email',
    ifNotYou: 'If you did not make an account with us, ignore this — nothing has been set up and no order history can be seen until this link is used.',
    expiry: 'This link works once, and for 48 hours.',
  },
  RESET: {
    heading: 'Set a new password',
    body: 'Press the button below to choose a new password for your account. Your current one keeps working until you do.',
    button: 'Set a new password',
    ifNotYou: 'If you did not ask for this, ignore it. Your password has not changed and nobody has been let into your account.',
    expiry: 'This link works once, and for 1 hour.',
  },
};

function render(kind: 'VERIFY' | 'RESET', d: { name: string; url: string; siteName: string; siteUrl: string; supportEmail: string }) {
  const L = LETTERS[kind];
  const subject = `${L.heading} · ${d.siteName}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};">
        <tr><td style="background:${INK};padding:20px 28px;">
          <a href="${esc(d.siteUrl)}" style="font:900 18px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;letter-spacing:.02em;">${esc(d.siteName)}</a>
        </td></tr>
        <tr><td style="padding:30px 28px 8px;">
          <h1 style="margin:0;font:900 22px/1.2 Arial,Helvetica,sans-serif;color:${INK};text-transform:uppercase;letter-spacing:-.01em;">${esc(L.heading)}</h1>
          ${d.name ? `<p style="margin:14px 0 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${INK};">Hi ${esc(d.name)},</p>` : ''}
          <p style="margin:12px 0 0;font:400 15px/1.55 Arial,Helvetica,sans-serif;color:${INK};">${esc(L.body)}</p>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;">
          <a href="${esc(d.url)}" style="display:inline-block;background:${BRAND};color:${INK};font:700 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:15px 26px;text-transform:uppercase;letter-spacing:.04em;">${esc(L.button)}</a>
        </td></tr>
        <tr><td style="padding:14px 28px 28px;">
          <p style="margin:0;font:400 12.5px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">${esc(L.expiry)} If the button does not work, copy this address into your browser:</p>
          <p style="margin:6px 0 0;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};word-break:break-all;">${esc(d.url)}</p>
          <p style="margin:16px 0 0;font:400 12.5px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">${esc(L.ifNotYou)}</p>
        </td></tr>
        <tr><td style="border-top:1px solid ${LINE};padding:18px 28px;">
          <p style="margin:0;font:400 12.5px/1.55 Arial,Helvetica,sans-serif;color:${MUTED};">
            ${esc(d.siteName)}${d.supportEmail ? ` · <a href="mailto:${esc(d.supportEmail)}" style="color:${MUTED};">${esc(d.supportEmail)}</a>` : ''}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    L.heading,
    '',
    d.name ? `Hi ${d.name},` : '',
    L.body,
    '',
    d.url,
    '',
    L.expiry,
    L.ifNotYou,
    '',
    d.siteName,
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { subject, html, text };
}

/** Sends one of the two letters. Never throws; a dead mail server is reported. */
export async function sendAccountEmail(
  kind: 'VERIFY' | 'RESET',
  to: string,
  d: { name: string; token: string }
): Promise<MailResult> {
  const settings = await getSettings();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const path = kind === 'VERIFY' ? 'verify' : 'reset';
  const url = `${base}/account/${path}/${encodeURIComponent(d.token)}`;

  const { subject, html, text } = render(kind, {
    name: d.name,
    url,
    siteName: settings.siteName,
    siteUrl: base || '',
    supportEmail: settings.email ?? '',
  });

  return sendMail({ to, subject, html, text });
}
