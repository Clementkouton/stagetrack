/**
 * Module IA « Établissement » de StageTrack — prompts métier + fallbacks locaux.
 * -------------------------------------------------------------------------------
 * Réutilise le client Groq mutualisé (src/lib/groq.ts) :
 *   - tâches complexes  : openai/gpt-oss-120b (fallback llama-3.3-70b-versatile)
 *     → check_pedagogical_fit (adéquation sujet/spécialité), generate_cohort_report
 *   - réponses rapides  : openai/gpt-oss-20b  (fallback llama-3.1-8b-instant)
 *     → Copilote IA Académique (chat)
 * Si GROQ_API_KEY est absente ou en erreur, chaque mode possède un repli
 * déterministe en français (l'UI indique le « mode dégradé local »).
 */

export const ETABLISSEMENT_SYSTEM_BASE = [
  "Tu es le Copilote IA Académique de StageTrack, la plateforme 100 % gratuite de gestion des stages au Bénin.",
  "Tu assists l'administration universitaire (Direction des Stages) et les Chefs de Département dans le suivi",
  "de leurs étudiants en stage : visa pédagogique des conventions, insertion professionnelle, cohortes.",
  "Tu connais le contexte béninois (UAC / IFRI / ENEAM / EPAC / UNSTIM, INSTI Lokossa, conventions tripartites).",
  "Réponds toujours en français, de façon professionnelle, structurée et actionnable. Markdown léger autorisé",
  "(titres courts, listes, gras). Ne réponds jamais hors du sujet académique / stages.",
].join(" ");

/* --------------------- Adéquation pédagogique (fit) -------------------- */

export interface FitPayload {
  studentName: string;
  departmentName: string;
  specialty: string;
  level: string;
  position: string;
  companyName: string;
  missions: string;
}

export function fitPrompt(p: FitPayload): string {
  return [
    `Analyse la cohérence pédagogique du sujet de stage suivant pour un Chef de Département.`,
    `Étudiant : ${p.studentName} — ${p.departmentName}, spécialité ${p.specialty}, niveau ${p.level}.`,
    `Entreprise d'accueil : ${p.companyName}. Poste : « ${p.position} ».`,
    p.missions ? `Missions prévues dans l'offre/convention : ${p.missions.replace(/\n/g, " ; ")}.` : "",
    "",
    "Réponds EXCLUSIVEMENT au format suivant :",
    "SCORE:",
    "<score de cohérence pédagogique de 0 à 100, entier seul>",
    "AVIS:",
    "<« FAVORABLE » ou « RESERVE » suivi de 1 à 2 phrases de justification>",
    "RECO:",
    "<2 à 4 recommandations concrètes pour le Chef de Département (encadrement, ajustement de missions, livrables), une par ligne, précédées de « - »>",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface FitResult {
  score: number;
  avis: string;
  favorable: boolean;
  reco: string[];
}

/** Repli local déterministe : recoupement mots-clés spécialité ↔ missions/poste. */
export function fitFallback(p: FitPayload): FitResult {
  const haystack = `${p.position} ${p.missions}`.toLowerCase();
  const keywords = p.specialty
    .toLowerCase()
    .split(/[\s&,'-]+/)
    .filter((w) => w.length > 3);
  const domainWords = p.departmentName
    .toLowerCase()
    .split(/[\s&,'-]+/)
    .filter((w) => w.length > 3);
  const hits = [...keywords, ...domainWords].filter((w) => haystack.includes(w));
  const ratio = Math.min(hits.length / Math.max(keywords.length, 1), 1);
  const score = Math.round(55 + ratio * 35);
  const favorable = score >= 65;
  return {
    score,
    favorable,
    avis: favorable
      ? `FAVORABLE — Les missions de « ${p.position} » recoupent les acquis de la spécialité ${p.specialty} (${p.level}). Le sujet est cohérent avec le référentiel du département ${p.departmentName}.`
      : `RESERVE — Le lien entre « ${p.position} » et la spécialité ${p.specialty} reste partiel. Un ajustement des missions ou un encadrement renforcé est recommandé.`,
    reco: favorable
      ? [
          `Valider le sujet en l'état et confier un livrable de fin de stage en lien avec ${p.specialty}.`,
          "Planifier un point pédagogique à mi-parcours avec le tuteur entreprise.",
          "Vérifier la présence d'un encadrant identifié côté entreprise.",
        ]
      : [
          `Demander à l'entreprise d'ajuster au moins une mission vers ${p.specialty}.`,
          "Renforcer la fréquence des échanges avec le tuteur (hebdomadaire).",
          "Prévoir un livrable académique compensatoire (note de synthèse) validé par le département.",
        ],
  };
}

/* --------------------- Rapport de cohorte (cohort) --------------------- */

export interface CohortPayload {
  scopeLabel: string;
  departmentLabel: string | null;
  students: number;
  placed: number;
  searching: number;
  activeInterns: number;
  finishedInterns: number;
  pendingVisas: number;
  pendingSignatures: number;
  averageEvaluation: number | null;
  rows: { label: string; placed: number; searching: number }[];
}

export function cohortPrompt(p: CohortPayload): string {
  const rows = p.rows.map((r) => `- ${r.label} : ${r.placed} placé(s), ${r.searching} en recherche`).join("\n");
  return [
    `Rédige un rapport de synthèse (300 mots maximum) sur l'insertion en stage du périmètre « ${p.scopeLabel} ».`,
    p.departmentLabel ? `Département concerné : ${p.departmentLabel}.` : "",
    `Chiffres clés : ${p.students} étudiants rattachés, ${p.placed} placés en stage, ${p.searching} en recherche,`,
    `${p.activeInterns} stage(s) actif(s), ${p.finishedInterns} stage(s) terminé(s),`,
    `${p.pendingVisas} convention(s) en attente de visa pédagogique, ${p.pendingSignatures} en attente de signature Direction.`,
    p.averageEvaluation ? `Note moyenne d'évaluation entreprise : ${p.averageEvaluation}/5.` : "",
    "",
    "Répartition :",
    rows,
    "",
    "Structure attendue en Markdown léger : titre court, « Points saillants » (3 puces), « Zones de vigilance » (2-3 puces), « Recommandations » (3 puces).",
    "Chiffres cités uniquement ceux fournis ci-dessus. Réponds en français professionnel.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function cohortFallback(p: CohortPayload): string {
  const rate = p.students > 0 ? Math.round((p.placed / p.students) * 100) : 0;
  const top = [...p.rows].sort((a, b) => b.placed - a.placed)[0];
  return [
    `# Rapport d'insertion — ${p.scopeLabel}`,
    "",
    "**Points saillants**",
    `- Taux de placement : ${rate} % (${p.placed}/${p.students} étudiants rattachés).`,
    `- ${p.activeInterns} stage(s) actif(s) en cours et ${p.finishedInterns} stage(s) terminé(s).` +
      (top ? ` Département le plus dynamique : ${top.label} (${top.placed} placé(s)).` : ""),
    p.averageEvaluation
      ? `- Qualité des stages validée par les entreprises : note moyenne ${p.averageEvaluation}/5.`
      : "- Les évaluations entreprises en cours d'année affineront le bilan qualité.",
    "",
    "**Zones de vigilance**",
    `- ${p.pendingVisas} convention(s) attendent le visa pédagogique du Chef de Département.`,
    `- ${p.pendingSignatures} convention(s) prête(s) pour la signature de la Direction des Stages.`,
    `- ${p.searching} étudiant(s) reste(nt) sans stage : relance des partenariats entreprises recommandée.`,
    "",
    "**Recommandations**",
    "- Activer la banque d'offres StageTrack et les entreprises partenaires du secteur.",
    "- Prioriser les visas en attente pour sécuriser les conventions avant la date de démarrage.",
    "- Programmer une revue trimestrielle d'insertion avec les chefs de département.",
  ].join("\n");
}

/* --------------------- Copilote IA Académique (chat) ------------------- */

export const ETAB_QUICK_PROMPTS = [
  {
    label: "Analyser les conventions en attente",
    message:
      "Comment organiser efficacement le visa pédagogique des conventions en attente dans mon département ? Donne-moi une méthode en 4 étapes et les critères de contrôle.",
  },
  {
    label: "Rédiger une note aux entreprises partenaires",
    message:
      "Rédige une note courte (150 mots) destinée aux entreprises partenaires pour rappeler les obligations envers nos stagiaires : tuteur désigné, feuilles de présence, évaluation de fin de stage.",
  },
  {
    label: "Critères de validation d'un sujet L3/M2",
    message:
      "Quels critères de validation appliquer à un sujet de stage de Licence 3 et de Master 2 ? Compare les deux niveaux (autonomie, complexité, livrables).",
  },
] as const;

export const COPILOT_FALLBACK_NOTICE = [
  "**Mode dégradé actif** — la clé `GROQ_API_KEY` n'est pas configurée sur le serveur : je réponds avec des modèles de repli locaux.",
  "",
  "Pour activer le Copilote complet : ajoutez `GROQ_API_KEY` dans le fichier `.env`",
  "(les modèles *openai/gpt-oss-120b* et *openai/gpt-oss-20b* seront utilisés automatiquement).",
].join("\n");

/** Réponses de repli locales aux prompts rapides (mots-clés → réponse type). */
export function copilotFallbackAnswer(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("visa") || normalized.includes("convention")) {
    return [
      "**Méthode de visa pédagogique en 4 étapes**",
      "",
      "1. **Contrôle administratif** : signatures étudiant et entreprise présentes, dates cohérentes avec le calendrier académique.",
      "2. **Contrôle pédagogique** : sujet en lien avec la spécialité et le niveau ; missions couvrant les compétences du référentiel.",
      "3. **Contrôle encadrement** : tuteur entreprise identifié, visites d'encadrement planifiées.",
      "4. **Décision** : visa accordé avec note d'avis, ou visa réservé avec ajustements demandés (missions ou encadrement).",
      "",
      "Le circuit complet reste : Étudiant → Entreprise → **Visa Chef de Département** → Signature Direction des Stages.",
    ].join("\n");
  }
  if (normalized.includes("note aux entreprises") || normalized.includes("entreprises partenaires")) {
    return [
      "**Objet : Accompagnement de vos stagiaires — rappel des engagements mutuels**",
      "",
      "Madame, Monsieur,",
      "",
      "Nous vous remercions d'accueillir nos étudiants en stage. Pour sécuriser leur parcours, merci de veiller à :",
      "- la désignation d'un tuteur et la remise d'un plan d'intégration dès la première semaine ;",
      "- la validation hebdomadaire des feuilles de présence transmises via StageTrack ;",
      "- la réponse aux journaux de bord et l'évaluation de fin de stage (technique, ponctualité, autonomie, esprit d'équipe).",
      "",
      "Votre retour d'expérience enrichit nos référentiels et consolide notre partenariat.",
      "",
      "La Direction des Stages",
    ].join("\n");
  }
  if (normalized.includes("l3") || normalized.includes("m2") || normalized.includes("critères")) {
    return [
      "**Critères de validation d'un sujet de stage**",
      "",
      "**Licence 3** : sujet délimité, exécution guidée, livrable principal unique (mémoire + soutenance), autonomie partielle.",
      "",
      "**Master 2** : problématique formalisée par l'étudiant, démarche méthodologique argumentée, livrables multiples (implémentation/étude + mémoire), autonomie complète et contribution mesurable à l'entreprise.",
      "",
      "Dans les deux cas : cohérence avec la spécialité, faisabilité dans la durée du stage, encadrement identifié.",
    ].join("\n");
  }
  return COPILOT_FALLBACK_NOTICE;
}

/* ---------------- Analyse de sujet de mémoire (Maître de Mémoire) ---------------- */

export interface ThesisPayload {
  studentName: string;
  level: string;
  specialty: string;
  companyName: string;
  position: string;
  thesisTitle: string;
  thesisTopic: string;
  thesisPlan: string;
}

/* `plan` est un alias de lisibilité pour les prompts (thesisPlan). */


export function thesisPrompt(p: ThesisPayload): string {
  return [
    "Tu assistes un Maître de Mémoire qui doit valider le thème du mémoire d'un étudiant en stage.",
    `Étudiant : ${p.studentName} — ${p.level}, spécialité ${p.specialty}.`,
    `Entreprise d'accueil : ${p.companyName} (poste : « ${p.position} »).`,
    `Intitulé du mémoire : « ${p.thesisTitle} ».`,
    `Problématique soumise : ${p.thesisTopic}`,
    p.thesisPlan ? `Plan provisoire : ${p.thesisPlan.replace(/\n/g, " / ")}.` : "",
    "",
    "Réponds EXCLUSIVEMENT au format suivant :",
    "AVIS:",
    "<« VALABLE » ou « A AFFINER » suivi de 2 à 3 phrases d'analyse (cohérence avec la spécialité, faisabilité dans la durée du stage, contribution attendue)>",
    "QUESTIONS:",
    "<3 questions d'approfondissement à poser à l'étudiant en séance de validation, une par ligne, précédées de « - »>",
    "RECO:",
    "<2 à 3 recommandations concrètes (angle méthodologique, corpus, plan), une par ligne, précédées de « - »>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Repli local déterministe : analyse par recoupement de mots-clés. */
export function thesisFallback(p: ThesisPayload): { avis: string; questions: string[]; reco: string[] } {
  const haystack = `${p.thesisTopic} ${p.thesisPlan}`.toLowerCase();
  const keywords = `${p.specialty} ${p.position}`
    .toLowerCase()
    .split(/[\s&,;'-]+/)
    .filter((w) => w.length > 3);
  const hits = keywords.filter((w) => haystack.includes(w));
  const valable = hits.length >= Math.max(1, Math.ceil(keywords.length / 3)) && p.thesisTopic.length > 60;
  return {
    avis: valable
      ? `VALABLE — La problématique « ${p.thesisTitle} » est cohérente avec la spécialité ${p.specialty} et le poste occupé chez ${p.companyName}. Le plan couvre les attendus d'un mémoire de ${p.level} (contexte, méthodologie, étude de cas, recommandations). Validation possible après séance de cadrage.`
      : `A AFFINER — Le lien entre la problématique et la spécialité ${p.specialty} reste à préciser. Demandez à ${p.studentName} d'expliciter la démarche méthodologique et le corpus mobilisé avant validation.`,
    questions: [
      `Quelle méthode de recherche comptez-vous mobiliser pour répondre à la problématique (étude de cas, enquête, expérimentation) ?`,
      `Quelles données de ${p.companyName} pouvez-vous exploiter sans violer la confidentialité ?`,
      `Quel livrable mesurable attendez-vous à la fin de la période de stage ?`,
    ],
    reco: valable
      ? [
          "Valider le thème et fixer un calendrier de rédaction aligné sur les semaines restantes du stage.",
          "Exiger un chapitre méthodologique détaillé avant la mi-parcours.",
          "Planifier une séance de suivi toutes les deux semaines avec journaux de bord.",
        ]
      : [
          "Reformuler la problématique en une question unique et vérifiable.",
          "Ancrer le mémoire dans la spécialité et les missions réelles du stage.",
          "Fournir un plan de mémoire corrigé sous une semaine.",
        ],
  };
}
