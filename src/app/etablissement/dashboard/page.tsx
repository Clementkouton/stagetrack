import type { Metadata } from "next";
import { SpacePlaceholder } from "@/components/auth/SpacePlaceholder";

export const metadata: Metadata = {
  title: "Espace Établissement — StageTrack",
  robots: { index: false },
};

export default function UniversityDashboardPage() {
  return <SpacePlaceholder role="universite" />;
}
