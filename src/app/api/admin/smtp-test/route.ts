import { getAccessor } from '@/lib/auth';
import { forbidden, json, unauthorized } from '@/lib/api';
import { canUseArea } from '@/lib/permissions';
import { verifyMail, sendMail, getMailConfig, type MailConfig } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Checks outgoing mail before an order depends on it.
 *
 * "Send a test" is the only check that proves anything end to end — a server
 * can accept the connection and still refuse the from address — so this
 * verifies the connection first and then, given an address, actually sends.
 *
 * SMTP failures are famously unreadable ("535 5.7.8"), so the common ones are
 * translated into the thing that is actually wrong.
 */

function explain(raw: string, c: MailConfig): { message: string; detail: string } {
  const e = raw.toLowerCase();

  if (e.includes('eauth') || e.includes('535') || e.includes('authentication')) {
    return {
      message: 'The mail server rejected that username or password.',
      detail:
        'Use the full mailbox address as the username. If the account has two-factor sign-in, ' +
        'an ordinary password will not work — create an app password and paste that instead.',
    };
  }
  if (e.includes('enotfound') || e.includes('eai_again') || e.includes('getaddrinfo')) {
    return {
      message: `No mail server answers at “${c.host}”.`,
      detail: 'Check the address for a typo. Hostinger mailboxes use smtp.hostinger.com.',
    };
  }
  if (e.includes('etimedout') || e.includes('timeout') || e.includes('econnrefused')) {
    return {
      message: `Nothing answered on port ${c.port}.`,
      detail:
        'Port 465 needs the SSL box ticked; port 587 needs it clear. Some hosts block one or ' +
        'the other, so if 587 times out try 465 with SSL on.',
    };
  }
  if (e.includes('wrong version number') || e.includes('ssl') || e.includes('tls')) {
    return {
      message: 'The encryption setting does not match the port.',
      detail:
        c.secure
          ? 'SSL is on, which is for port 465. On port 587, clear the SSL box.'
          : 'SSL is off, which is for port 587. On port 465, tick the SSL box.',
    };
  }
  if (e.includes('from') && (e.includes('reject') || e.includes('denied') || e.includes('553'))) {
    return {
      message: 'The server refused the "from" address.',
      detail: 'Most hosts only let you send from a mailbox they actually host. Use the same address as the username.',
    };
  }
  return { message: 'The mail server refused the connection.', detail: raw.slice(0, 300) };
}

export async function POST(req: Request) {
  const user = await getAccessor();
  if (!user) return unauthorized();
  // Touches mail credentials.
  if (!canUseArea(user, 'settings')) return forbidden();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const stored = await getMailConfig();

  // Whatever is typed into the form wins, so the admin can test before saving.
  // A blank password means "the one already stored", the same as on save.
  const typedPass = String(body.pass ?? '').trim();
  const c: MailConfig = {
    host: String(body.host ?? stored.host).trim(),
    port: Number(body.port ?? stored.port) || 587,
    secure: body.secure === undefined ? stored.secure : body.secure === true,
    user: String(body.user ?? stored.user).trim(),
    pass: typedPass || stored.pass,
    fromName: String(body.fromName ?? stored.fromName).trim(),
    fromEmail: String(body.fromEmail ?? stored.fromEmail).trim(),
    replyTo: String(body.replyTo ?? stored.replyTo).trim(),
  };

  if (!c.host) {
    return json({ ok: false, message: 'Enter the mail server address first.' });
  }
  if (c.user && !c.pass) {
    return json({
      ok: false,
      message: 'Enter the mailbox password first.',
      detail: 'Nothing is saved yet, so there is no stored password to fall back on.',
    });
  }

  const check = await verifyMail(c);
  if (!check.ok) {
    const { message, detail } = explain(check.error ?? '', c);
    return json({ ok: false, message, detail });
  }

  const to = String(body.to ?? '').trim();
  if (!to) {
    return json({
      ok: true,
      message: `Connected to ${c.host}.`,
      detail: 'The login works. Put an address in the box above and send yourself a test to be sure.',
    });
  }
  if (!c.fromEmail) {
    return json({
      ok: false,
      message: 'Set the "from" address before sending.',
      detail: 'This is the address the email arrives from.',
    });
  }

  const sent = await sendMail({
    to,
    subject: 'Test email from your website',
    text:
      'This is a test from your website admin.\n\n' +
      'If you are reading this, order confirmations will reach your customers.\n\n' +
      `Server: ${c.host}:${c.port}${c.secure ? ' (SSL)' : ''}\nFrom: ${c.fromEmail}\n`,
    html:
      '<div style="font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#101114;">' +
      '<p style="margin:0 0 12px;"><b>This is a test from your website admin.</b></p>' +
      '<p style="margin:0 0 12px;">If you are reading this, order confirmations will reach your customers.</p>' +
      `<p style="margin:0;color:#6b6d74;font-size:13px;">Server: ${c.host}:${c.port}${c.secure ? ' (SSL)' : ''}<br />From: ${c.fromEmail}</p>` +
      '</div>',
  }, c);

  if (!sent.ok) {
    const { message, detail } = explain(sent.error ?? '', c);
    return json({ ok: false, message: 'Connected, but the test would not send. ' + message, detail });
  }

  return json({
    ok: true,
    message: `Test email sent to ${to}.`,
    detail: 'If it has not arrived in a minute, check the spam folder — that is worth knowing now rather than after a customer orders.',
  });
}
