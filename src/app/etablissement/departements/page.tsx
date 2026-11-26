/**
 * Vue 2 (Admin Université uniquement) — Départements & Chefs : cartes + tableau,
 * création d'un département avec son Chef de Département (identifiants générés),
 * réinitialisation de mot de passe et remplacement du chef.
 */
import { redirect } from "next/navigation";
import { IconBuildingBank } from "@tabler/icons-react";
import { getEtablissementContext, getDepartmentsData } from "@/lib/etablissement-data";
import { DepartmentsClient, type DepartmentsPayload } from "@/components/etablissement/departements-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementDepartementsPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;
  if (ctx.role !== "ADMIN_SCHOOL") redirect("/etablissement/dashboard");

  let payload: DepartmentsPayload;
  try {
    const departments = await getDepartmentsData(ctx.universityId);
    payload = {
      universityAcronym: ctx.universityAcronym,
      departments,
    };
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  return <DepartmentsClient payload={payload} />;
}
