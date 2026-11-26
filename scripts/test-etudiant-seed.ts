import { ensureDemoStudent } from "../src/lib/etudiant-seed";
async function main() {
  const t0 = Date.now();
  const s1 = await ensureDemoStudent();
  console.log("1er appel:", JSON.stringify({ id: s1.id, matricule: s1.matricule, name: s1.fullName, uni: s1.universityName, skills: s1.skills.length }), `${Date.now() - t0}ms`);
  const t1 = Date.now();
  const s2 = await ensureDemoStudent();
  console.log("2e appel (idempotent):", s2.id === s1.id ? "MÊME ID ✓" : "DIFFÉRENT ✗", `${Date.now() - t1}ms`);
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const counts = {
    candidatures: await db.candidature.count({ where: { studentId: s1.id } }),
    interns: await db.intern.findMany({ where: { studentId: s1.id }, select: { position: true, status: true, totalWeeks: true } }),
    tasks: await db.internshipTask.count({ where: { intern: { studentId: s1.id } } }),
    sheets: await db.presenceSheet.count({ where: { intern: { studentId: s1.id } } }),
    journals: await db.weeklyJournal.count({ where: { intern: { studentId: s1.id } } }),
    conventions: await db.convention.count({ where: { intern: { studentId: s1.id } } }),
    evals: await db.evaluation.count({ where: { intern: { studentId: s1.id } } }),
    attestations: await db.attestation.count({ where: { intern: { studentId: s1.id } } }),
    offers: await db.offer.count({ where: { status: "PUBLIEE" } }),
  };
  console.log("DONNÉES:", JSON.stringify(counts, null, 2));
  await db.$disconnect();
}
main().catch((e) => { console.error("SEED_ERROR:", e instanceof Error ? e.message.slice(0, 500) : e); process.exit(1); });
