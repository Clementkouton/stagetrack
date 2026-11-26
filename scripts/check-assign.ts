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
  const leonce = await db.universityMember.findFirst({
    where: { user: { fullName: { contains: "Hounsou" } }, role: "ACADEMIC_SUPERVISOR" },
    select: { id: true },
  });
  const rodrigue = await db.intern.findFirst({ where: { matricule: "INSTI-2026-001" }, select: { id: true } });
  if (leonce && rodrigue) {
    await db.intern.update({
      where: { id: rodrigue.id },
      data: { thesisSupervisorId: leonce.id },
    });
    console.log("Rodrigue réassigné à Prof. Léonce Hounsou (état démo initial)");
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
