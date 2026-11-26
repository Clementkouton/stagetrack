import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { EntrepriseShell } from "@/components/entreprise/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Entreprise — StageTrack",
  description:
    "Portail entreprise StageTrack : offres de stage, pipeline ATS, stagiaires en poste, présences, conventions, évaluations et Assistant IA RH propulsé par Groq.",
  robots: { index: false },
};

export default async function EntrepriseLayout({ children }: { children: React.ReactNode }) {
  // Le proxy protège déjà les routes ; ce garde-fou couvre les rechargements directs.
  const user = await getSessionUser();
  if (!user || user.role !== "COMPANY" || !user.teamMember) {
    redirect("/auth");
  }

  const isAdmin = user.teamMember.role === "ADMIN_RH";
  return (
    <EntrepriseShell
      isAdmin={isAdmin}
      memberName={user.fullName}
      memberPosition={user.teamMember.role === "ADMIN_RH" ? "Administrateur RH" : "Tuteur / Maître de Stage"}
      companyName={user.teamMember.company.name}
    >
      {children}
    </EntrepriseShell>
  );
}
