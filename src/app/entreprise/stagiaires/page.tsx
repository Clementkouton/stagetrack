import { db } from "@/lib/db";
import { getEntrepriseInternWhere } from "@/lib/entreprise-data";
import { InternsClient, type InternCard } from "@/components/entreprise/interns-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseStagiairesPage() {
  const internWhere = await getEntrepriseInternWhere();
  const interns = await db.intern.findMany({
    where: internWhere,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      tutor: { select: { name: true } },
      department: { select: { name: true, code: true } },
      universityRef: { select: { name: true, acronym: true } },
      thesisSupervisor: {
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });

  const rows: InternCard[] = interns.map((intern) => {
    const isActif = intern.status === "ACTIF";
    const elapsed = Math.floor((Date.now() - intern.startDate.getTime()) / (7 * 86400000));
    const currentWeek = isActif ? Math.max(1, Math.min(intern.totalWeeks, elapsed + 1)) : intern.totalWeeks;
    return {
      id: intern.id,
      name: intern.name,
      matricule: intern.matricule,
      university: intern.universityRef?.name ?? intern.university,
      department: intern.department ? `${intern.department.name} (${intern.department.code})` : null,
      email: intern.email,
      position: intern.position,
      tutorName: intern.tutor?.name ?? "Non assigné",
      thesisSupervisor: intern.thesisSupervisor
        ? {
            fullName: intern.thesisSupervisor.user.fullName,
            email: intern.thesisSupervisor.user.email,
            title: intern.thesisSupervisor.title,
          }
        : null,
      thesisTitle: intern.thesisTitle,
      thesisStatus: intern.thesisStatus,
      startDate: intern.startDate.toISOString(),
      endDate: intern.endDate.toISOString(),
      totalWeeks: intern.totalWeeks,
      currentWeek,
      status: intern.status,
      vivierTag: intern.vivierTag,
      onboarding: intern.onboarding.split("\n").filter(Boolean).map((line) => {
        const [, label, state] = line.split("|");
        return { label: label ?? "", done: state === "[x]" };
      }),
    };
  });

  return <InternsClient interns={rows} />;
}
