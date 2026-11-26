import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const unis = await db.universityProfile.findMany({
    select: { id: true, name: true, acronym: true, city: true },
    orderBy: { acronym: "asc" },
  });
  const students = await db.studentProfile.findMany({
    select: {
      id: true,
      matricule: true,
      universityId: true,
      schoolName: true,
      fieldOfStudy: true,
      level: true,
      specialty: true,
    },
    orderBy: { matricule: "asc" },
  });
  const interns = await db.intern.findMany({
    select: { id: true, matricule: true, universityId: true, status: true, companyId: true },
    orderBy: { matricule: "asc" },
  });
  const conventions = await db.convention.findMany({
    select: { id: true, reference: true, internId: true, signedStudent: true, signedCompany: true, signedUniversity: true, status: true },
    orderBy: { reference: "asc" },
  });
  const members = await db.universityMember.count();
  const departments = await db.department.count();
  console.log(
    JSON.stringify(
      { unis, departments, members, students, internCount: interns.length, interns, conventions },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("DB_ERROR:", e instanceof Error ? e.message.slice(0, 300) : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
