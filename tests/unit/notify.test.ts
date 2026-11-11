import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * What the shop is actually sent when somebody fills in the quote form.
 *
 * The mail transport and the database are replaced, so nothing is sent and
 * nothing is written: this checks the message that would go out, which is
 * the part that kept being wrong.
 */

type SentMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

const sendMail = vi.fn(async (_msg: SentMessage, _override?: unknown) => ({
  ok: true as const,
  messageId: '1',
}));
const findUnique = vi.fn();
const settings = {
  email: 'info@design-sportswear.com',
  notifyEmails: [] as string[],
};

vi.mock('@/lib/mail', () => ({
  sendMail: (msg: SentMessage, override?: unknown) => sendMail(msg, override),
  getMailConfig: async () => ({
    host: 'mail.example.com', port: 587, secure: false,
    user: 'u', pass: 'p', fromName: 'S', fromEmail: 'from@example.com', replyTo: '',
  }),
  isMailReady: () => true,
}));

vi.mock('@/lib/db', () => ({
  prisma: { uploadedFile: { findUnique: (...a: unknown[]) => findUnique(...(a as [])) } },
}));

vi.mock('@/lib/settings', () => ({ getSettings: async () => settings }));
vi.mock('@/lib/seo', () => ({ siteBase: () => 'https://design-sportswear.com' }));

const { notifyQuote } = await import('@/lib/notify');

const QUOTE = {
  id: 'q_123',
  reference: 'Q-20261110-HWS6S',
  subject: 'Backpack Design #7 - Fully Customizable — 1 bag',
  team: 'parent for kid',
  name: 'Amber',
  email: 'southernsaigenivy@example.com',
  phone: '3364916189',
  sport: 'Softball',
  rosterSize: 1,
  deadline: '3 to 4 weeks',
  message: 'Team name in navy please.',
  productTitle: 'Backpack Design #7 - Fully Customizable',
  colorway: null,
  totalUnits: 1,
  unitPrice: null,
  estTotal: null,
  sizeRun: { 'ONE SIZE': 1 },
  attachments: [{ url: '/uploads/quotes/abc.png', filename: 'artwork.png', size: 2_800_000 }],
  pageUrl: 'https://design-sportswear.com/products/backpack-design-7-fully-customizable',
  referrer: null,
  source: 'site',
  createdAt: new Date('2026-11-10T20:07:00Z'),
};

/** What was handed to the transport on the last call. */
const sent = (): SentMessage => sendMail.mock.calls.at(-1)![0];

beforeEach(() => {
  sendMail.mockClear();
  findUnique.mockReset();
  settings.notifyEmails = [];
  findUnique.mockResolvedValue({ data: Buffer.from('PNGBYTES'), mimeType: 'image/png' });
});

describe('the quote notification', () => {
  it('carries every field the admin screen shows', async () => {
    await notifyQuote(QUOTE);
    const { text } = sent();

    for (const bit of [
      'Q-20261110-HWS6S',
      // The shop is in Massachusetts; 20:07 UTC is 3:07pm there.
      'Nov 10, 2026, 3:07 PM ET',
      'Backpack Design #7 - Fully Customizable',
      'parent for kid',
      'Amber',
      'southernsaigenivy@example.com',
      '3364916189',
      'Softball',
      '3 to 4 weeks',
      'ONE SIZE 1',
      'Team name in navy please.',
      '/products/backpack-design-7-fully-customizable',
      'Direct',
      'site',
    ]) {
      expect(text, `missing ${bit}`).toContain(bit);
    }
  });

  it('links to the request in the admin', async () => {
    await notifyQuote(QUOTE);
    expect(sent().text).toContain('https://design-sportswear.com/admin/quotes/q_123');
  });

  it('attaches the artwork, with its bytes and type', async () => {
    await notifyQuote(QUOTE);
    const { attachments, text } = sent();

    expect(attachments).toHaveLength(1);
    expect(attachments![0].filename).toBe('artwork.png');
    expect(attachments![0].contentType).toBe('image/png');
    expect(attachments![0].content.toString()).toBe('PNGBYTES');
    expect(text).toContain('attached to this email');
  });

  it('reads the bytes from the database, not from disk', async () => {
    await notifyQuote(QUOTE);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { path: '/uploads/quotes/abc.png' } })
    );
  });

  it('links a file too big to send rather than losing the whole message', async () => {
    const huge = {
      ...QUOTE,
      attachments: [{ url: '/uploads/quotes/big.psd', filename: 'big.psd', size: 40 * 1024 * 1024 }],
    };
    await notifyQuote(huge);
    const { attachments, text } = sent();

    expect(attachments ?? []).toHaveLength(0);
    expect(text).toContain('too large to attach');
    expect(text).toContain('https://design-sportswear.com/uploads/quotes/big.psd');
  });

  it('still sends when the file cannot be read', async () => {
    findUnique.mockResolvedValue(null);
    await notifyQuote(QUOTE);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sent().attachments ?? []).toHaveLength(0);
    expect(sent().text).toContain('artwork.png');
  });

  it('replies to the customer rather than to the website', async () => {
    await notifyQuote(QUOTE);
    expect(sent().replyTo).toBe('southernsaigenivy@example.com');
  });

  it('leaves out a section the request has nothing for', async () => {
    const bare = {
      ...QUOTE,
      productTitle: null, colorway: null, totalUnits: null,
      unitPrice: null, estTotal: null, sizeRun: null,
      message: null, attachments: [],
    };
    await notifyQuote(bare);
    const { text } = sent();

    expect(text).not.toContain('PRODUCT CONFIGURATION');
    expect(text).not.toContain('NOTES');
    expect(text).not.toContain('ARTWORK');
    expect(text).toContain('REQUEST');
  });
});

describe('who the notification goes to', () => {
  it('goes to the contact address when nobody else is named', async () => {
    await notifyQuote(QUOTE);
    expect(sent().to).toBe('info@design-sportswear.com');
  });

  it('goes to everybody on the list', async () => {
    settings.notifyEmails = ['owner@example.com', 'art@example.com', 'sales@example.com'];
    await notifyQuote(QUOTE);
    expect(sent().to).toBe('owner@example.com, art@example.com, sales@example.com');
  });

  it('treats a list somebody filled in as the answer, not an addition', async () => {
    settings.notifyEmails = ['owner@example.com'];
    await notifyQuote(QUOTE);
    expect(sent().to).not.toContain('info@design-sportswear.com');
  });

  it('ignores blanks and rubbish typed into the list', async () => {
    settings.notifyEmails = ['  owner@example.com ', '', 'not an address', '   '];
    await notifyQuote(QUOTE);
    expect(sent().to).toBe('owner@example.com');
  });

  it('never addresses the same person twice', async () => {
    settings.notifyEmails = ['owner@example.com', 'OWNER@example.com', 'owner@example.com'];
    await notifyQuote(QUOTE);
    expect(sent().to).toBe('owner@example.com');
  });
});
