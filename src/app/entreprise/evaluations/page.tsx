import { db } from "@/lib/db";
import { getEntrepriseInternWhere } from "@/lib/entreprise-data";
import { EvaluationsClient, type EvaluableIntern } from "@/components/entreprise/evaluations-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseEvaluationsPage() {
  const internWhere = await getEntrepriseInternWhere();
  const interns = await db.intern.findMany({
    where: internWhere,
    orderBy: [{ status: "desc" }, { endDate: "desc" }],
    include: { evaluation: true },
  });

  const rows: EvaluableIntern[] = interns.map((intern) => ({
    id: intern.id,
    name: intern.name,
    matricule: intern.matricule,
    university: intern.university,
    position: intern.position,
    status: intern.status,
    endDate: intern.endDate.toISOString(),
    technique: intern.evaluation?.technique ?? 0,
    ponctualite: intern.evaluation?.ponctualite ?? 0,
    autonomie: intern.evaluation?.autonomie ?? 0,
    espritEquipe: intern.evaluation?.espritEquipe ?? 0,
    appreciation: intern.evaluation?.appreciation ?? "",
    recommandation: (intern.evaluation?.recommandation ?? "NEUTRE") as EvaluableIntern["recommandation"],
    finalized: intern.evaluation?.finalized ?? false,
  }));

  return <EvaluationsClient interns={rows} />;
}
