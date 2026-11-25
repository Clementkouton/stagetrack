/**
 * Client IA Groq pour le Dashboard Entreprise StageTrack.
 * -------------------------------------------------------
 * - Modèles de production Groq uniquement (openai/gpt-oss-120b, openai/gpt-oss-20b)
 *   avec fallback officiel Groq (llama-3.3-70b-versatile / llama-3.1-8b-instant).
 * - Fallback « secure mode » : si GROQ_API_KEY est absente ou en erreur,
 *   chaque tâche retourne un contenu de repli déterministe en français
 *   (l'application ne casse jamais, l'UI l'indique clairement).
 */
import Groq from "groq-sdk";

export const GROQ_MODELS = {
  complex: { primary: "openai/gpt-oss-120b", fallback: "llama-3.3-70b-versatile" },
  fast: { primary: "openai/gpt-oss-20b", fallback: "llama-3.1-8b-instant" },
} as const;

export type GroqTask = "complex" | "fast";

export const hasGroqKey = (): boolean => Boolean(process.env.GROQ_API_KEY);

const SYSTEM_BASE = [
  "Tu es l'Assistant IA RH & Tuteur de StageTrack, la plateforme 100 % gratuite de gestion des stages au Bénin.",
  "Tu travailles pour l'entreprise KKiaPay (fintech, Cotonou). Tu connais le contexte des stages académiques",
  "(conventions tripartites étudiant–entreprise–université, gratification, tuteurs, UAC / IFRI / ENEAM / EPAC).",
  "Réponds toujours en français, de façon professionnelle, structurée et actionnable. Utilise du Markdown léger",
  "(titres courts, listes, gras). Ne réponds jamais hors du sujet RH / stages.",
].join(" ");

async function chatWithModel(
  model: string,
  messages: Groq.Chat.ChatCompletionMessageParam[],
): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.6,
    max_tokens: 1600,
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse Groq vide");
  return content;
}

/** Appel Groq avec bascule automatique vers le modèle de repli en cas d'erreur. */
export async function groqChat(
  task: GroqTask,
  messages: Groq.Chat.ChatCompletionMessageParam[],
): Promise<{ content: string; model: string }> {
  const models = GROQ_MODELS[task];
  const order = [models.primary, models.fallback];
  let lastError: unknown = null;
  for (const model of order) {
    try {
      const content = await chatWithModel(model, messages);
      return { content, model };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Erreur Groq inconnue");
}

export const buildSystemMessage = (extra?: string): string =>
  extra ? `${SYSTEM_BASE} Contexte additionnel : ${extra}` : SYSTEM_BASE;

/* ------------------------------------------------------------------ */
/* Prompts métier (une fonction par mode de génération)                 */
/* ------------------------------------------------------------------ */

export function offerPrompt(payload: { title: string; sector?: string; city?: string; duration?: string }) {
  return [
    `Rédige une fiche d'offre de stage complète pour le poste : « ${payload.title} ».`,
    payload.sector ? `Secteur : ${payload.sector}.` : "",
    payload.city ? `Ville : ${payload.city} (Bénin).` : "",
    payload.duration ? `Durée : ${payload.duration}.` : "",
    "",
    "Réponds EXCLUSIVEMENT au format suivant, sans commentaire d'introduction :",
    "DESCRIPTION:",
    "<2 à 3 phrases d'accroche motivante et réaliste>",
    "MISSIONS:",
    "<4 à 5 missions concrètes, une par ligne, chacune précédée de « - »>",
    "COMPETENCES:",
    "<5 à 7 compétences / outils requis, une par ligne, chacune précédée de « - »>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function missionsPrompt(payload: {
  internName: string;
  position: string;
  currentWeek: number;
  totalWeeks: number;
}) {
  return [
    `Tu es tuteur de stage. Génère 4 tâches hebdomadaires concrètes pour ${payload.internName}`,
    `(poste : ${payload.position}), actuellement en semaine ${payload.currentWeek} sur ${payload.totalWeeks} du stage.`,
    "Les tâches doivent être adaptées au poste, progressives et vérifiables.",
    "",
    "Réponds EXCLUSIVEMENT au format suivant :",
    "TITRE:",
    "<titre court de la tâche>",
    "TACHE:",
    "<1 phrase de description>",
    "(répète le bloc 4 fois, sans autre commentaire)",
  ].join("\n");
}

export function candidatePrompt(payload: {
  studentName: string;
  position: string;
  university: string;
  matricule: string;
  cvSummary: string;
  coverLetter?: string | null;
}) {
  return [
    `Analyse la candidature de ${payload.studentName} (${payload.university}, matricule ${payload.matricule})`,
    `pour le poste de stage : « ${payload.position} ».`,
    `Résumé du CV : ${payload.cvSummary}`,
    payload.coverLetter ? `Lettre de motivation : ${payload.coverLetter}` : "",
    "",
    "Réponds EXCLUSIVEMENT au format suivant :",
    "SCORE:",
    "<score de compatibilité de 0 à 100, entier seul>",
    "POINTS_FORTS:",
    "<3 à 4 points forts, une par ligne, précédés de « - »>",
    "QUESTIONS:",
    "<3 questions d'entretien ciblées, une par ligne, précédées de « - »>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function appreciationPrompt(payload: {
  internName: string;
  position: string;
  university: string;
  technique: number;
  ponctualite: number;
  autonomie: number;
  espritEquipe: number;
}) {
  return [
    `Rédige l'appréciation officielle de fin de stage du tuteur pour ${payload.internName}`,
    `(${payload.university}, poste : ${payload.position}). Notes sur 5 :`,
    `Compétences techniques : ${payload.technique}/5, Ponctualité : ${payload.ponctualite}/5,`,
    `Autonomie : ${payload.autonomie}/5, Esprit d'équipe : ${payload.espritEquipe}/5.`,
    "",
    "Rédige 4 à 6 phrases en français professionnel (ton positif mais sincère, adapté au niveau des notes),",
    "sans titre ni formatage Markdown : uniquement le paragraphe d'appréciation.",
  ].join("\n");
}

