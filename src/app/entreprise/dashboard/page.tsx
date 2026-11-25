import type { Metadata } from "next";
import { SpacePlaceholder } from "@/components/auth/SpacePlaceholder";

export const metadata: Metadata = {
  title: "Portail Entreprise — StageTrack",
  robots: { index: false },
};

export default function CompanyDashboardPage() {
  return <SpacePlaceholder role="entreprise" />;
}
