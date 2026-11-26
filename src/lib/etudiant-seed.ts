/**
 * Auto-seed « intelligent » du Dashboard Étudiant StageTrack.
 * ----------------------------------------------------------
 * Garantit qu'un profil étudiant de démonstration réaliste existe toujours
 * (matricule IFRI-2026-042) et qu'il est relié aux offres, candidatures,
 * stages, conventions et documents pour que TOUTES les vues soient
 * immédiatement testables — y compris sur une base Neon vierge.
 *
 * Idempotent : chaque sous-étape vérifie l'existence avant création.
 */
import { db } from "@/lib/db";
import { attestationContent } from "@/lib/entreprise-templates";
import { hashPassword } from "@/lib/password";

export const DEMO_MATRICULE = "IFRI-2026-042";
/** Mot de passe du compte étudiant de démonstration (scrypt). */
export const DEMO_PASSWORD = "demo1234";

export interface DemoStudent {
  id: string;
  fullName: string;
  matricule: string;
  email: string;
  phone: string;
  universityId: string | null;
  universityName: string;
  fieldOfStudy: string;
  level: string;
  skills: string[];
  cvUrl: string;
}

const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86400000);

async function ensureCompany(): Promise<string> {
  const existing = await db.company.findUnique({ where: { name: "KKiaPay" }, select: { id: true } });
  if (existing) return existing.id;
  const created = await db.company.create({
    data: {
      name: "KKiaPay",
      sector: "Fintech / Paiements mobiles",
      city: "Cotonou",
      description:
        "KKiaPay est une solution de paiement en ligne qui permet aux entreprises et aux développeurs d'intégrer le mobile money et les moyens de paiement en Afrique de l'Ouest via une API unique.",
      website: "https://kkiapay.me",
    },
  });
  return created.id;
}

async function ensureUniversity(): Promise<string> {
  const existing = await db.universityProfile.findUnique({ where: { acronym: "IFRI" }, select: { id: true } });
  if (existing) return existing.id;
  const user = await db.user.create({
    data: {
      email: "stages.ifri@stage-track.bj.seed",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      fullName: "IFRI — Institut de Formation en Informatique de Gestion",
      role: "UNIVERSITY",
      profileCompleted: true,
    },
  }).catch(() => undefined);
  if (!user) {
    const fallback = await db.universityProfile.findUnique({ where: { acronym: "IFRI" }, select: { id: true } });
    if (!fallback) throw new Error("Université IFRI indisponible");
    return fallback.id;
  }
  const profile = await db.universityProfile.create({
    data: {
      userId: user.id,
      name: "IFRI — Institut de Formation en Informatique de Gestion",
      acronym: "IFRI",
      city: "Abomey-Calavi",
    },
  });
  return profile.id;
}

const OFFERS_SEED = [
  {
    key: "fe",
    title: "Stagiaire Développeur Frontend React (Next.js)",
    sector: "Informatique & IA",
    city: "Cotonou",
    duration: "6 mois",
    workMode: "HYBRIDE",
    contractType: "PRE_EMBAUCHE",
    gratification: "90 000 FCFA / mois",
    description:
      "Rejoignez l'équipe Produit de KKiaPay pour concevoir les interfaces web de notre plateforme de paiement. Vous travaillerez en binôme avec nos développeurs seniors sur des features utilisées chaque jour par des milliers de marchands.",
    missions: "Intégrer les maquettes Figma en composants React réutilisables\nDévelopper de nouvelles interfaces (tableau de bord marchand, widget de paiement)\nConnecter le frontend aux API REST internes\nÉcrire des tests unitaires et maintenir la couverture de code\nParticiper aux revues de code et aux daily meetings",
    skills: "React\nTypeScript\nTailwind CSS\nGit & GitHub\nFigma\nREST API",
  },
  {
    key: "be",
    title: "Stagiaire Développeur Backend Node.js & API",
    sector: "Informatique & IA",
    city: "Cotonou",
    duration: "6 mois",
    workMode: "SUR_SITE",
    contractType: "PRE_EMBAUCHE",
    gratification: "90 000 FCFA / mois",
    description:
      "Participez à la construction des services backend de KKiaPay : API marchands, webhooks mobile money, reporting transactions. Un stage technique exigeant, encadré par notre lead backend.",
    missions: "Développer des endpoints REST (Node.js / Express)\nIntégrer les webhooks des opérateurs mobile money\nOptimiser les requêtes PostgreSQL et le cache\nÉcrire des tests d'intégration automatisés\nDocumenter l'API (OpenAPI)",
    skills: "Node.js\nPostgreSQL\nPrisma\nDocker\nGit\nSécurité OWASP",
  },
  {
    key: "da",
    title: "Stagiaire Data Analyst (Power BI & SQL)",
    sector: "Data & Analytics",
    city: "Cotonou",
    duration: "3 mois",
    workMode: "HYBRIDE",
    contractType: "STAGE_ACADEMIQUE",
    gratification: "60 000 FCFA / mois",
    description:
      "Aidez l'équipe Finances & Growth à piloter la décision par la donnée : tableaux de bord transactions, suivi des cohortes marchands, analyses d'adoption du widget de paiement.",
    missions: "Construire des dashboards Power BI (transactions, adoption)\nÉcrire des requêtes SQL d'extraction et d'agrégation\nProduire un rapport hebdomadaire pour le COMEX\nDétecter les anomalies de données transactionnelles",
    skills: "SQL\nPower BI\nExcel\nPython\nAnalyse de données",
  },
  {
    key: "com",
    title: "Stagiaire Chargé(e) de Communication Digitale",
    sector: "Marketing & Communication",
    city: "Abomey-Calavi",
    duration: "3 mois",
    workMode: "TELETRAVAIL",
    contractType: "STAGE_ACADEMIQUE",
    gratification: "50 000 FCFA / mois",
    description:
      "Animez la présence digitale de KKiaPay : réseaux sociaux, newsletter marchands, support visuel des lancements produit. Stage 100 % télétravail avec points d'équipe hebdomadaires.",
    missions: "Créer les visuels et contenus des réseaux sociaux\nRédiger la newsletter mensuelle des marchands\nSuivre les statistiques d'engagement (Analytics)\nAppuyer l'organisation des webinars produits",
    skills: "Canva\nRédaction web\nCommunity management\nAnalytics",
  },
  {
    key: "ops",
    title: "Stagiaire DevOps & Sécurité Cloud",
    sector: "Informatique & IA",
    city: "Cotonou",
    duration: "6 mois",
    workMode: "HYBRIDE",
    contractType: "PRE_EMBAUCHE",
    gratification: "90 000 FCFA / mois",
    description:
      "Renforcez l'infrastructure cloud de KKiaPay : CI/CD, supervision, sécurité des environnements de paiement. Un stage au cœur des enjeux de fiabilité d'une fintech.",
    missions: "Maintenir les pipelines CI/CD (GitHub Actions)\nIndustrialiser la supervision (logs, alertes)\nParticiper aux audits de sécurité internes\nAutomatiser les environnements de recette",
    skills: "Linux\nDocker\nCI/CD\nAWS\nSécurité OWASP",
  },
] as const;

type OfferKey = (typeof OFFERS_SEED)[number]["key"];

async function ensureOffers(companyId: string): Promise<Record<OfferKey, string>> {
  const ids: Partial<Record<OfferKey, string>> = {};
  for (const offer of OFFERS_SEED) {
    const existing = await db.offer.findFirst({
      where: { companyId, title: offer.title },
      select: { id: true },
    });
    if (existing) {
      ids[offer.key] = existing.id;
      continue;
    }
    const created = await db.offer.create({
      data: {
        companyId,
        title: offer.title,
        sector: offer.sector,
        city: offer.city,
        duration: offer.duration,
        workMode: offer.workMode,
        contractType: offer.contractType,
        gratification: offer.gratification,
        description: offer.description,
        missions: offer.missions,
        skills: offer.skills,
        status: "PUBLIEE",
      },
    });
    ids[offer.key] = created.id;
  }
  return ids as Record<OfferKey, string>;
}

async function ensureTutor(companyId: string): Promise<{ id: string; name: string }> {
  const existing = await db.teamMember.findFirst({
    where: { companyId, role: "TUTEUR", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  const created = await db.teamMember.create({
    data: {
      companyId,
      name: "Serge Dossou",
      email: "serge.dossou.demo@kkiapay.me",
      role: "TUTEUR",
      phone: "+229 96 55 44 33",
    },
  }).catch(async () => {
    const fallback = await db.teamMember.findFirst({ where: { companyId, role: "TUTEUR" }, select: { id: true, name: true } });
    return fallback;
  });
  if (!created || !("id" in created)) throw new Error("Tuteur indisponible");
  return { id: created.id, name: created.name };
}

const ONBOARDING_CHECKLIST = [
  "Accès aux locaux et badge",
  "Configuration du poste de travail",
  "Création des accès Git, Figma & VPN",
  "Réunion de cadrage avec le tuteur",
  "Présentation de l'équipe et des outils",
  "Signature de la convention de stage",
  "Plan d'intégration validé avec le tuteur",
]
  .map((label, i) => `${i + 1}|${label}|[x]`)
  .join("\n");

async function ensureCandidaturesAndIntern(
  studentId: string,
  student: { name: string; matricule: string; university: string; email: string; phone: string; skills: string[] },
  offers: Record<OfferKey, string>,
  companyId: string,
  tutor: { id: string; name: string },
): Promise<void> {
  const existing = await db.candidature.findMany({
    where: { studentId, offerId: { not: null } },
    select: { offerId: true },
  });
  const appliedOffers = new Set(existing.map((c) => c.offerId));

  const now = new Date();
  const pipeline: Array<{
    key: OfferKey;
    status: string;
    daysAgo: number;
    interviewAt?: Date;
    aiScore?: number;
    aiSummary?: string;
  }> = [
    { key: "fe", status: "ENTRETIEN_PLANIFIE", daysAgo: 12, interviewAt: addDays(now, 3), aiScore: 82, aiSummary: "Profil React/TypeScript très cohérent avec le poste, portfolio Figma convaincant." },
    { key: "da", status: "NOUVELLE", daysAgo: 4 },
    { key: "com", status: "REFUSEE", daysAgo: 20 },
    { key: "ops", status: "PRESELECTIONNEE", daysAgo: 9, aiScore: 74 },
    { key: "be", status: "ACCEPTEE", daysAgo: 45 },
  ];

  for (const entry of pipeline) {
    if (appliedOffers.has(offers[entry.key])) continue;
    const offer = await db.offer.findUnique({ where: { id: offers[entry.key] }, select: { title: true, skills: true } });
    await db.candidature.create({
      data: {
        companyId,
        offerId: offers[entry.key],
        studentId,
        studentName: student.name,
        matricule: student.matricule,
        university: student.university,
        email: student.email,
        phone: student.phone,
        cvSummary: `Étudiant ${student.university} (Génie Logiciel) : ${student.skills.join(", ")}. Projets académiques en développement web et mobile.`,
        coverLetter:
          `Madame, Monsieur,\n\nActuellement en Licence 3 Génie Logiciel à ${student.university}, je souhaite rejoindre votre équipe pour le poste « ${offer?.title ?? "Stagiaire"} ». Rigoureux et passionné par les produits qui simplifient la vie des utilisateurs, je suis convaincu que ce stage me permettra de contribuer concrètement à vos projets tout en consolidant mes compétences.\n\nJe reste disponible pour un entretien.\n\nSènami Djogbenou`,
        status: entry.status,
        interviewAt: entry.interviewAt ?? null,
        aiScore: entry.aiScore ?? null,
        aiSummary: entry.aiSummary ?? null,
        aiQuestions:
          "- Présentez un projet React dont vous êtes fier et votre contribution exacte.\n- Comment sécurisez-vous les appels API côté client ?\n- Décrivez une difficulté technique récente et sa résolution.",
        createdAt: addDays(now, -entry.daysAgo),
        updatedAt: addDays(now, -entry.daysAgo),
      },
    });
  }

  /* ------------------------ Stage ACTIF (semaine 6/12) ------------------------ */
  const activeIntern = await db.intern.findFirst({
    where: { studentId, status: "ACTIF" },
    select: { id: true },
  });
  if (!activeIntern) {
    const beOffer = await db.offer.findUnique({ where: { id: offers.be }, select: { title: true } });
    const startDate = addDays(now, -42);
    const intern = await db.intern.create({
      data: {
        companyId,
        studentId,
        universityId: await ensureUniversity(),
        name: student.name,
        matricule: student.matricule,
        university: student.university,
        email: student.email,
        position: beOffer?.title ?? "Stagiaire Développeur Backend",
        tutorId: tutor.id,
        startDate,
        endDate: addDays(startDate, 12 * 7),
        totalWeeks: 12,
        status: "ACTIF",
        onboarding: ONBOARDING_CHECKLIST,
      },
    });
    await db.internshipTask.createMany({
      data: [
        { internId: intern.id, title: "Développer le module de notifications mobile money", description: "Implémenter les webhooks de notification et leur affichage côté back-office.", week: 4, status: "VALIDE" },
        { internId: intern.id, title: "Écrire les tests unitaires du service de transaction", description: "Couvrir les cas de succès, d'échec et de rejeu des transactions.", week: 4, status: "VALIDE", aiSuggested: true },
        { internId: intern.id, title: "Intégrer l'API Webhook des opérateurs", description: "Brancher les callbacks MTN & Moov avec validation de signature.", week: 5, status: "VALIDE" },
        { internId: intern.id, title: "Optimiser la requête de reporting transactions", description: "Réduire le temps de réponse du rapport hebdomadaire (< 2 s).", week: 5, status: "EN_COURS", aiSuggested: true },
        { internId: intern.id, title: "Refonte du endpoint /merchants/stats", description: "Paginer et mettre en cache les statistiques marchands.", week: 6, status: "EN_COURS" },
        { internId: intern.id, title: "Documenter l'API d'authentification (OpenAPI)", description: "Compléter la spec OpenAPI et les exemples d'appels.", week: 6, status: "A_FAIRE", aiSuggested: true },
        { internId: intern.id, title: "Préparer la démo sprint du vendredi", description: "Sélectionner les Stories terminées et préparer le script de démo.", week: 6, status: "A_FAIRE" },
      ],
    });
    await db.presenceSheet.createMany({
      data: [
        { internId: intern.id, periodLabel: "Semaine 4", daysPresent: 5, totalDays: 5, status: "VALIDEE", submittedAt: addDays(now, -26) },
        { internId: intern.id, periodLabel: "Semaine 5", daysPresent: 4, totalDays: 5, status: "VALIDEE", submittedAt: addDays(now, -19) },
        { internId: intern.id, periodLabel: "Semaine 6", daysPresent: 3, totalDays: 5, status: "A_VALIDER", submittedAt: addDays(now, -1) },
      ],
    });
    await db.weeklyJournal.createMany({
      data: [
        { internId: intern.id, week: 4, content: "Semaine consacrée aux notifications mobile money : réception des webhooks testée avec MTN et Moov. Obstacle : doublons de callbacks — résolu avec une clé d'idempotence. Livrable validé par le tuteur.", createdAt: addDays(now, -26) },
        { internId: intern.id, week: 5, content: "Intégration des webhooks opérateurs finalisée. Optimisation du reporting lancée : requête principale passée de 9 s à 4 s. Objectif de la semaine 6 : descendre sous les 2 s avec un index partiel.", createdAt: addDays(now, -19) },
      ],
    });
    await db.convention.create({
      data: {
        companyId,
        internId: intern.id,
        reference: "CONV-KK-2026-042",
        studentName: student.name,
        university: student.university,
        position: beOffer?.title ?? "Stagiaire Développeur Backend",
        status: "EN_ATTENTE",
        signedCompany: true,
        signedUniversity: true,
        signedStudent: false,
        startDate,
        endDate: addDays(startDate, 12 * 7),
      },
    });
  }

  /* --------------------- Stage TERMINÉ (attestation + éval) ------------------- */
  const doneIntern = await db.intern.findFirst({
    where: { studentId, status: "TERMINE" },
    select: { id: true },
  });
  if (!doneIntern) {
    const startDate = addDays(now, -200);
    const endDate = addDays(now, -116);
    const pastIntern = await db.intern.create({
      data: {
        companyId,
        studentId,
        universityId: await ensureUniversity(),
        name: student.name,
        matricule: student.matricule,
        university: student.university,
        email: student.email,
        position: "Stagiaire Testeur & QA Mobile",
        tutorId: tutor.id,
        startDate,
        endDate,
        totalWeeks: 12,
        status: "TERMINE",
        vivierTag: true,
        onboarding: ONBOARDING_CHECKLIST,
      },
    });
    await db.evaluation.create({
      data: {
        internId: pastIntern.id,
        technique: 4,
        ponctualite: 5,
        autonomie: 4,
        espritEquipe: 4,
        appreciation:
          "Sènami a mené ses missions de test avec grande rigueur : plans de tests couvrants, bugs documentés de façon reproductible et excellent relationnel avec l'équipe produit. Sa ponctualité exemplaire et son autonomie croissante en font un stagiaire que nous recommandons vivement.",
        finalized: true,
      },
    });
    const count = await db.attestation.count();
    await db.attestation.create({
      data: {
        internId: pastIntern.id,
        reference: `ATT-${endDate.getFullYear()}-${String(count + 1).padStart(3, "0")}`,
        content: attestationContent({
          companyName: "KKiaPay",
          city: "Cotonou",
          studentName: student.name,
          matricule: student.matricule,
          university: student.university,
          position: "Stagiaire Testeur & QA Mobile",
          startDate,
          endDate,
          tutorName: tutor.name,
        }),
      },
    });
    await db.convention.create({
      data: {
        companyId,
        internId: pastIntern.id,
        reference: "CONV-KK-2025-118",
        studentName: student.name,
        university: student.university,
        position: "Stagiaire Testeur & QA Mobile",
        status: "SIGNEE",
        signedCompany: true,
        signedUniversity: true,
        signedStudent: true,
        startDate,
        endDate,
      },
    });
  }
}

/** Crée (ou retrouve) l'étudiant de démonstration et tout son écosystème. */
export async function ensureDemoStudent(): Promise<DemoStudent> {
  const existing = await db.studentProfile.findUnique({
    where: { matricule: DEMO_MATRICULE },
    include: { user: true, university: true },
  });

  if (existing) {
    return {
      id: existing.id,
      fullName: existing.user.fullName,
      matricule: existing.matricule,
      email: existing.user.email,
      phone: existing.phone ?? "+229 97 41 25 36",
      universityId: existing.universityId,
      universityName: existing.university?.name ?? existing.schoolName ?? "UAC / IFRI",
      fieldOfStudy: existing.fieldOfStudy ?? "Génie Logiciel",
      level: existing.level ?? "Licence 3",
      skills: existing.skills.length > 0 ? existing.skills : ["React", "TypeScript", "Git"],
      cvUrl: existing.cvUrl ?? "",
    };
  }

  const companyId = await ensureCompany();
  const universityId = await ensureUniversity();
  const offers = await ensureOffers(companyId);
  const tutor = await ensureTutor(companyId);

  let user = await db.user.findUnique({ where: { email: "senami.djogbenou@ifri.uac.bj" } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: "senami.djogbenou@ifri.uac.bj",
        passwordHash: await hashPassword(DEMO_PASSWORD),
        fullName: "Sènami Djogbenou",
        role: "STUDENT",
        // Compte de démonstration établi : onboarding déjà complété.
        profileCompleted: true,
      },
    });
  } else if (!user.profileCompleted) {
    // Compte existant d'une exécution précédente : compte démo prêt à l'emploi.
    user = await db.user.update({
      where: { id: user.id },
      data: { profileCompleted: true, passwordHash: await hashPassword(DEMO_PASSWORD) },
    });
  }

  const student = {
    name: user.fullName,
    matricule: DEMO_MATRICULE,
    university: "UAC / IFRI",
    email: user.email,
    phone: "+229 97 41 25 36",
    skills: ["React", "TypeScript", "Tailwind CSS", "Git", "Node.js", "Figma"],
  };

  const profile = await db.studentProfile.create({
    data: {
      userId: user.id,
      matricule: DEMO_MATRICULE,
      universityId,
      schoolName: "UAC / IFRI",
      fieldOfStudy: "Génie Logiciel",
      level: "Licence 3",
      phone: student.phone,
      cvUrl: "https://cv.stagetrack.bj/demo/senami-djogbenou.pdf",
      skills: student.skills,
    },
  }).catch(async (error: unknown) => {
    // Course concurrente (double requête) : relire le profil créé par l'autre requête
    const raced = await db.studentProfile.findUnique({ where: { matricule: DEMO_MATRICULE } });
    if (!raced) throw error;
    return raced;
  });

  await ensureCandidaturesAndIntern(profile.id, student, offers, companyId, tutor);

  return {
    id: profile.id,
    fullName: user.fullName,
    matricule: profile.matricule,
    email: user.email,
    phone: student.phone,
    universityId,
    universityName: "UAC / IFRI — Institut de Formation en Informatique de Gestion",
    fieldOfStudy: "Génie Logiciel",
    level: "Licence 3",
    skills: student.skills,
    cvUrl: "https://cv.stagetrack.bj/demo/senami-djogbenou.pdf",
  };
}

/**
 * Étudiant de la session réelle (JWT) — retourne le profil de l'utilisateur
 * connecté si c'est un étudiant, sinon retombe sur le profil de démonstration
 * (scripts, aperçus hors session). Même forme que ensureDemoStudent.
 */
export async function getSessionDemoStudent(): Promise<DemoStudent> {
  try {
    const { getSessionUser } = await import("@/lib/session");
    const sessionUser = await getSessionUser();
    if (sessionUser?.studentProfile) {
      const profile = await db.studentProfile.findUnique({
        where: { id: sessionUser.studentProfile.id },
        include: {
          user: { select: { fullName: true, email: true } },
          university: { select: { name: true } },
        },
      });
      if (profile) {
        return {
          id: profile.id,
          fullName: profile.user.fullName,
          matricule: profile.matricule,
          email: profile.user.email,
          phone: profile.phone ?? "",
          universityId: profile.universityId,
          universityName: profile.university?.name ?? profile.schoolName ?? "",
          fieldOfStudy: profile.fieldOfStudy ?? "",
          level: profile.level ?? "",
          skills: profile.skills,
          cvUrl: profile.cvUrl ?? "",
        };
      }
    }
  } catch {
    // session absente ou base indisponible : profil de démonstration
  }
  return ensureDemoStudent();
}
