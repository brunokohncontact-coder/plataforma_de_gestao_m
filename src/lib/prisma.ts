import { PrismaClient } from "@prisma/client";

/**
 * Instância singleton do Prisma Client. Em desenvolvimento, o hot-reload do Next.js
 * recria módulos; guardamos a instância em `globalThis` para não esgotar conexões.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
