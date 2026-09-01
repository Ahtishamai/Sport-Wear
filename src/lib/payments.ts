import 'server-only';
import { prisma } from './db';

/**
 * The PayPal secret is deliberately NOT part of SiteSettings.
 *
 * That object is handed whole to the site layout and on to the footer. It is a
 * server component today, but one `'use client'` away from serialising every
 * settings value into the HTML of every page. A credential should not depend on
 * that staying true, so it lives in its own row that only this module reads.
 */

const KEY = 'payments';

type PaymentSecrets = { paypalSecret: string };

export async function getPaymentSecrets(): Promise<PaymentSecrets> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    const v = (row?.value ?? {}) as Partial<PaymentSecrets>;
    return { paypalSecret: typeof v.paypalSecret === 'string' ? v.paypalSecret : '' };
  } catch {
    return { paypalSecret: '' };
  }
}

/** An empty string leaves the stored secret untouched, so the admin form can
 *  submit without ever holding the real value. */
export async function savePaymentSecret(paypalSecret: string): Promise<void> {
  const next = (paypalSecret ?? '').trim();
  if (!next) return;
  const current = await getPaymentSecrets();
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: { ...current, paypalSecret: next } },
    update: { value: { ...current, paypalSecret: next } },
  });
}

export async function clearPaymentSecret(): Promise<void> {
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: { paypalSecret: '' } },
    update: { value: { paypalSecret: '' } },
  });
}

/** Safe for the admin UI: says whether a secret exists, never what it is. */
export async function paypalSecretSummary(): Promise<{ set: boolean; hint: string }> {
  const { paypalSecret } = await getPaymentSecrets();
  if (!paypalSecret) return { set: false, hint: '' };
  return { set: true, hint: '••••••••' + paypalSecret.slice(-4) };
}
