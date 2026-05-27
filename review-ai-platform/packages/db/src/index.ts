import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __reviewAiPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__reviewAiPrisma__ ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__reviewAiPrisma__ = prisma;
}

export * from "@prisma/client";
