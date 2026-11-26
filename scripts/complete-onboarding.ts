import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

for (const p of [join(process.cwd(), ".env"), join(process.cwd(), "prisma", ".env")]) {
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/);
      if (m) process.env[m[1]] = m[2];
    }
    break;
  }
}

const db = new PrismaClient();

/** Simule la fin de l'onboarding (comme si l'utilisateur avait terminé les 3 étapes). */
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx complete-onboarding.ts <email>");
    process.exit(1);
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, fullName: true, profileCompleted: true } });
  if (!user) {
    console.error("Utilisateur introuvable:", email);
    process.exit(1);
  }
  await db.user.update({ where: { id: user.id }, data: { profileCompleted: true } });
  console.log(`OK — ${user.fullName} (${email}) profileCompleted: ${user.profileCompleted} → true`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
