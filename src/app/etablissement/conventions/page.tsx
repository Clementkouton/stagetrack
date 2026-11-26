/**
 * Vue 4 — Conventions & Visas : circuit à 4 étapes (Étudiant → Entreprise →
 * Visa Chef de Département → Signature Direction), analyse IA d'adéquation
 * pédagogique (Groq), visa (Chef) et signature officielle (Admin).
 */
import { getEtablissementContext, getConventionsData, type ConventionRow } from "@/lib/etablissement-data";
import { ConventionsClient, type ConventionsPayload } from "@/components/etablissement/conventions-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementConventionsPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  let conventions: ConventionRow[];
  try {
    conventions = await getConventionsData(ctx);
  } catch (error) {
    return <EtabDbError message={error instanceof Error ? error.message : "Erreur de base de données"} />;
  }

  const payload: ConventionsPayload = {
    role: ctx.role,
    departmentCode: ctx.departmentCode,
    universityAcronym: ctx.universityAcronym,
    conventions,
  };

  return <ConventionsClient payload={payload} />;
}
