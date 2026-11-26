import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "../src/lib/password";

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

/** Crée (ou réinitialise) un compte tuteur de test avec onboarding à compléter. */
async function main() {
  const email = "nouveau.tuteur@kkiapay.me";
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword("Temp@1234"),
        fullName: "Tokia Adjallé",
        role: "COMPANY",
        profileCompleted: false,
      },
    });
    const company = await db.company.findUnique({ where: { name: "KKiaPay" } });
    if (company) {
      await db.teamMember.create({
        data: {
          companyId: company.id,
          userId: user.id,
          name: "Tokia Adjallé",
          email,
          role: "TUTEUR",
          phone: "+229 90 00 00 00",
        },
      });
    }
    console.log("Compte tuteur de test créé");
  } else {
    await db.user.update({ where: { id: user.id }, data: { profileCompleted: false } });
    console.log("Compte tuteur de test réinitialisé (profileCompleted=false)");
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
