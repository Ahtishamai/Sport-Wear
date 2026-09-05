/**
 * The order confirmation email.
 *
 * Email clients are twenty years behind browsers: this is deliberately a stack
 * of tables with inline styles, no flexbox, no grid and no stylesheet, because
 * Outlook renders with Word and Gmail strips <style>. Every image is an
 * absolute URL for the same reason — an email has no origin to be relative to.
 */

export type OrderEmailItem = {
  name: string;
  image: string | null;
  size: string | null;
  nameOnItem: string | null;
  numberOnItem: string | null;
  options: { name: string; value: string }[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderEmailData = {
  reference: string;
  placedAt: Date;
  paid: boolean;
  invoiceNumber: string | null;
  customerName: string;
  email: string;
  items: OrderEmailItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  storeName: string;
  storeUrl: string;
  closesAt: string | null;
  shipNote: string | null;
  /** Editable copy from the admin. */
  intro: string;
  footer: string;
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  trackUrl: string | null;
};

const INK = '#101114';
const BRAND = '#ffd100';
const LINE = '#e3e4e7';
const MUTED = '#6b6d74';

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cash(n: number, currency: string) {
  const v = Number.isFinite(n) ? n : 0;
  const s = v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return currency && currency !== 'USD' ? `${s} ${currency}` : `$${s}`;
}

function when(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/** Absolute, because a relative src is a broken image in every mail client. */
function absolute(url: string | null, base: string) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return base.replace(/\/+$/, '') + (url.startsWith('/') ? url : '/' + url);
}

/** The personalisation lines, which are the whole point of a team store. */
function detailRows(i: OrderEmailItem): [string, string][] {
  const rows: [string, string][] = [];
  if (i.size) rows.push(['Size', i.size]);
  if (i.nameOnItem) rows.push(['Name on item', i.nameOnItem]);
  if (i.numberOnItem) rows.push(['Number on item', i.numberOnItem]);
  for (const o of i.options ?? []) if (o?.name && o?.value) rows.push([o.name, o.value]);
  return rows;
}

function itemBlock(i: OrderEmailItem, currency: string, base: string) {
  const img = absolute(i.image, base);
  const rows = detailRows(i);

  const details = rows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
         ${rows
           .map(
             ([k, v]) => `<tr>
               <td style="padding:2px 12px 2px 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};white-space:nowrap;">${esc(k)}</td>
               <td style="padding:2px 0;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">${esc(v)}</td>
             </tr>`
           )
           .join('')}
       </table>`
    : `<p style="margin:8px 0 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};">No personalisation</p>`;

  return `<tr>
    <td style="padding:18px 0;border-bottom:1px solid ${LINE};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="104" valign="top" style="width:104px;padding-right:16px;">
            ${
              img
                ? `<img src="${esc(img)}" width="104" alt="${esc(i.name)}" style="display:block;width:104px;height:auto;border:1px solid ${LINE};background:#f4f4f5;" />`
                : `<div style="width:104px;height:78px;border:1px solid ${LINE};background:#f4f4f5;"></div>`
            }
          </td>
          <td valign="top">
            <p style="margin:0;font:700 15px/1.35 Arial,Helvetica,sans-serif;color:${INK};text-transform:uppercase;letter-spacing:.02em;">${esc(i.name)}</p>
            ${details}
          </td>
          <td width="112" valign="top" align="right" style="width:112px;">
            <p style="margin:0;font:700 15px/1.35 Arial,Helvetica,sans-serif;color:${INK};">${cash(i.lineTotal, currency)}</p>
            <p style="margin:4px 0 0;font:400 12px/1.4 Arial,Helvetica,sans-serif;color:${MUTED};">${i.quantity} &times; ${cash(i.unitPrice, currency)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function totalRow(label: string, value: string, strong = false) {
  const pad = strong ? '12px 0 0' : '4px 0';
  const rule = strong ? `border-top:2px solid ${INK};` : '';
  const size = strong ? 17 : 14;
  return `<tr>
    <td style="padding:${pad};font:${strong ? 700 : 400} ${size}px/1.4 Arial,Helvetica,sans-serif;color:${strong ? INK : MUTED};${rule}">${esc(label)}</td>
    <td align="right" style="padding:${pad};font:700 ${size}px/1.4 Arial,Helvetica,sans-serif;color:${INK};${rule}">${esc(value)}</td>
  </tr>`;
}

function factRow(label: string, value: string) {
  return `<tr>
    <td style="padding:3px 14px 3px 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};white-space:nowrap;">${esc(label)}</td>
    <td style="padding:3px 0;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:${INK};">${esc(value)}</td>
  </tr>`;
}

export function renderOrderEmail(d: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const base = d.siteUrl || '';
  const units = d.items.reduce((n, i) => n + i.quantity, 0);
  const plural = units === 1 ? '' : 's';
  const subject = `${d.paid ? 'Order confirmed' : 'Order received'} · ${d.reference} · ${d.storeName}`;

  const facts: string[] = [
    factRow('Order number', d.reference),
    factRow('Placed', when(d.placedAt)),
    factRow('Team store', d.storeName),
  ];
  if (d.customerName) facts.push(factRow('Ordered by', d.customerName));
  if (d.email) facts.push(factRow('Email', d.email));
  if (d.invoiceNumber) facts.push(factRow('Invoice number', d.invoiceNumber));
  facts.push(factRow('Payment', d.paid ? 'Paid in full' : 'Awaiting payment'));
  if (d.closesAt) facts.push(factRow('Store closes', d.closesAt));

  const preheader = `${d.reference} — ${units} item${plural}, ${cash(d.total, d.currency)}. ${d.intro}`;
  const greeting = d.customerName ? `Hi ${d.customerName.split(' ')[0]},` : 'Hi,';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;">

  <tr>
    <td style="background:${INK};padding:24px 28px;">
      <p style="margin:0;font:700 13px/1 Arial,Helvetica,sans-serif;color:${BRAND};letter-spacing:.16em;text-transform:uppercase;">${esc(d.siteName)}</p>
      <p style="margin:10px 0 0;font:700 26px/1.2 Arial,Helvetica,sans-serif;color:#ffffff;">${d.paid ? 'Your order is confirmed' : 'We have your order'}</p>
    </td>
  </tr>

  <tr>
    <td style="background:${BRAND};padding:14px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font:700 13px/1.4 Arial,Helvetica,sans-serif;color:${INK};letter-spacing:.1em;text-transform:uppercase;">Order ${esc(d.reference)}</td>
          <td align="right" style="font:700 13px/1.4 Arial,Helvetica,sans-serif;color:${INK};">${units} item${plural} &middot; ${cash(d.total, d.currency)}</td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:26px 28px 0;">
      <p style="margin:0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">${esc(greeting)}</p>
      <p style="margin:12px 0 0;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">${esc(d.intro)}</p>
    </td>
  </tr>

  <tr>
    <td style="padding:22px 28px 0;">
      <p style="margin:0 0 4px;font:700 12px/1 Arial,Helvetica,sans-serif;color:${MUTED};letter-spacing:.14em;text-transform:uppercase;">What you ordered</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${d.items.map((i) => itemBlock(i, d.currency, base)).join('')}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:18px 28px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${totalRow('Subtotal', cash(d.subtotal, d.currency))}
        ${totalRow('Shipping', d.shipping > 0 ? cash(d.shipping, d.currency) : 'Included')}
        ${totalRow('Total', cash(d.total, d.currency), true)}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:26px 28px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f7f8;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font:700 12px/1 Arial,Helvetica,sans-serif;color:${MUTED};letter-spacing:.14em;text-transform:uppercase;">Order details</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">${facts.join('')}</table>
        </td></tr>
      </table>
    </td>
  </tr>

  ${
    d.shipNote
      ? `<tr><td style="padding:20px 28px 0;">
           <p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">${esc(d.shipNote)}</p>
         </td></tr>`
      : ''
  }

  ${
    d.trackUrl
      ? `<tr><td style="padding:24px 28px 0;">
           <table role="presentation" cellpadding="0" cellspacing="0" border="0">
             <tr><td style="background:${INK};">
               <a href="${esc(d.trackUrl)}" style="display:inline-block;padding:14px 26px;font:700 13px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;letter-spacing:.1em;text-transform:uppercase;">Track this order</a>
             </td></tr>
           </table>
         </td></tr>`
      : ''
  }

  <tr>
    <td style="padding:24px 28px 28px;">
      <p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#2c2e33;">${esc(d.footer)}</p>
    </td>
  </tr>

  <tr>
    <td style="background:${INK};padding:22px 28px;">
      <p style="margin:0;font:700 13px/1.5 Arial,Helvetica,sans-serif;color:#ffffff;">${esc(d.siteName)}</p>
      <p style="margin:6px 0 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#a7a9ae;">
        ${d.supportEmail ? `<a href="mailto:${esc(d.supportEmail)}" style="color:${BRAND};text-decoration:none;">${esc(d.supportEmail)}</a>` : ''}
        ${d.supportEmail && d.supportPhone ? ' &middot; ' : ''}
        ${esc(d.supportPhone)}
      </p>
      ${
        d.storeUrl
          ? `<p style="margin:10px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#a7a9ae;">
               <a href="${esc(d.storeUrl)}" style="color:#a7a9ae;">${esc(d.storeUrl)}</a>
             </p>`
          : ''
      }
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // A plain-text part is not a formality: without one, spam filters score the
  // message worse and text-only clients show nothing at all.
  const lines: string[] = [];
  lines.push(`${d.paid ? 'ORDER CONFIRMED' : 'ORDER RECEIVED'} — ${d.reference}`);
  lines.push(d.storeName);
  lines.push('');
  lines.push(d.intro);
  lines.push('');
  lines.push('WHAT YOU ORDERED');
  for (const i of d.items) {
    lines.push(
      `- ${i.name}  ${i.quantity} x ${cash(i.unitPrice, d.currency)} = ${cash(i.lineTotal, d.currency)}`
    );
    for (const [k, v] of detailRows(i)) lines.push(`    ${k}: ${v}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${cash(d.subtotal, d.currency)}`);
  lines.push(`Shipping: ${d.shipping > 0 ? cash(d.shipping, d.currency) : 'Included'}`);
  lines.push(`Total:    ${cash(d.total, d.currency)}`);
  lines.push('');
  lines.push('ORDER DETAILS');
  lines.push(`Order number: ${d.reference}`);
  lines.push(`Placed: ${when(d.placedAt)}`);
  if (d.customerName) lines.push(`Ordered by: ${d.customerName}`);
  if (d.email) lines.push(`Email: ${d.email}`);
  if (d.invoiceNumber) lines.push(`Invoice number: ${d.invoiceNumber}`);
  lines.push(`Payment: ${d.paid ? 'Paid in full' : 'Awaiting payment'}`);
  if (d.closesAt) lines.push(`Store closes: ${d.closesAt}`);
  if (d.shipNote) {
    lines.push('');
    lines.push(d.shipNote);
  }
  if (d.trackUrl) {
    lines.push('');
    lines.push(`Track this order: ${d.trackUrl}`);
  }
  lines.push('');
  lines.push(d.footer);
  lines.push('');
  lines.push(
    `${d.siteName}${d.supportEmail ? ` · ${d.supportEmail}` : ''}${d.supportPhone ? ` · ${d.supportPhone}` : ''}`
  );

  return { subject, html, text: lines.join('\n') };
}
