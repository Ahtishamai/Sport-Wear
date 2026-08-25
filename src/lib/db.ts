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
