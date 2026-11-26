/**
 * Helpers « purs » (client-safe) du Dashboard Étudiant — aucun import serveur.
 * Utilisables à la fois dans les Server Components et les Client Components.
 */

/** Score de compatibilité déterministe (0-100) profil étudiant ↔ offre. */
export function compatScore(
  studentSkills: string[],
  studentField: string,
  offer: { skills: string; sector: string; city: string; workMode: string },
): number {
  const offerSkills = offer.skills.split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const mine = studentSkills.map((s) => s.trim().toLowerCase());
  if (offerSkills.length === 0) return 60;
  const overlap = offerSkills.filter((s) =>
    mine.some((m) => m === s || s.includes(m) || m.includes(s)),
  ).length;
  const skillRatio = overlap / offerSkills.length;
  let score = 42 + skillRatio * 44;
  const fieldKeywords = studentField.toLowerCase().split(/[\s/&]+/).filter((w) => w.length > 3);
  if (fieldKeywords.some((w) => offer.sector.toLowerCase().includes(w))) score += 8;
  if (offer.workMode === "TELETRAVAIL" || offer.workMode === "HYBRIDE") score += 4;
  return Math.round(Math.min(Math.max(score, 35), 97));
}

/** Score label + classe couleur. */
export function scoreTone(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "Excellente adéquation", className: "bg-brand-50 text-brand border-brand/25" };
  if (score >= 60) return { label: "Bonne adéquation", className: "bg-gold-50 text-gold-dark border-gold/30" };
  return { label: "Adéquation partielle", className: "bg-slate-100 text-slate-600 border-slate-300" };
}
