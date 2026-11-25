/**
 * Données de démonstration de la Landing Page StageTrack.
 * (Offres fictives réalistes pour l'écosystème béninois.)
 */

export type OfferType = "Stage académique" | "Pré-embauche";

export interface InternshipOffer {
  id: string;
  title: string;
  company: string;
  initials: string;
  sector: string;
  city: string;
  duration: string;
  type: OfferType;
  publishedLabel: string;
  skills: string[];
  avatarColor: string;
}

export const COMPANIES = [
  "Toutes les entreprises",
  "KKiaPay",
  "Orabank Bénin",
  "WaChap",
  "Swinmo",
  "UBA Bénin",
  "Axazara",
] as const;

export const SECTORS = [
  "Tous les secteurs",
  "Informatique & IA",
  "Finance & Banque",
  "Marketing Digital",
  "Gestion de Projet",
  "Télécoms & Réseaux",
] as const;

export const CITIES = [
  "Toutes les villes",
  "Cotonou",
  "Abomey-Calavi",
  "Porto-Novo",
  "Lokossa",
  "Télétravail",
] as const;

export const OFFERS: InternshipOffer[] = [
  {
    id: "1",
    title: "Développeur Frontend React (Next.js)",
    company: "KKiaPay",
    initials: "KK",
    sector: "Informatique & IA",
    city: "Cotonou",
    duration: "6 mois",
    type: "Pré-embauche",
    publishedLabel: "Il y a 2 jours",
    skills: ["React", "Next.js", "Tailwind CSS", "API REST"],
    avatarColor: "bg-brand",
  },
  {
    id: "2",
    title: "Analyste Crédit & Conformité bancaire",
    company: "Orabank Bénin",
    initials: "OB",
    sector: "Finance & Banque",
    city: "Cotonou",
    duration: "3 mois",
    type: "Stage académique",
    publishedLabel: "Il y a 3 jours",
    skills: ["Finance", "Excel", "Analyse de risques", "Rapport"],
    avatarColor: "bg-gold",
  },
  {
    id: "3",
    title: "Chargé de Marketing Digital & Community Management",
    company: "WaChap",
    initials: "WC",
    sector: "Marketing Digital",
    city: "Abomey-Calavi",
    duration: "4 mois",
    type: "Pré-embauche",
    publishedLabel: "Il y a 5 jours",
    skills: ["Réseaux sociaux", "Copywriting", "Meta Ads", "SEO"],
    avatarColor: "bg-brand-dark",
  },
  {
    id: "4",
    title: "Chef de Projet Junior — Transformation digitale",
    company: "Swinmo",
    initials: "SW",
    sector: "Gestion de Projet",
    city: "Lokossa",
    duration: "3 mois",
    type: "Stage académique",
    publishedLabel: "Il y a 1 semaine",
    skills: ["Agile", "Scrum", "Notion", "Coordination"],
    avatarColor: "bg-gold-dark",
  },
  {
    id: "5",
    title: "Ingénieur Réseaux & Télécoms (Infrastructures)",
    company: "UBA Bénin",
    initials: "UB",
    sector: "Télécoms & Réseaux",
    city: "Cotonou",
    duration: "6 mois",
    type: "Pré-embauche",
    publishedLabel: "Il y a 2 jours",
    skills: ["Cisco", "VPN", "Sécurité réseau", "Supervision"],
    avatarColor: "bg-brand",
  },
  {
    id: "6",
    title: "Développeur Backend Python & Intelligence Artificielle",
    company: "Axazara",
    initials: "AX",
    sector: "Informatique & IA",
    city: "Télétravail",
    duration: "4 mois",
    type: "Stage académique",
    publishedLabel: "Il y a 4 jours",
    skills: ["Python", "Machine Learning", "FastAPI", "Docker"],
    avatarColor: "bg-gold",
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarColor: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "J'ai postulé à 12 offres depuis mon tableau Kanban, en suivant chaque entretien et chaque relance au même endroit. Trois semaines plus tard, je décrochais mon stage de fin de formation chez WaChap. Sans StageTrack, je crois que j'aurais encore tout suivi dans un carnet.",
    name: "Nadège Ahouansou",
    role: "Étudiante en Licence 3 Marketing — Université d'Abomey-Calavi",
    initials: "NA",
    avatarColor: "bg-brand",
  },
  {
    quote:
      "Je supervise cinq stagiaires avec des tuteurs différents. Sur StageTrack, les présences, les missions hebdomadaires et les évaluations sont centralisés : je gagne au moins deux heures par semaine et mes bilans de fin de stage s'exportent en un clic.",
    name: "Rodrigue Kpossou",
    role: "Responsable RH & Tuteur — KKiaPay",
    initials: "RK",
    avatarColor: "bg-gold",
  },
  {
    quote:
      "Pour nos 120 étudiants en année finale, le suivi de cohorte a changé notre quotidien : nous voyons d'un coup d'œil qui a signé sa convention, qui est en poste et dont l'évaluation finale attend une validation académique.",
    name: "Dr. Marcelline Adjovi",
    role: "Responsable pédagogique — Institut Supérieur de Cotonou",
    initials: "MA",
    avatarColor: "bg-brand-dark",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "StageTrack est-il vraiment 100 % gratuit ?",
    answer:
      "Oui, totalement. Les étudiants, les entreprises recruteuses et les établissements scolaires accèdent gratuitement à l'ensemble des fonctionnalités : publication d'offres illimitée, tracker de candidatures, gestion des stagiaires, génération de conventions et outils d'IA. Aucun abonnement, aucune commission, aucun frais caché.",
  },
  {
    question: "Comment fonctionne l'outil de gestion des stagiaires pour les entreprises ?",
    answer:
      "Une fois votre stagiaire intégré, vous lui assignez un tuteur, planifiez ses missions hebdomadaires, validez ses présences et suivez ses livrables depuis un tableau de bord dédié. En fin de stage, la plateforme génère automatiquement le bilan d'évaluation et l'attestation, prêts à être signés et archivés.",
  },
  {
    question: "Comment sont vérifiées les offres de stage publiées ?",
    answer:
      "Chaque offre passe par une équipe de modération qui contrôle l'existence de l'entreprise, la cohérence du poste et la conformité de la mission avec un cadre pédagogique. Les offres suspectes sont retirées et les entreprises signalées ne peuvent plus publier.",
  },
  {
    question: "Qui peut publier des offres de stage sur la plateforme ?",
    answer:
      "Toute entreprise déclarée, ONG ou administration publique peut créer gratuitement son espace entreprise et publier ses offres. Les offres académiques partenaires des écoles sont directement reliées aux établissements concernés pour simplifier la convention.",
  },
  {
    question: "Les écoles et universités peuvent-elles suivre leurs étudiants ?",
    answer:
      "Oui. Chaque établissement partenaire dispose d'un espace dédié : suivi de cohorte en temps réel, validation académique des conventions et des évaluations, et messagerie directe avec les tuteurs en entreprise pour garantir la réussite pédagogique du stage.",
  },
];

export const NAV_LINKS = [
  { label: "Offres de stage", href: "#offres" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Parcours Étudiant", href: "#parcours-etudiant" },
  { label: "Parcours Entreprise", href: "#parcours-entreprise" },
  { label: "FAQ", href: "#faq" },
] as const;
