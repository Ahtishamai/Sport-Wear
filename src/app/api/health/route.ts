import { prisma } from '@/lib/db';
import { authSecretConfigured } from '@/lib/auth';
import { json } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deployment sanity check. Reports whether the two things sign-in depends on
 * are actually working, without exposing any values. Useful on hosts where
 * server logs are hard to reach.
 *   GET /api/health
 */
export async function GET() {
  const checks: Record<string, string> = {};

  checks.auth = authSecretConfigured() ? 'configured' : 'MISSING — set AUTH_SECRET (32+ chars)';

  const started = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    checks.database = `up (${Date.now() - started}ms)`;
  } catch (err) {
    checks.database = 'DOWN — check DATABASE_URL';
    console.error('[health] database check failed:', err instanceof Error ? err.message : err);
  }

  let admins: number | null = null;
  try {
    admins = await prisma.user.count();
  } catch {
    admins = null;
  }
  checks.adminAccounts = admins === null ? 'unknown' : String(admins);

  const ok = checks.auth === 'configured' && checks.database.startsWith('up');

  return json({ ok, checks, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null }, ok ? 200 : 503);
}
