import 'server-only';
import { prisma } from '../db';
import { getSettings } from '../settings';
import { addressList, sendMail, type MailResult } from '../mail';
import { checkAddresses } from '../utils';
import { esc } from './order';

/**
 * The receipt for an invoice payment.
 *
 * Deliberately plainer than the order confirmation: there is nothing to
 * itemise, and the only things anyone needs afterwards are the invoice number,
 * what was paid, and a reference to quote back at the shop.
 */
export async function sendPaymentReceipt(
  paymentId: string,
  opts: { to?: string | string[] } = {}
): Promise<MailResult & { skipped?: string; recipients?: string[] }> {
  const p = await prisma.invoicePayment.findUnique({ where: { id: paymentId } });
  if (!p) return { ok: false, error: 'Payment not found.' };

  const s = await getSettings();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const amount = Number(p.amount).toFixed(2);
  const cash = p.currency && p.currency !== 'USD' ? `${amount} ${p.currency}` : `$${amount}`;

  const when = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(p.paidAt ?? p.createdAt);

  const subject = `Payment received · ${cash} · invoice ${p.invoiceNumber}`;
  const greeting = p.customerName ? `Hi ${p.customerName.split(' ')[0]},` : 'Hi,';

  const rows: [string, string][] = [
    ['Invoice number', p.invoiceNumber],
    ['Amount paid', cash],
    ['Paid', when],
    ['Payment reference', p.reference],
  ];
  if (p.note) rows.push(['Your note', p.note]);

  const INK = '#101114';
  const BRAND = '#ffd100';
  const MUTED = '#6b6d74';

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(
    `${cash} received against invoice ${p.invoiceNumber}. Reference ${p.reference}.`
  )}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;">

  <tr><td style="background:${INK};padding:24px 28px;">
    <p style="margin:0;font:700 13px/1 Arial,Helvetica,sans-serif;color:${BRAND};letter-spacing:.16em;text-transform:uppercase;">${esc(s.siteName)}</p>
    <p style="margin:10px 0 0;font:700 26px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;">Payment received</p>
  </td></tr>

  <tr><td style="background:${BRAND};padding:14px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font:700 13px/1.4 Arial,Helvetica,sans-serif;color:${INK};letter-spacing:.1em;text-transform:uppercase;">Invoice ${esc(p.invoiceNumber)}</td>
      <td align="right" style="font:700 20px/1.2 Arial,Helvetica,sans-serif;color:${INK};">${esc(cash)}</td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:26px 28px 0;">
    <p style="margin:0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">${esc(greeting)}</p>
    <p style="margin:12px 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">${esc(
      `Thank you — we have received your payment of ${cash} against invoice ${p.invoiceNumber}. This email is your receipt.`
    )}</p>
  </td></tr>

  <tr><td style="padding:24px 28px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f8;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 8px;font:700 12px/1 Arial,Helvetica,sans-serif;color:${MUTED};letter-spacing:.14em;text-transform:uppercase;">Receipt</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          ${rows
            .map(
              ([k, v]) => `<tr>
                <td style="padding:3px 14px 3px 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};white-space:nowrap;">${esc(k)}</td>
                <td style="padding:3px 0;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">${esc(v)}</td>
              </tr>`
            )
            .join('')}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 28px 28px;">
    <p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">
      Quote the payment reference above if you need to ask us about this. If anything looks wrong, just reply to this email.
    </p>
  </td></tr>

  <tr><td style="background:${INK};padding:22px 28px;">
    <p style="margin:0;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:#ffffff;">${esc(s.siteName)}</p>
    <p style="margin:6px 0 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#a7a9ae;">
      ${s.email ? `<a href="mailto:${esc(s.email)}" style="color:${BRAND};text-decoration:none;">${esc(s.email)}</a>` : ''}
      ${s.email && s.phone ? ' &middot; ' : ''}${esc(s.phone)}
    </p>
    ${base ? `<p style="margin:10px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#a7a9ae;"><a href="${esc(base)}" style="color:#a7a9ae;">${esc(base)}</a></p>` : ''}
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `PAYMENT RECEIVED — ${cash}`,
    '',
    `Thank you — we have received your payment of ${cash} against invoice ${p.invoiceNumber}.`,
    'This email is your receipt.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Quote the payment reference above if you need to ask us about this.',
    '',
    `${s.siteName}${s.email ? ` · ${s.email}` : ''}${s.phone ? ` · ${s.phone}` : ''}`,
  ].join('\n');

  const asked = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  const to = checkAddresses(asked ?? p.email ?? '').valid;

  // Anyone named on the message must not also get the blind copy, or the
  // shop's own mailbox receives two of every receipt it is listed on.
  const named = new Set(to.map((a) => a.toLowerCase()));
  const bcc = addressList(s.orderEmailCopyTo).filter((a) => !named.has(a.toLowerCase()));

  // A payment can be taken through PayPal without the customer typing an
  // address here, so "no email" is a normal outcome, not a fault.
  if (!to.length && !bcc.length) {
    return { ok: false, skipped: 'no-recipient', error: 'No address to send to.' };
  }

  const res = await sendMail({
    to: to.join(', '),
    subject,
    html,
    text,
    bcc: bcc.join(', '),
  });
  return { ...res, recipients: to };
}

/** Fire-and-forget wrapper for the capture path, where money has already moved. */
export async function sendPaymentReceiptQuietly(paymentId: string) {
  try {
    const s = await getSettings();
    if (!s.orderEmailsEnabled) return;
    const res = await sendPaymentReceipt(paymentId);
    if (!res.ok && !res.skipped) console.error('[payment-receipt]', paymentId, res.error);
  } catch (err) {
    console.error('[payment-receipt] unexpected:', err);
  }
}
