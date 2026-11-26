/**
 * Paramètres :
 *  - Admin RH : vitrine entreprise + gestion de l'équipe (RH & tuteurs) ;
 *  - Tuteur / Maître de Stage : « Mon Profil » uniquement (identité, fonction,
 *    avatar, mot de passe) + onboarding en 3 étapes à la première connexion.
 */
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getEntrepriseCompanyId } from "@/lib/entreprise-data";
import { ParametresClient, type CompanyProfile, type TeamRow } from "@/components/entreprise/parametres-client";
import { TuteurProfilClient, type TuteurProfilePayload } from "@/components/entreprise/tuteur-profil-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const { onboarding } = await searchParams;
  const isOnboarding = onboarding === "1";

  const sessionUser = await getSessionUser();
  const isAdmin = sessionUser?.teamMember ? sessionUser.teamMember.role === "ADMIN_RH" : false;

  /* ------------------------ Tuteur / Maître de Stage ------------------------ */
  if (!isAdmin && sessionUser?.teamMember) {
    const [member, company] = await Promise.all([
      db.teamMember.findUnique({ where: { id: sessionUser.teamMember.id } }),
      db.company.findUnique({ where: { id: sessionUser.teamMember.companyId }, select: { name: true } }),
    ]);

    const payload: TuteurProfilePayload = {
      fullName: sessionUser.fullName,
      email: sessionUser.email,
      position: member?.position ?? null,
      phone: member?.phone ?? null,
      avatarUrl: sessionUser.avatarUrl,
      companyName: company?.name ?? "Votre entreprise",
      isAdmin: false,
      isOnboarding,
    };
    return <TuteurProfilClient payload={payload} />;
  }

  /* ------------------------------- Admin RH ------------------------------- */
  const companyId = await getEntrepriseCompanyId();
  const [company, team] = await Promise.all([
    db.company.findUnique({ where: { id: companyId } }),
    db.teamMember.findMany({ where: { companyId }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
  ]);

  const profile: CompanyProfile = {
    name: company?.name ?? "KKiaPay",
    sector: company?.sector ?? "Fintech / Paiements mobiles",
    city: company?.city ?? "Cotonou",
    description: company?.description ?? "",
    website: company?.website ?? "",
  };

  const teamRows: TeamRow[] = team.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    phone: m.phone,
    active: m.active,
  }));

  return <ParametresClient profile={profile} team={teamRows} />;
}
