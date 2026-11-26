/**
 * Vue 5 — Suivi des Stages : stages actifs du périmètre, progression
 * (semaine X / Y), taux de présence, journaux hebdomadaires en modale,
 * tâches validées et avis du tuteur entreprise.
 */
import { getEtablissementContext, getSuiviData, type SuiviRow } from "@/lib/etablissement-data";
import { SuiviClient, type SuiviPayload } from "@/components/etablissement/suivi-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementSuiviPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  let rows: SuiviRow[];
  try {
    rows = await getSuiviData(ctx);
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  const payload: SuiviPayload = {
    isChef: ctx.isChef,
    departmentCode: ctx.departmentCode,
    universityAcronym: ctx.universityAcronym,
    stages: rows,
  };

  return <SuiviClient payload={payload} />;
}
