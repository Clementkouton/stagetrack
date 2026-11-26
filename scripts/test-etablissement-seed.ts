/**
 * Test du seed Établissement (INSTI Lokossa) en dehors du serveur Next.
 * Usage : bunx tsx scripts/test-etablissement-seed.ts
 */
import { ensureUniversitySeedData } from "../src/lib/etablissement-seed";
import { db } from "../src/lib/db";

async function main() {
  const refs = await ensureUniversitySeedData();
  const [users, members, departments, students, interns, conventions] = await Promise.all([
    db.user.count(),
    db.universityMember.count(),
    db.department.count(),
    db.studentProfile.count({ where: { matricule: { startsWith: "INSTI-" } } }),
    db.intern.findMany({
      where: { matricule: { startsWith: "INSTI-" } },
      select: { matricule: true, position: true, status: true, departmentId: true, companyId: true },
    }),
    db.convention.findMany({
      where: { reference: { contains: "INSTI" } },
      select: { reference: true, pedagogicalApproved: true, signedUniversity: true, status: true, departmentId: true },
    }),
  ]);
  console.log(
    JSON.stringify(
      { refs, users, members, departments, instiStudents: students, instiInterns: interns, instiConventions: conventions },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("SEED_ERROR:", e instanceof Error ? e.message.slice(0, 500) : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
