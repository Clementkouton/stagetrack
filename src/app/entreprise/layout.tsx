import type { Metadata } from "next";
import { EntrepriseShell } from "@/components/entreprise/shell";

export const metadata: Metadata = {
  title: "Dashboard Entreprise — StageTrack",
  description:
    "Portail entreprise StageTrack : offres de stage, pipeline ATS, stagiaires en poste, présences, conventions, évaluations et Assistant IA RH propulsé par Groq.",
  robots: { index: false },
};

export default function EntrepriseLayout({ children }: { children: React.ReactNode }) {
  return <EntrepriseShell>{children}</EntrepriseShell>;
}
