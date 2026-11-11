import 'server-only';
import { money } from './utils';
import { prisma } from './db';
import { getMailConfig, isMailReady, sendMail, type MailConfig } from './mail';
import { getSettings } from './settings';
import { siteBase } from './seo';

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
  id?: string;
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
  unitPrice?: unknown;
  estTotal: unknown;
  sizeRun?: unknown;
  attachments?: unknown;
  pageUrl?: string | null;
  referrer?: string | null;
  source?: string | null;
  createdAt?: Date | string | null;
};

/** What the quote form saved about each uploaded file. */
type QuoteFile = { url: string; filename: string; size: number };

/**
 * Anything larger than this is linked rather than sent.
 *
 * Mail servers reject a message over their own limit outright, and the
 * encoding adds about a third on top of the bytes. Losing the whole
 * notification because somebody attached a 30MB layered file would be worse
 * than making one person click a link, so the cap is well under what a
 * mailbox will take.
 */
const ATTACH_BUDGET = 10 * 1024 * 1024;

function filesOf(value: unknown): QuoteFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) => {
    if (!f || typeof f !== 'object') return [];
    const { url, filename, size } = f as Record<string, unknown>;
    if (typeof url !== 'string' || !url) return [];
    return [{
      url,
      filename: typeof filename === 'string' && filename ? filename : url.split('/').pop() || 'file',
      size: Number(size) || 0,
    }];
  });
}

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

/** "YS 2 · YM 3 · L 6", or nothing when no size run was chosen. */
function sizeRunLine(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const parts = Object.entries(value as Record<string, unknown>)
    .map(([label, n]) => [label, Number(n)] as const)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .map(([label, n]) => `${label} ${n}`);
  return parts.join(' · ');
}

/**
 * The uploaded bytes, read from the database.
 *
 * Disk is only a cache that a rebuild empties, so the row is the authority.
 * A file that cannot be read is skipped rather than throwing: the message
 * still has to go out, and the link to it is in the body either way.
 */
async function attachmentsFor(files: QuoteFile[]) {
  const out: { filename: string; content: Buffer; contentType?: string }[] = [];
  const linkedOnly: QuoteFile[] = [];
  let budget = ATTACH_BUDGET;

  for (const f of files) {
    if (f.size > budget) { linkedOnly.push(f); continue; }
    try {
      const row = await prisma.uploadedFile.findUnique({
        where: { path: f.url },
        select: { data: true, mimeType: true },
      });
      if (!row?.data) { linkedOnly.push(f); continue; }
      const content = Buffer.from(row.data);
      if (content.length > budget) { linkedOnly.push(f); continue; }
      budget -= content.length;
      out.push({ filename: f.filename, content, contentType: row.mimeType || undefined });
    } catch {
      linkedOnly.push(f);
    }
  }

  return { attachments: out, linkedOnly };
}

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

/**
 * The whole request, in the order the admin screen shows it, with the
 * artwork attached.
 *
 * It used to carry eight fields and no files, so answering a lead meant
 * opening the admin to find out what had been asked for and what the
 * customer had sent. Everything on that screen is here instead, and the
 * uploads come with it, so the mail is enough on its own.
 */
export async function notifyQuote(q: QuoteLike) {
  const base = siteBase();
  const files = filesOf(q.attachments);
  const { attachments, linkedOnly } = await attachmentsFor(files);
  const attached = new Set(attachments.map((a) => a.filename));

  /*
   * The shop's clock, not the server's.
   *
   * The machine this runs on is not in Massachusetts, so a request taken at
   * three in the afternoon was being announced as one the next morning. The
   * owner reads this against the admin screen and their own day, and both of
   * those are Eastern.
   */
  const received = q.createdAt
    ? new Date(q.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/New_York',
      }) + ' ET'
    : null;

  const sizes = sizeRunLine(q.sizeRun);
  const row = (label: string, value: unknown) =>
    value === null || value === undefined || value === '' ? null : `${(label + ':').padEnd(14)}${value}`;

  const out: (string | null)[] = [
    `New quote request — ${q.reference}`,
    received ? `Received ${received}` : null,
    '',
    'REQUEST',
    '───────',
    row('Subject', q.subject),
    row('Team', q.team),
    row('Contact', q.name),
    row('Email', q.email),
    row('Phone', q.phone),
    row('Sport', q.sport),
    row('Roster size', q.rosterSize),
    row('Timing', q.deadline),
  ];

  if (q.productTitle || q.colorway || q.totalUnits || q.unitPrice || q.estTotal || sizes) {
    out.push(
      '',
      'PRODUCT CONFIGURATION',
      '─────────────────────',
      row('Product', q.productTitle),
      row('Colorway', q.colorway),
      row('Total units', q.totalUnits),
      row('Unit price', q.unitPrice ? money(Number(q.unitPrice)) : null),
      row('Estimate', q.estTotal ? money(Number(q.estTotal)) : null),
      row('Size run', sizes)
    );
  }

  if (q.message) {
    out.push('', 'NOTES', '─────', q.message);
  }

  if (files.length) {
    out.push('', `ARTWORK & ATTACHMENTS (${files.length})`, '──────────────────────');
    for (const f of files) {
      out.push(
        attached.has(f.filename)
          ? `• ${f.filename} (${kb(f.size)}) — attached to this email`
          : `• ${f.filename} (${kb(f.size)}) — too large to attach\n  ${base}${f.url}`
      );
    }
    if (linkedOnly.length) {
      out.push(
        '',
        'The files above that are not attached are linked instead: a mail server',
        'would have refused the message at that size.'
      );
    }
  }

  out.push(
    '',
    'SOURCE',
    '──────',
    row('Landed on', q.pageUrl),
    row('Referrer', q.referrer || 'Direct'),
    row('Channel', q.source || 'site')
  );

  if (q.id) out.push('', `Open in the admin: ${base}/admin/quotes/${q.id}`);

  const body = out.filter((l) => l !== null).join('\n');
  await deliver(`Quote request ${q.reference} — ${q.team}`, body, q.email, attachments);
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
async function deliver(
  subject: string,
  body: string,
  replyTo?: string,
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
) {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  /*
   * Everyone who should hear about a lead.
   *
   * The list in settings is the usual answer; the environment variables stay
   * ahead of it for deployments configured before that list existed, and the
   * contact address is the floor so a shop that has set nothing still gets
   * told. Duplicates are dropped, because the same address twice is a mail
   * server's idea of a reason to refuse the lot.
   */
  const clean = (list: (string | null | undefined)[]) =>
    list.map((a) => String(a ?? '').trim()).filter((a) => a.includes('@'));

  const fromEnv = clean([
    ...String(process.env.NOTIFY_EMAIL ?? '').split(/[,;]/),
    ...String(process.env.ADMIN_EMAIL ?? '').split(/[,;]/),
  ]);
  const listed = clean(settings?.notifyEmails ?? []);
  // A list somebody has filled in is the answer, not a suggestion added to
  // the contact address: naming three people and still copying the shop
  // mailbox is not what naming three people means.
  const wanted = [...fromEnv, ...(listed.length ? listed : clean([settings?.email]))];
  const to = [...new Set(wanted.map((a) => a.toLowerCase()))].join(', ');

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

  const res = await sendMail(
    { to, subject, text: body, html, replyTo, attachments },
    override ?? undefined
  );
  if (!res.ok) {
    // Never lose the lead to a mail problem.
    console.error(`[lead] notification failed: ${res.error}\n${subject}\n${body}\n`);
  }
}
