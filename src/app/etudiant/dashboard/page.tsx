import type { Metadata } from "next";
import { SpacePlaceholder } from "@/components/auth/SpacePlaceholder";

export const metadata: Metadata = {
  title: "Espace Étudiant — StageTrack",
  robots: { index: false },
};

export default function StudentDashboardPage() {
  return <SpacePlaceholder role="etudiant" />;
}
