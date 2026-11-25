import { db } from "@/lib/db";
import { ParametresClient, type CompanyProfile, type TeamRow } from "@/components/entreprise/parametres-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseParametresPage() {
  const [company, team] = await Promise.all([
    db.company.findFirst({ where: { name: "KKiaPay" } }),
    db.teamMember.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] }),
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
