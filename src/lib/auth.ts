/**
 * Logique métier du système d'authentification StageTrack.
 * (Simulation frontend — la connexion réelle se branchera sur l'API.)
 */

export const ROLES = ["etudiant", "entreprise", "universite"] as const;
export type Role = (typeof ROLES)[number];

export const AUTH_MODES = ["connexion", "inscription"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

export const isAuthMode = (value: unknown): value is AuthMode =>
  typeof value === "string" && (AUTH_MODES as readonly string[]).includes(value);

export const ROLE_LABEL: Record<Role, string> = {
  etudiant: "Étudiant",
  entreprise: "Entreprise",
  universite: "Université / Entité",
};

/** Sous-titre descriptif affiché dans l'en-tête de chaque écran. */
export const ROLE_SUBTITLE: Record<Role, string> = {
  etudiant:
    "Votre espace pour chercher un stage, suivre vos candidatures et votre parcours.",
  entreprise:
    "Votre espace pour publier des offres de stage et gérer vos stagiaires.",
  universite:
    "Votre espace pour suivre vos étudiants en stage et valider les conventions.",
};

export const ROLE_REDIRECT: Record<Role, string> = {
  etudiant: "/etudiant/dashboard",
  entreprise: "/entreprise/dashboard",
  universite: "/etablissement/dashboard",
};

/* ------------------------------------------------------------------ */
/*  Établissements & détection automatique par numéro matricule        */
/* ------------------------------------------------------------------ */

export interface Institution {
  id: string;
  name: string;
  university?: string;
}

export const INSTITUTIONS: Institution[] = [
  {
    id: "ifri",
    name: "IFRI — Institut de Formation en Informatique de Gestion",
    university: "Université d'Abomey-Calavi",
  },
  {
    id: "eneam",
    name: "ENEAM — École Nationale d'Économie Appliquée et de Management",
    university: "Université d'Abomey-Calavi",
  },
  {
    id: "epac",
    name: "EPAC — École Polytechnique d'Abomey-Calavi",
    university: "Université d'Abomey-Calavi",
  },
  { id: "uac", name: "Université d'Abomey-Calavi" },
  { id: "up", name: "Université de Parakou" },
  {
    id: "unstim",
    name: "UNSTIM — Université des Sciences, Technologies, Ingénierie & Mathématiques",
    university: "Abomey",
  },
  { id: "autre", name: "Autre établissement (à préciser)" },
];

export interface MatriculeDetection {
  institution: Institution;
  matched: string;
}

/**
 * Détecte automatiquement l'établissement d'origine à partir du préfixe
 * du numéro matricule. Formats béninois typiques :
 *  - « 20241045 »  → matricule numérique annuel (Université d'Abomey-Calavi)
 *  - « IFRI-2026-089 » → préfixe du sigle de l'établissement
 */
export function detectInstitution(rawMatricule: string): MatriculeDetection | null {
  const matricule = rawMatricule.trim().toUpperCase();
  if (matricule.length < 3) return null;

  const prefixRules: { pattern: RegExp; id: string }[] = [
    { pattern: /^IFRI[-\s]?/, id: "ifri" },
    { pattern: /^ENEAM[-\s]?/, id: "eneam" },
    { pattern: /^EPAC[-\s]?/, id: "epac" },
    { pattern: /^UAC[-\s]?/, id: "uac" },
    { pattern: /^(UP|UAT)[-\/\s]?/, id: "up" },
    { pattern: /^UNSTIM[-\s]?/, id: "unstim" },
    { pattern: /^\d{4}/, id: "uac" },
  ];

  for (const rule of prefixRules) {
    const matched = matricule.match(rule.pattern)?.[0];
    if (matched) {
      const institution = INSTITUTIONS.find((i) => i.id === rule.id);
      if (institution) {
        return { institution, matched: matched.replace(/[-\s]+$/, "") };
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Listes de référence (espace entreprise & établissement)            */
/* ------------------------------------------------------------------ */

export const SECTEURS = [
  "Informatique & IA",
  "Finance & Banque",
  "Marketing Digital",
  "Gestion de Projet",
  "Télécoms & Réseaux",
  "Agro-industrie",
  "Santé & Pharmacie",
  "Logistique & Transport",
  "Éducation & Formation",
  "Autre",
] as const;

export const VILLES = [
  "Cotonou",
  "Abomey-Calavi",
  "Porto-Novo",
  "Lokossa",
  "Parakou",
  "Bohicon",
  "Djougou",
  "Télétravail",
] as const;

export const FONCTIONS_REFERENT = [
  "Directeur / Directrice",
  "Secrétaire général(e)",
  "Responsable pédagogique",
  "Responsable RH",
] as const;

/* ------------------------------------------------------------------ */
/*  Robustesse du mot de passe                                         */
/* ------------------------------------------------------------------ */

export interface PasswordStrength {
  score: 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const clamped = Math.min(Math.max(score, 1), 4) as 1 | 2 | 3 | 4;
  const labels = { 1: "Faible", 2: "Moyenne", 3: "Bonne", 4: "Excellente" } as const;
  return { score: clamped, label: labels[clamped] };
}

/* ------------------------------------------------------------------ */
/*  Simulation d'appel réseau (authentification)                       */
/* ------------------------------------------------------------------ */

export function simulateAuthRequest(ms = 1500): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(true), ms));
}
