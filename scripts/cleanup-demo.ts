import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

for (const p of [join(process.cwd(), ".env")]) {
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/);
      if (m) process.env[m[1]] = m[2];
    }
    break;
  }
}

const db = new PrismaClient();

async function main() {
  // Supprime le compte tuteur de test (Tokia Adjallé)
  const tokia = await db.user.findUnique({ where: { email: "nouveau.tuteur@kkiapay.me" } });
  if (tokia) {
    await db.teamMember.deleteMany({ where: { userId: tokia.id } });
    await db.user.delete({ where: { id: tokia.id } });
    console.log("Compte de test Tokia supprimé");
  }
  // Adèle : repasse en onboarding en attente (démo du badge côté Chef)
  const adele = await db.user.findUnique({ where: { email: "adele.kponton@insti-lokossa.bj" } });
  if (adele) {
    await db.user.update({ where: { id: adele.id }, data: { profileCompleted: false, avatarUrl: null } });
    console.log("Adèle : onboarding en attente (démo)");
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
