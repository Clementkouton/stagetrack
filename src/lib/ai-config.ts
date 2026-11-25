/**
 * Configuration IA côté client (sans dépendance au SDK Groq — sûr pour le bundle navigateur).
 */

export interface AiModelOption {
  value: string;
  label: string;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { value: "openai/gpt-oss-120b", label: "GPT-OSS 120B (réflexion avancée)" },
  { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B (temps réel)" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
];

export interface QuickPrompt {
  label: string;
  message: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: "Rédiger une offre de stage",
    message:
      "Rédige une offre de stage pour un poste de « Stagiaire Chargé(e) de Growth & Acquisition » à Cotonou, durée 3 mois, en précisant missions et compétences attendues.",
  },
  {
    label: "Préparer des questions d'entretien",
    message:
      "Prépare 8 questions d'entretien structurées pour sélectionner un stagiaire développeur backend Node.js : 3 questions techniques, 3 questions comportementales, 2 mises en situation.",
  },
  {
    label: "Générer un plan d'onboarding",
    message:
      "Génère un plan d'onboarding sur 4 semaines pour un stagiaire data analyst en télétravail qui débute lundi : objectifs, rendez-vous clés et livrables par semaine.",
  },
  {
    label: "Rédiger une appréciation de fin de stage",
    message:
      "Rédige une appréciation de fin de stage pour un stagiaire frontend très à l'aise techniquement (5/5), ponctuel (4/5), autonome (4/5) et excellent esprit d'équipe (5/5).",
  },
];
