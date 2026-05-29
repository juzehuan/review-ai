import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function loadWorkspaceEnv() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const envPath = path.join(current, ".env");
    if (existsSync(envPath)) {
      for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) {
          continue;
        }
        const [rawName, ...rawValueParts] = line.split("=");
        const name = rawName.trim();
        let value = rawValueParts.join("=").trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (name && process.env[name] === undefined) {
          process.env[name] = value;
        }
      }
      return;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }
    current = parent;
  }
}

loadWorkspaceEnv();

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
