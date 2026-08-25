import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Prisma Decimal / Date / BigInt values are not serialisable across the RSC boundary. */
export function plain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (typeof v === 'bigint') return Number(v);
      if (v && typeof v === 'object' && 'toNumber' in v && typeof v.toNumber === 'function') {
        return v.toNumber();
      }
      return v;
    })
  );
}

/**
 * True when a failure is a temporary database capacity problem rather than a
 * bug — shared hosting caps concurrent connections and new connections/hour.
 */
export function isDbCapacityError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    /max_connections_per_hour/i.test(msg) ||
    /max_user_connections/i.test(msg) ||
    /too many connections/i.test(msg) ||
    /has exceeded the .* resource/i.test(msg) ||
    // Numeric codes only count in an error-code context, so a stray "1226"
    // elsewhere in a message is not mistaken for a capacity failure.
    /\b(?:error|code)\b\D{0,12}(?:1040|1203|1226)\b/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg) ||
    /\bP2024\b/.test(msg)
  );
}

/**
 * Retries a write through a transient capacity error with backoff. Used on the
 * lead paths (quote / contact), where dropping the request loses a customer.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isDbCapacityError(err) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 250 * 2 ** i));
    }
  }
  throw lastError;
}
