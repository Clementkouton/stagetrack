/**
 * Vue 7 — Encadrement des Mémoires (Maître de Mémoire) : stages encadrés
 * par le membre connecté (actifs + terminés), intitulé du mémoire,
 * progression semaine X / Y, assiduité, journaux hebdomadaires et
 * évaluation finale de l'entreprise.
 */
import { redirect } from "next/navigation";
import { getEtablissementContext, getEncadrementData, type EncadrementRow } from "@/lib/etablissement-data";
import { EncadrementClient, type EncadrementPayload } from "@/components/etablissement/encadrement-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementEncadrementPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  // Vue réservée au Maître de Mémoire : les autres rôles suivent les stages
  // depuis la vue « Suivi des Stages ».
  if (!ctx.isSupervisor) redirect("/etablissement/suivi");

  let rows: EncadrementRow[];
  try {
    rows = await getEncadrementData(ctx);
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  const payload: EncadrementPayload = {
    memberName: ctx.memberName,
    memberTitle: ctx.memberTitle,
    universityName: ctx.universityName,
    universityAcronym: ctx.universityAcronym,
    stages: rows,
  };

  return <EncadrementClient payload={payload} />;
}
