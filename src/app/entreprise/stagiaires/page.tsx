import { db } from "@/lib/db";
import { InternsClient, type InternCard } from "@/components/entreprise/interns-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseStagiairesPage() {
  const interns = await db.intern.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { tutor: { select: { name: true } } },
  });

  const rows: InternCard[] = interns.map((intern) => {
    const isActif = intern.status === "ACTIF";
    const elapsed = Math.floor((Date.now() - intern.startDate.getTime()) / (7 * 86400000));
    const currentWeek = isActif ? Math.max(1, Math.min(intern.totalWeeks, elapsed + 1)) : intern.totalWeeks;
    return {
      id: intern.id,
      name: intern.name,
      matricule: intern.matricule,
      university: intern.university,
      email: intern.email,
      position: intern.position,
      tutorName: intern.tutor?.name ?? "Non assigné",
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
