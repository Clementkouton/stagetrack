/**
 * Données & périmètre du Dashboard Entreprise StageTrack.
 * -------------------------------------------------------
 * Toutes les lectures de l'espace entreprise sont filtrées par la société du
 * membre connecté (session réelle JWT) :
 *  - ADMIN_RH : toute la société ;
 *  - TUTEUR : uniquement les stagiaires dont il est le tuteur
 *    (intern.tutorId = TeamMember.id du membre connecté).
 * Fallback : société de démonstration KKiaPay (scripts / aperçus hors session).
 */
import { db } from "@/lib/db";
import { getCompanyScope } from "@/lib/session";

export interface EntrepriseCompanyRef {
  id: string;
  name: string;
  sector: string;
  city: string;
  description: string;
  website: string | null;
}

/** Société du membre connecté, sinon société de démonstration. */
export async function getEntrepriseCompany(): Promise<EntrepriseCompanyRef | null> {
  const scope = await getCompanyScope();
  if (scope) {
    const company = await db.company.findUnique({ where: { id: scope.companyId } });
    if (company) return company;
  }
  const demo = await db.company.findUnique({ where: { name: "KKiaPay" } });
  return demo;
}

/** Filtre Prisma « stagiaires visibles » pour le membre connecté. */
export async function getEntrepriseInternWhere(): Promise<{ companyId: string; tutorId?: string }> {
  const scope = await getCompanyScope();
  if (!scope) {
    const company = await db.company.findUnique({ where: { name: "KKiaPay" }, select: { id: true } });
    return { companyId: company?.id ?? "" };
  }
  return scope.isAdmin
    ? { companyId: scope.companyId }
    : { companyId: scope.companyId, tutorId: scope.tutorId ?? undefined };
}

/** Filtre Prisma « toute donnée société » (offres, candidatures, conventions, équipe). */
export async function getEntrepriseCompanyId(): Promise<string> {
  const scope = await getCompanyScope();
  if (scope) return scope.companyId;
  const company = await db.company.findUnique({ where: { name: "KKiaPay" }, select: { id: true } });
  return company?.id ?? "";
}
