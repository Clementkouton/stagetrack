/**
 * Vue Chef de Département — Maîtres de Mémoire :
 * liste des encadreurs académiques du département, charge d'encadrement (X / 6),
 * création de comptes ACADEMIC_SUPERVISOR (mot de passe temporaire copiable).
 */
import { redirect } from "next/navigation";
import { getEtablissementContext, getSupervisorsData, type SupervisorRow } from "@/lib/etablissement-data";
import { EncadreursClient, type EncadreursPayload } from "@/components/etablissement/encadreurs-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementEncadreursPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  // Vue réservée au Chef de Département (double protection du proxy).
  if (!ctx.isChef) redirect("/etablissement/dashboard");

  let rows: SupervisorRow[];
  try {
    rows = await getSupervisorsData(ctx);
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  const payload: EncadreursPayload = {
    departmentName: ctx.departmentName,
    departmentCode: ctx.departmentCode,
    universityAcronym: ctx.universityAcronym,
    supervisors: rows,
  };
  return <EncadreursClient payload={payload} />;
}
