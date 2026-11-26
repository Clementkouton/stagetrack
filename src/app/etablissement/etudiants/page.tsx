/**
 * Vue 3 — Étudiants rattachés : recherche, filtres (département, spécialité,
 * niveau, statut), tableau détaillé et fiche complète en tiroir (Sheet).
 * Vue Chef de Département : affectation du Maître de Mémoire depuis la fiche.
 */
import { getEtablissementContext, getStudentsData, getSupervisorsData, type EtabStudentRow } from "@/lib/etablissement-data";
import { EtudiantsClient, type EtudiantsPayload } from "@/components/etablissement/etudiants-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementEtudiantsPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  let rows: EtabStudentRow[];
  try {
    rows = await getStudentsData(ctx);
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  // Maîtres de Mémoire disponibles pour l'affectation (Chef uniquement).
  const supervisors = ctx.isChef
    ? await getSupervisorsData(ctx).catch(() => [])
    : [];

  const payload: EtudiantsPayload = {
    isChef: ctx.isChef,
    universityAcronym: ctx.universityAcronym,
    departmentFilter: ctx.isChef ? ctx.departmentCode : null,
    students: rows,
    supervisors: supervisors.map((s) => ({
      memberId: s.memberId,
      fullName: s.fullName,
      grade: s.grade,
      workload: s.workload,
      maxWorkload: s.maxWorkload,
    })),
  };

  return <EtudiantsClient payload={payload} />;
}
