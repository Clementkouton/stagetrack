import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Chargement manuel du .env (tsx ne le charge pas automatiquement).
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

async function main() {
  const u = await db.user.findUnique({
    where: { email: "serge.dossou@kkiapay.me" },
    include: { teamMember: { include: { company: true } } },
  });
  console.log("Serge:", u?.role, "completed:", u?.profileCompleted, "company:", u?.teamMember?.company?.name);
  if (u?.teamMember) {
    const interns = await db.intern.count({ where: { tutorId: u.teamMember.id } });
    console.log("Serge interns:", interns);
  }

  const sup = await db.universityMember.findFirst({ where: { role: "ACADEMIC_SUPERVISOR" }, include: { user: true } });
  console.log("Supervisor:", sup?.user.email, "completed:", sup?.user.profileCompleted, "|", sup?.title);
  const supInterns = sup ? await db.intern.count({ where: { thesisSupervisorId: sup.id } }) : 0;
  console.log("Supervisor interns:", supInterns);

  const chef = await db.universityMember.findFirst({
    where: { role: "HEAD_OF_DEPARTMENT" },
    include: { user: true, department: true },
  });
  console.log("Chef:", chef?.user.email, chef?.department?.code);

  const admin = await db.universityMember.findFirst({ where: { role: "ADMIN_SCHOOL" }, include: { user: true } });
  console.log("Admin:", admin?.user.email, "completed:", admin?.user.profileCompleted);

  const tasks = await db.internshipTask.groupBy({ by: ["status"], _count: true });
  console.log("Task statuses:", tasks.map((t) => `${t.status}:${t._count}`).join(", "));

  const thesis = await db.intern.groupBy({ by: ["thesisStatus"], _count: true, where: { thesisStatus: { not: "A_VALIDER" } } });
  console.log("Thesis statuses:", thesis.map((t) => `${t.thesisStatus}:${t._count}`).join(", "));

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
