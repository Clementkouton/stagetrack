/**
 * Vue 6 — Évaluations & Jury : notes des maîtres de stage (moyenne /5,
 * technique, ponctualité, autonomie, esprit d'équipe), filtres, export du
 * PV Jury en CSV et attestation de fin de stage (modale + téléchargement).
 */
import { getEtablissementContext, getEvaluationsData, type EvaluationRow } from "@/lib/etablissement-data";
import { EvaluationsClient, type EvaluationsPayload } from "@/components/etablissement/evaluations-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementEvaluationsPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  let rows: EvaluationRow[];
  try {
    rows = await getEvaluationsData(ctx);
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  const payload: EvaluationsPayload = {
    isChef: ctx.isChef,
    departmentCode: ctx.departmentCode,
    universityAcronym: ctx.universityAcronym,
    evaluations: rows,
  };

  return <EvaluationsClient payload={payload} />;
}
