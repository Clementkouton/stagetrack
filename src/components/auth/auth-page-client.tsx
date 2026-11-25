"use client";

/**
 * Client wrapper pour la page /auth :
 * lit les paramètres d'URL (?role=…&mode=…) pour pré-sélectionner
 * le profil et l'onglet (ex. depuis les CTA de la landing page).
 * Doit être rendu dans un <Suspense> (exigence useSearchParams de Next.js).
 */

import { useSearchParams } from "next/navigation";
import { AuthFlow } from "./AuthFlow";

export function AuthFlowFromQuery() {
  const params = useSearchParams();
  return (
    <AuthFlow
      variant="page"
      initialRole={params.get("role")}
      initialMode={params.get("mode")}
    />
  );
}
