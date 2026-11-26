import { redirect } from "next/navigation";

/** Racine de l'espace établissement — redirection vers le tableau de bord. */
export default function EtablissementIndexPage() {
  redirect("/etablissement/dashboard");
}
