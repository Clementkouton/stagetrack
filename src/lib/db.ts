import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Client Prisma unique de StageTrack (PostgreSQL / Neon).
 * -------------------------------------------------------
 * Robustesse : certains environnements d'exécution (preview cloud, CI)
 * injectent une `DATABASE_URL` héritée incompatible avec le provider
 * PostgreSQL du schéma (ex. `file:`), ou omettent `DIRECT_URL` (requis
 * par la datasource). Dans ce cas, on recharge les valeurs du fichier
 * `.env` du projet sans jamais écraser une configuration PostgreSQL valide.
 */
function syncEnvFromProjectDotEnv(): void {
  const current = process.env.DATABASE_URL ?? "";
  if (current.startsWith("postgresql://") || current.startsWith("postgres://")) return;
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!value) continue;
    if (key === "DATABASE_URL" && !process.env.DATABASE_URL?.startsWith("postgres")) {
      process.env.DATABASE_URL = value;
    }
    if (key === "DIRECT_URL" && !process.env.DIRECT_URL) {
      process.env.DIRECT_URL = value;
    }
    if (key === "GROQ_API_KEY" && !process.env.GROQ_API_KEY) {
      process.env.GROQ_API_KEY = value;
    }
  }
}

syncEnvFromProjectDotEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
