import { redirect } from "next/navigation";

/** /etudiant redirige vers le tableau de bord étudiant. */
export default function EtudiantIndexPage() {
  redirect("/etudiant/dashboard");
}
