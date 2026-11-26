/**
 * Module IA « Étudiant » de StageTrack — prompts métier + fallbacks locaux.
 * -------------------------------------------------------------------------
 * Réutilise le client Groq mutualisé (src/lib/groq.ts) :
 *   - tâches complexes  : openai/gpt-oss-120b (fallback llama-3.3-70b-versatile)
 *   - réponses rapides  : openai/gpt-oss-20b  (fallback llama-3.1-8b-instant)
 * Si GROQ_API_KEY est absente ou en erreur, chaque mode possède un contenu
 * de repli déterministe en français (l'UI indique le « mode dégradé local »).
 */

export const STUDENT_SYSTEM_BASE = [
  "Tu es le Coach Carrière IA de StageTrack, la plateforme 100 % gratuite de gestion des stages au Bénin.",
  "Tu conseilles des étudiants béninois (UAC / IFRI / ENEAM / EPAC / Université de Lokossa…) dans leur recherche de stage :",
  "CV, lettres de motivation, préparation d'entretiens, relances et choix de spécialisation.",
  "Tu connais le contexte local (conventions tripartites, gratifications, entreprises comme KKiaPay, Orabank Bénin, UBA Bénin, Swinmo, Axazara).",
  "Réponds toujours en français, avec un ton encourageant, concret et professionnel. Markdown léger autorisé (titres courts, listes, gras).",
].join(" ");

/* ----------------------------- Prompts ------------------------------ */

export interface CvPayload {
  offerTitle: string;
  company: string;
  offerSkills: string;
  studentSkills: string[];
  fieldOfStudy: string;
  level: string;
  schoolName: string;
}

export function cvPrompt(p: CvPayload): string {
  return [
    `Analyse l'adéquation entre le profil d'un étudiant et l'offre « ${p.offerTitle} » chez ${p.company}.`,
    `Profil : ${p.schoolName} — ${p.fieldOfStudy} (${p.level}). Compétences actuelles : ${p.studentSkills.join(", ")}.`,
    `Compétences demandées par l'offre : ${p.offerSkills}.`,
    "",
    "Réponds EXCLUSIVEMENT au format suivant :",
    "MANQUANT:",
    "<3 à 5 compétences ou acquis manquants, une par ligne, précédés de « - »>",
    "RESUME:",
    "<un résumé de CV optimisé de 4 à 6 phrases, orienté vers cette offre, à la première personne>",
    "RECO:",
    "<3 recommandations concrètes pour maximiser ses chances, une par ligne, précédées de « - »>",
  ].join("\n");
}

export interface LettrePayload {
  company: string;
  position: string;
  city: string;
  studentName: string;
  schoolName: string;
  fieldOfStudy: string;
  level: string;
  skills: string[];
  offerMissions: string;
}

export function lettrePrompt(p: LettrePayload): string {
  return [
    `Rédige une lettre de motivation personnalisée pour le stage « ${p.position} » chez ${p.company} (${p.city}, Bénin).`,
    `Candidat : ${p.studentName}, ${p.level} en ${p.fieldOfStudy} à ${p.schoolName}.`,
    `Compétences à valoriser : ${p.skills.join(", ")}.`,
    `Missions principales du poste : ${p.offerMissions}.`,
    "",
    "Contraintes : maximum 250 mots, format lettre (destinataire, accroche, corps avec 1 exemple concret par compétence clé, conclusion avec disponibilité),",
    "sans espaces réservés du type [Nom] — tout doit être rempli. Réponds EXCLUSIVEMENT avec la lettre, sans commentaire.",
  ].join("\n");
}

export interface EntretienPayload {
  company: string;
  position: string;
  studentSkills: string[];
}

export function entretienSystemPrompt(p: EntretienPayload): string {
  return [
    `${STUDENT_SYSTEM_BASE}`,
    "",
    `RÔLE SPÉCIAL : vous simulez un recruteur professionnel de ${p.company} qui interviewe un candidat pour le poste « ${p.position} »`,
    `(compétences du candidat : ${p.studentSkills.join(", ")}).`,
    "Menez l'entretien question par question : posez UNE question à la fois (alternant technique, RH et mise en situation),",
    "réagissez brièvement à chaque réponse (1 à 2 phrases de feedback) puis posez la question suivante.",
    "Après 5 échanges du candidat, ou si le candidat écrit « terminer », produisez l'évaluation finale :",
    "note globale /10, 2 points forts, 2 axes d'amélioration, et un verdict d'embauche pour un stage.",
  ].join("\n");
}

export interface RelancePayload {
  company: string;
  position: string;
  statusLabel: string;
  daysSince: number;
  studentName: string;
}

export function relancePrompt(p: RelancePayload): string {
  return [
    `Rédige un email de relance professionnel et poli pour une candidature de stage.`,
    `Poste : « ${p.position} » chez ${p.company}. Statut actuel : ${p.statusLabel}. Envoyée depuis ${p.daysSince} jours.`,
    `Signataire : ${p.studentName}.`,
    "",
    "Contraintes : objet + corps, maximum 120 mots, ton respectueux et non pressant,",
    "terminer par une proposition de disponibilité pour un entretien. Réponds EXCLUSIVEMENT avec l'email (Objet: … puis le corps), sans commentaire.",
  ].join("\n");
}

export interface JournalPayload {
  week: number;
  totalWeeks: number;
  position: string;
  rawNotes: string;
}

export function journalPrompt(p: JournalPayload): string {
  return [
    `Structure le bilan hebdomadaire d'un stagiaire (${p.position}), semaine ${p.week}/${p.totalWeeks}.`,
    `Notes brutes de l'étudiant : ${p.rawNotes}`,
    "",
    "Réponds EXCLUSIVEMENT au format suivant, en Markdown léger :",
    "## Réalisations",
    "<2 à 3 puces concrètes>",
    "## Compétences travaillées",
    "<1 à 2 puces>",
    "## Obstacles & solutions",
    "<1 à 2 puces>",
    "## Objectifs semaine prochaine",
    "<2 puces>",
  ].join("\n");
}

/* --------------------------- Fallbacks locaux --------------------------- */

export interface CvFallback {
  missing: string[];
  resume: string;
  reco: string[];
}

export function cvFallback(p: CvPayload): CvFallback {
  const offerSkills = p.offerSkills.split("\n").map((s) => s.trim()).filter(Boolean);
  const missing = offerSkills.filter((s) => !p.studentSkills.some((k) => k.toLowerCase() === s.toLowerCase())).slice(0, 4);
  return {
    missing: missing.length > 0 ? missing : ["Aucune compétence majeure manquante — affinez vos exemples concrets"],
    resume: [
      `Étudiant(e) en ${p.fieldOfStudy} (${p.level}) à ${p.schoolName}, je recherche un stage de ${p.offerTitle.toLowerCase()} chez ${p.company} pour mettre mes compétences au service d'un produit à fort impact.`,
      `Je maîtrise déjà : ${p.studentSkills.join(", ")}. ${missing.length > 0 ? `Je consolide actuellement : ${missing.join(", ")}.` : ""}`,
      "Méthodique et autonome, j'aime livrer des fonctionnalités testées, documentées et validées avec l'équipe.",
    ].join(" "),
    reco: [
      `Ajoutez un projet concret lié à ${p.offerTitle.split("(")[0].trim()} dans la section « Projets » de votre CV`,
      "Quantifiez vos résultats (temps gagné, utilisateurs, tests couverts)",
      "Relisez le CV avec les mots-clés exacts de l'offre pour passer les filtres ATS",
    ],
  };
}

export function lettreFallback(p: LettrePayload): string {
  return [
    `${p.schoolName}`,
    "À l'attention du Responsable des Ressources Humaines",
    `${p.company} — ${p.city}, Bénin`,
    "",
    "Objet : Candidature pour un stage — " + p.position,
    "",
    `Madame, Monsieur,`,
    ``,
    `Actuellement ${p.level} en ${p.fieldOfStudy} à ${p.schoolName}, je souhaite rejoindre ${p.company} en tant que ${p.position.toLowerCase()}. Votre entreprise est une référence du secteur et l'opportunité de contribuer à des missions telles que « ${p.offerMissions.split("\n")[0].toLowerCase()} » correspond exactement au projet professionnel que je poursuis.`,
    ``,
    `Au cours de ma formation, j'ai développé des compétences en ${p.skills.slice(0, 3).join(", ")}. Rigoureux(se) et curieux(se), j'ai à cœur de livrer un travail soigné, validé avec l'équipe, et d'apprendre auprès de vos développeurs et tuteurs expérimentés.`,
    ``,
    `Je serais heureux(se) de vous présenter ma motivation lors d'un entretien, à votre convenance.`,
    ``,
    `Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations respectueuses.`,
    ``,
    `${p.studentName}`,
  ].join("\n");
}

export function relanceFallback(p: RelancePayload): string {
  return [
    `Objet : Suivi de ma candidature — ${p.position}`,
    "",
    "Madame, Monsieur,",
    "",
    `J'ai eu le plaisir de vous adresser ma candidature pour le poste de « ${p.position} » il y a ${p.daysSince} jours (statut actuel : ${p.statusLabel}). Je me permets de revenir vers vous pour réaffirmer tout mon intérêt pour ce stage au sein de ${p.company}.`,
    "",
    "Je reste entièrement disponible pour un entretien à votre convenance, afin de vous présenter plus en détail mes motivations et mes réalisations.",
    "",
    "Dans l'attente de votre retour, je vous remercie pour l'attention portée à mon dossier.",
    "",
    `Cordialement,`,
    `${p.studentName}`,
  ].join("\n");
}

export function journalFallback(p: JournalPayload): string {
  return [
    "## Réalisations",
    `- Avancement des tâches planifiées de la semaine ${p.week} (${p.position})`,
    "- Livrable principal documenté et partagé avec le tuteur",
    "## Compétences travaillées",
    "- Rigueur technique et communication d'équipe",
    "## Obstacles & solutions",
    "- Difficulté technique identifiée puis résolue avec l'appui du tuteur",
    "## Objectifs semaine prochaine",
    "- Finaliser les tâches en cours et préparer la démo",
    "- Mettre à jour le journal et valider la feuille de présence",
  ].join("\n");
}

export const COACH_FALLBACK_NOTICE = [
  "**Mode dégradé actif** — la clé `GROQ_API_KEY` n'est pas configurée sur le serveur.",
  "",
  "Je reste disponible pour : l'optimisation de CV, les lettres de motivation, la simulation d'entretien et les emails de relance via les boutons « IA » du dashboard (contenus types, non personnalisés).",
  "",
  "Pour activer le Coach complet : ajoutez `GROQ_API_KEY` dans le fichier `.env` — les modèles *openai/gpt-oss-120b* et *openai/gpt-oss-20b* seront utilisés automatiquement.",
].join("\n");

export const ENTRETIEN_STARTER_FALLBACK = [
  "Bonjour et bienvenue ! Je suis votre recruteur pour ce entretien simulé.",
  "",
  "**Question 1 (présentation)** : Présentez-vous en 3 phrases : qui êtes-vous, votre formation, et pourquoi ce poste vous intéresse.",
].join("\n");

export function entretienFeedbackFallback(answer: string, index: number): string {
  const questions = [
    "**Question suivante (technique)** : Décrivez un projet concret où vous avez utilisé vos principales compétences. Quel était votre rôle exact et le résultat obtenu ?",
    "**Question suivante (RH)** : Parlez-moi d'un désaccord en équipe et de la façon dont vous l'avez géré.",
    "**Question suivante (mise en situation)** : Vous rencontrez un bug bloquant 48 h avant une livraison. Quelles sont vos trois premières actions ?",
    "**Dernière question (motivation)** : Pourquoi devrions-nous choisir votre candidature pour ce stage ?",
  ];
  const short = answer.trim().split(/\s+/).length;
  const feedback =
    short < 12
      ? "Réponse un peu courte : dans un vrai entretien, développez avec un exemple concret (situation, action, résultat)."
      : "Bonne réponse : exemples concrets et structure claire — gardez ce niveau de détail.";
  const next = questions[Math.min(index, questions.length - 1)];
  return `${feedback}\n\n${next}`;
}

export function entretienFinalFallback(): string {
  return [
    "**Évaluation finale de l'entretien simulé**",
    "",
    "- Note globale : **7/10**",
    "- Points forts : réponses structurées, motivation claire",
    "- Axes d'amélioration : quantifier vos résultats, anticiper les questions techniques précises",
    "- Verdict : profil de stage recommandé — continuez à préparer des exemples chiffrés par compétence.",
  ].join("\n");
}
