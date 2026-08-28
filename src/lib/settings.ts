import 'server-only';
import { cache } from 'react';
import { prisma, plain } from './db';

export type SiteSettings = {
  siteName: string;
  tagline: string;
  logoDark: string;
  logoLight: string;
  favicon: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  announcement: string[];
  announcementEnabled: boolean;
  footerBlurb: string;
  social: { label: string; short: string; href: string }[];
  copyright: string;
  footerMeta: string;
  quoteHeadline: string;
  quoteEyebrow: string;
  quoteReassurance: string;
  quoteSuccessTitle: string;
  quoteSuccessBody: string;
  deadlineOptions: string[];
  sportOptions: string[];
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  gtmId: string;
  ga4Id: string;
  // ---- order tracking (Google Sheet) ----
  trackingEnabled: boolean;
  trackingSheetUrl: string;
  trackingSheetTab: string;
  trackingCacheMinutes: number;
  trackingHeading: string;
  trackingIntro: string;
  trackingPlaceholder: string;
  trackingNotFound: string;
  trackingHelp: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Design Sportswear',
  tagline: 'Custom baseball & softball uniforms',
  logoDark: '/brand/logo-black.png',
  logoLight: '/brand/logo-white.png',
  favicon: '/favicon.ico',
  phone: '+1 (959) 241-9213',
  phoneHref: 'tel:+19592419213',
  email: 'info@design-sportswear.com',
  address: '1601 Main St, Springfield, Massachusetts 01103',
  announcement: [
    'FREE DIGITAL MOCKUP IN 24 HOURS',
    '3–4 WEEK TURNAROUND · 2-WEEK RUSH',
    'NO ART OR SETUP FEES',
  ],
  announcementEnabled: true,
  footerBlurb:
    'Custom sublimated baseball and softball uniforms, built in-house and delivered to your whole roster.',
  social: [
    { label: 'Facebook', short: 'f', href: 'https://facebook.com' },
    { label: 'Instagram', short: 'ig', href: 'https://instagram.com' },
    { label: 'TikTok', short: 'tt', href: 'https://tiktok.com' },
  ],
  copyright: '© 2026 Design Sportswear. All rights reserved.',
  footerMeta: 'Springfield, MA · Shipping nationwide',
  quoteHeadline: 'Request a quote',
  quoteEyebrow: 'NO OBLIGATION · 24H REPLY',
  quoteReassurance: 'No deposit, no obligation. We reply within 24 hours on business days.',
  quoteSuccessTitle: 'Request received',
  quoteSuccessBody:
    'Our art team will send your free mockup and a firm per-unit price within 24 hours.',
  deadlineOptions: ['3–4 weeks', '2-week rush', 'Just planning'],
  sportOptions: ['Baseball', 'Softball', 'Other'],
  defaultSeoTitle: 'Design Sportswear — Custom Baseball & Softball Uniforms',
  defaultSeoDescription:
    'Custom sublimated baseball and softball uniforms with a free digital mockup in 24 hours, 3–4 week turnaround and no art or setup fees.',
  gtmId: '',
  ga4Id: '',
  trackingEnabled: false,
  trackingSheetUrl: '',
  trackingSheetTab: '',
  trackingCacheMinutes: 5,
  trackingHeading: 'Track your order',
  trackingIntro: 'Enter your order number to check the status of your order.',
  trackingPlaceholder: 'e.g. DS20439',
  trackingNotFound:
    'We could not find that order number. Check it against your confirmation email, or call us and we will look it up.',
  trackingHelp: 'Your order number is on your confirmation email, in the form DS20439.',
};

const SETTINGS_KEY = 'site';

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(plain(row.value) as Partial<SiteSettings>) };
  } catch {
    // DB not reachable yet (first boot / no migration) — fall back to defaults.
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(patch: Partial<SiteSettings>) {
  const current = await getSettings();
  const value = { ...current, ...patch };
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value },
    update: { value },
  });
  return value;
}
