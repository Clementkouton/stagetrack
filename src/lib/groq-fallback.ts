/**
 * Fallback « secure mode » du module IA : contenus déterministes en français
 * générés localement lorsque GROQ_API_KEY est absente ou que l'API Groq échoue.
 * L'UI affiche un avertissement clair (`fallback: true`).
 */

const fallbackDescription = (title: string) =>
  `Nous recherchons un(e) stagiaire motivé(e) pour rejoindre notre équipe autour du poste « ${title} ». Vous participerez à des projets concrets, encadré(e) par un tuteur expérimenté, et découvrirez nos méthodes de travail en conditions réelles. Ce stage est une excellente opportunité de développer vos compétences techniques et professionnelles au sein d'une équipe bienveillante.`;

const fallbackMissions = (title: string) =>
  [
    `- Contribuer aux projets liés à « ${title} » sous la supervision du tuteur`,
    "- Participer aux réunions d'équipe hebdomadaires et aux points d'avancement",
    "- Réaliser des livrables validés en fin de semaine par le tuteur",
    "- Documenter son travail et partager les bonnes pratiques avec l'équipe",
    "- Rédiger un journal de bord hebdomadaire de ses activités",
  ].join("\n");

const fallbackSkills = () =>
  ["- Rigueur et organisation", "- Curiosité et capacité d'apprentissage", "- Bon niveau de français professionnel", "- Esprit d'équipe et communication", "- Bases techniques du domaine concerné"].join("\n");

export interface OfferFallback {
  description: string;
  missions: string;
  skills: string;
}

export function offerFallback(title: string): OfferFallback {
  return {
    description: fallbackDescription(title),
    missions: fallbackMissions(title),
    skills: fallbackSkills(),
  };
}

export interface MissionFallback {
  title: string;
  description: string;
}

export function missionsFallback(internName: string, position: string, currentWeek: number): MissionFallback[] {
  return [
    { title: `Approfondir le sujet du module en cours (semaine ${currentWeek})`, description: `${internName} étudie la documentation du domaine et prépare une synthèse à présenter au tuteur.` },
    { title: `Réaliser une tâche technique liée au poste`, description: `Exécuter une sous-partie du projet « ${position} », validée en fin de semaine par le tuteur.` },
    { title: `Participer à une réunion d'équipe et en rédiger les points clés`, description: `Assister au point hebdomadaire, noter les décisions et partager un compte rendu court.` },
    { title: `Mettre à jour le journal de bord et les livrables`, description: `Documenter les travaux de la semaine, lister les obstacles rencontrés et les solutions apportées.` },
  ];
}

export interface CandidateFallback {
  score: number;
  summary: string;
  questions: string;
}

export function candidateFallback(studentName: string, position: string, university: string): CandidateFallback {
  return {
    score: 72,
    summary: [
      `- Profil ${university} cohérent avec le poste « ${position} »`,
      "- Expérience académique pertinente et motivation exprimée dans la candidature",
      "- Capacité d'apprentissage et adaptabilité à confirmer en entretien",
      "- Recommandation : avancer vers un entretien de présélection",
    ].join("\n"),
    questions: [
      "- Présentez-nous un projet académique dont vous êtes fier(ère) et votre contribution exacte.",
      `- Quels outils ou technologies utilisés à ${university} vous semblent transférables à ce poste de stage ?`,
      "- Décrivez une difficulté technique rencontrée récemment et comment vous l'avez résolue.",
    ].join("\n"),
  };
}

export function appreciationFallback(internName: string, technique: number, ponctualite: number, autonomie: number, espritEquipe: number): string {
  const label = (n: number) => (n >= 5 ? "excellent(e)" : n >= 4 ? "très bon(ne)" : n >= 3 ? "satisfaisant(e)" : "à renforcer");
  const overall = Math.round((technique + ponctualite + autonomie + espritEquipe) / 4);
  return `${internName} a effectué son stage avec un niveau ${label(overall)} d'ensemble. Les compétences techniques évaluées à ${technique}/5 se sont traduites par des livrables ${technique >= 4 ? "de qualité, livrés dans les délais" : "conformes, nécessitant parfois une relecture du tuteur"}. Sa ponctualité (${ponctualite}/5) et son autonomie (${autonomie}/5) ont été ${label(Math.round((ponctualite + autonomie) / 2))}, avec une implication réelle dans les rituels d'équipe (esprit d'équipe : ${espritEquipe}/5). Nous reconnaissons une progression nette au fil du stage et lui souhaitons pleine réussite dans la suite de son parcours.`;
}

export const CHAT_FALLBACK_NOTICE = [
  "**Mode dégradé actif** — la clé `GROQ_API_KEY` n'est pas configurée sur le serveur, je réponds donc avec des modèles de repli locaux.",
  "",
  "Pour activer l'Assistant IA complet : ajoutez `GROQ_API_KEY` dans le fichier `.env` (les modèles *openai/gpt-oss-120b* et *openai/gpt-oss-20b* seront alors utilisés automatiquement).",
  "",
  "En attendant, voici ce que je peux faire sans clé : générer des fiches d'offre, des tâches hebdomadaires, des analyses de candidature et des appréciations de fin de stage via les boutons « IA » du dashboard (contenus types, non personnalisés).",
].join("\n");
