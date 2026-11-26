/**
 * Seed du Dashboard Entreprise StageTrack — société de démonstration : KKiaPay.
 * -----------------------------------------------------------------------
 * Alimente TOUTE la base PostgreSQL / Neon :
 *  - Couche auth      : Users (COMPANY / STUDENT / UNIVERSITY), UniversityProfile,
 *                       StudentProfile (détection par matricule opérationnelle)
 *  - Couche dashboard : Company KKiaPay, équipe, offres, 68 candidatures,
 *                       12 stagiaires ACTIF + 3 TERMINE, tâches, présences,
 *                       journaux, conventions, évaluations, attestation
 *  - Ponts            : TeamMember.userId, Intern.studentId, Intern.universityId,
 *                       Candidature.studentId
 *
 * KPIs cibles du dashboard : 4 offres actives, 68 candidatures, 12 stagiaires
 * en poste, 3 conventions en attente + historique 6 mois pour Recharts.
 *
 * Run : npm run db:seed   (ou : npx prisma db seed)
 * Compatible npm / tsx / bun — aucune API spécifique à un runtime.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { attestationContent } from "../src/lib/entreprise-templates";

/* Chargement manuel de .env : les valeurs du fichier .env priment sur
   l'environnement courant (certains environnements injectent une URL par défaut). */
{
  for (const p of [join(process.cwd(), ".env"), join(process.cwd(), "prisma", ".env")]) {
    if (existsSync(p)) {
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/);
        if (m) process.env[m[1]] = m[2];
      }
      break;
    }
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL introuvable — créez le fichier .env (voir README).");
  process.exit(1);
}

const db = new PrismaClient();

/* Mot de passe de démonstration partagé, haché avec crypto.scrypt natif
   (voir src/lib/password.ts) — identique au système d'authentification réel. */
const DEMO_PASSWORD = "demo1234";

/* Générateur pseudo-aléatoire déterministe (LCG) */
let seedState = 42;
const rnd = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const pick = <T,>(arr: T[], offset: number): T => arr[offset % arr.length];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const NOW = new Date();

/* Universités partenaires (sigles identiques à ceux du dashboard) */
const UNIVERSITIES: Array<{ acronym: string; name: string; city: string }> = [
  { acronym: "IFRI", name: "IFRI — Institut de Formation en Informatique de Gestion", city: "Abomey-Calavi" },
  { acronym: "ENEAM", name: "ENEAM — École Nationale d'Économie Appliquée et de Management", city: "Abomey-Calavi" },
  { acronym: "EPAC", name: "EPAC — École Polytechnique d'Abomey-Calavi", city: "Abomey-Calavi" },
  { acronym: "UNILOCA", name: "Université de Lokossa", city: "Lokossa" },
  { acronym: "ISMA", name: "ISM Adonaï", city: "Cotonou" },
  { acronym: "IPD", name: "UAC / IPD", city: "Abomey-Calavi" },
  { acronym: "CERFOLA", name: "CERFOLA / CRS", city: "Cotonou" },
];
const acronymOf = (university: string): string =>
  UNIVERSITIES.find((u) => university.includes(u.acronym))?.acronym ??
  UNIVERSITIES.find((u) => university.startsWith(u.name.slice(0, 8)))?.acronym ??
  "IFRI";

const FIELD_BY_ACRONYM: Record<string, string> = {
  IFRI: "Génie Logiciel",
  ENEAM: "Informatique de gestion",
  EPAC: "Économie & Gestion",
  UNILOCA: "Informatique de gestion",
  ISMA: "Communication digitale",
  IPD: "Communication digitale",
  CERFOLA: "Langues appliquées",
};
const fieldFor = (position: string, acronym: string): string => {
  if (position.includes("Frontend") || position.includes("Backend") || position.includes("DevOps")) return "Génie Logiciel";
  if (position.includes("Data")) return "Analyse de données";
  if (position.includes("Communication")) return "Communication digitale";
  return FIELD_BY_ACRONYM[acronym] ?? "Informatique de gestion";
};
const SKILL_BANK: Record<string, string[]> = {
  Frontend: ["React", "TypeScript", "Tailwind CSS", "Git"],
  Backend: ["Node.js", "PostgreSQL", "Prisma", "Docker"],
  Data: ["SQL", "Power BI", "Excel", "Python"],
  Communication: ["Canva", "Rédaction web", "Community management", "Analytics"],
  DevOps: ["Linux", "AWS", "CI/CD", "Sécurité OWASP"],
};
const skillSet = (position: string): string[] => {
  const key = position.includes("Frontend") ? "Frontend" : position.includes("Backend") ? "Backend" : position.includes("Data") ? "Data" : position.includes("Communication") ? "Communication" : "DevOps";
  return SKILL_BANK[key];
};

async function main() {
  console.log("Nettoyage des tables (ordre FK)…");
  await db.attestation.deleteMany();
  await db.evaluation.deleteMany();
  await db.convention.deleteMany();
  await db.weeklyJournal.deleteMany();
  await db.presenceSheet.deleteMany();
  await db.internshipTask.deleteMany();
  await db.intern.deleteMany();
  await db.candidature.deleteMany();
  await db.offer.deleteMany();
  await db.teamMember.deleteMany();
  await db.studentProfile.deleteMany();
  await db.universityProfile.deleteMany();
  await db.company.deleteMany();
  await db.user.deleteMany();

  /* ------------------------ Universités partenaires ----------------------- */
  console.log("Création de la couche auth — universités partenaires…");
  const universities: Record<string, string> = {}; // acronym → UniversityProfile.id
  for (const u of UNIVERSITIES) {
    const user = await db.user.create({
      data: {
        email: `stages.${u.acronym.toLowerCase()}@stage-track.bj`,
        passwordHash: await hashPassword(DEMO_PASSWORD),
        fullName: u.name,
        role: "UNIVERSITY",
        profileCompleted: true,
      },
    });
    const profile = await db.universityProfile.create({
      data: { userId: user.id, name: u.name, acronym: u.acronym, city: u.city },
    });
    universities[u.acronym] = profile.id;
  }

  /* --------------------------- Entreprise & équipe ------------------------ */
  console.log("Création de l'entreprise KKiaPay + comptes de l'équipe…");
  const kkiapay = await db.company.create({
    data: {
      name: "KKiaPay",
      sector: "Fintech / Paiements mobiles",
      city: "Cotonou",
      description:
        "KKiaPay est une solution de paiement en ligne qui permet aux entreprises et aux développeurs d'intégrer le mobile money et les moyens de paiement en Afrique de l'Ouest via une API unique. Notre équipe produit & tech conçoit des outils simples, sûrs et accessibles pour le e-commerce, les ONG et les institutions financières.",
      website: "https://kkiapay.me",
    },
  });

  const teamSeed = [
    { name: "Marcelle Ahouansou", email: "marcelle.ahouansou@kkiapay.me", role: "ADMIN_RH", phone: "+229 97 00 11 22" },
    { name: "Serge Dossou", email: "serge.dossou@kkiapay.me", role: "TUTEUR", phone: "+229 96 55 44 33" },
    { name: "Aïcha Kponou", email: "aicha.kponou@kkiapay.me", role: "TUTEUR", phone: "+229 95 78 90 12" },
  ] as const;
  const team: Record<string, string> = {}; // prénom → TeamMember.id
  for (const m of teamSeed) {
    const user = await db.user.create({
      data: { email: m.email, passwordHash: await hashPassword(DEMO_PASSWORD), fullName: m.name, role: "COMPANY", profileCompleted: true },
    });
    const member = await db.teamMember.create({
      data: { companyId: kkiapay.id, userId: user.id, name: m.name, email: m.email, role: m.role, phone: m.phone },
    });
    team[m.name.split(" ")[0]] = member.id;
  }
  const marcelle = team["Marcelle"];
  const serge = team["Serge"];
  const aicha = team["Aïcha"];

  /* ------------------------------ Offres --------------------------------- */
  console.log("Création des offres de stage…");
  type OfferSeed = {
    title: string; sector: string; city: string; duration: string; workMode: string;
    contractType: string; gratification: string; status: string; description: string;
    missions: string; skills: string; daysAgo: number;
  };
  const offersSeed: OfferSeed[] = [
    {
      title: "Stagiaire Développeur Frontend React (Next.js)",
      sector: "Informatique & IA", city: "Cotonou", duration: "6 mois", workMode: "HYBRIDE",
      contractType: "PRE_EMBAUCHE", gratification: "90 000 FCFA / mois", status: "PUBLIEE",
      description:
        "Rejoignez l'équipe Produit de KKiaPay pour concevoir les interfaces web de notre plateforme de paiement. Vous travaillerez en binôme avec nos développeurs seniors sur des features utilisées chaque jour par des milliers de marchands au Bénin, au Togo et en Côte d'Ivoire.",
      missions: "Intégrer les maquettes Figma en composants React réutilisables\nDévelopper de nouvelles interfaces (tableau de bord marchand, widget de paiement)\nConnecter le frontend aux API REST internes\nÉcrire des tests unitaires et maintenir la couverture de code\nParticiper aux revues de code et aux daily meetings",
      skills: "React\nNext.js\nTypeScript\nTailwind CSS\nGit & GitHub",
      daysAgo: 35,
    },
    {
      title: "Stagiaire Développeur Backend Node.js & API",
      sector: "Informatique & IA", city: "Cotonou", duration: "6 mois", workMode: "SUR_SITE",
      contractType: "PRE_EMBAUCHE", gratification: "90 000 FCFA / mois", status: "PUBLIEE",
      description:
        "Vous contribuez au cœur de notre plateforme : les API de paiement. Encadré par notre Lead Backend, vous concevez, testez et documentez des endpoints robustes qui traitent des transactions Mobile Money en temps réel.",
      missions: "Développer des endpoints REST (Node.js / TypeScript / Prisma)\nOptimiser les requêtes PostgreSQL et les temps de réponse\nImplémenter la journalisation et le monitoring des transactions\nRédiger la documentation OpenAPI des nouveaux endpoints\nParticiper à la revue d'architecture hebdomadaire",
      skills: "Node.js\nTypeScript\nPostgreSQL\nPrisma\nDocker",
      daysAgo: 28,
    },
    {
      title: "Stagiaire Data Analyst (Power BI & SQL)",
      sector: "Informatique & IA", city: "Cotonou", duration: "3 mois", workMode: "TELETRAVAIL",
      contractType: "STAGE_ACADEMIQUE", gratification: "60 000 FCFA / mois", status: "PUBLIEE",
      description:
        "Pilotez la donnée de KKiaPay : construction de tableaux de bord Power BI pour les équipes Opérations et Marketing, analyse des taux de conversion des paiements, détection d'anomalies sur les transactions.",
      missions: "Construire des dashboards Power BI (suivi transactions & utilisateurs)\nÉcrire et optimiser des requêtes SQL sur la base analytique\nAnalyser les taux de réussite des paiements par opérateur\nProduire un rapport mensuel d'insights pour le COMEX",
      skills: "SQL\nPower BI\nExcel\nPython (Pandas)",
      daysAgo: 20,
    },
    {
      title: "Stagiaire Chargé(e) de Communication Digitale",
      sector: "Marketing Digital", city: "Cotonou", duration: "3 mois", workMode: "SUR_SITE",
      contractType: "STAGE_ACADEMIQUE", gratification: "60 000 FCFA / mois", status: "PUBLIEE",
      description:
        "Intégrez l'équipe Marketing pour animer nos réseaux sociaux (LinkedIn, X, TikTok), produire des contenus visuels et contribuer aux campagnes de sensibilisation de notre API de paiement auprès des développeurs.",
      missions: "Animer les réseaux sociaux (3 publications / semaine)\nCréer des visuels avec Canva et CapCut\nRédiger des articles de blog et newsletters\nSuivre les statistiques d'engagement et proposer des ajustements",
      skills: "Canva\nRédaction web\nCommunity management\nAnalytics",
      daysAgo: 12,
    },
    {
      title: "Stagiaire DevOps & Sécurité Cloud",
      sector: "Informatique & IA", city: "Cotonou", duration: "6 mois", workMode: "HYBRIDE",
      contractType: "PRE_EMBAUCHE", gratification: "90 000 FCFA / mois", status: "POURVUE",
      description:
        "Poste pourvu — merci pour votre intérêt ! Le stagiaire retenu a rejoint l'équipe Infrastructure pour automatiser nos déploiements et renforcer la sécurité de notre plateforme de paiement.",
      missions: "Automatiser les pipelines CI/CD (GitHub Actions)\nConteneuriser les microservices (Docker)\nRenforcer la conformité sécurité (OWASP, scans)",
      skills: "AWS\nCI/CD\nLinux\nSécurité OWASP",
      daysAgo: 150,
    },
    {
      title: "Stagiaire Support Client & Opérations",
      sector: "Finance & Banque", city: "Cotonou", duration: "3 mois", workMode: "SUR_SITE",
      contractType: "STAGE_ACADEMIQUE", gratification: "60 000 FCFA / mois", status: "BROUILLON",
      description:
        "(Brouillon en cours de rédaction par l'équipe RH) Accompagner les marchands dans l'intégration de l'API KKiaPay, traiter les tickets de support et améliorer la base de connaissances.",
      missions: "Traiter les tickets support (email & WhatsApp)\nAccompagner les marchands dans l'intégration API\nRédiger des guides d'intégration pas-à-pas",
      skills: "Relation client\nZendesk\nExcel",
      daysAgo: 5,
    },
  ];

  const offers: Record<string, string> = {};
  for (const { daysAgo, ...o } of offersSeed) {
    const created = await db.offer.create({
      data: { ...o, companyId: kkiapay.id, createdAt: addDays(NOW, -daysAgo) },
    });
    offers[o.title] = created.id;
  }
  const OFF = {
    fe: offers["Stagiaire Développeur Frontend React (Next.js)"],
    be: offers["Stagiaire Développeur Backend Node.js & API"],
    da: offers["Stagiaire Data Analyst (Power BI & SQL)"],
    com: offers["Stagiaire Chargé(e) de Communication Digitale"],
    ops: offers["Stagiaire DevOps & Sécurité Cloud"],
  };

  /* --------------- Étudiants : comptes + profils liés aux stagiaires ------ */
  console.log("Création des comptes étudiants (User + StudentProfile)…");
  type InternSeed = {
    name: string; matricule: string; university: string; position: string; offerId: string;
    tutorId: string; currentWeek: number; totalWeeks: number; status: string; vivier: boolean;
    onboardingDone: number; startWeeksAgo?: number;
  };
  const CHECKLIST = [
    "Accès aux locaux et badge",
    "Configuration du poste de travail",
    "Création des accès Git, Figma & VPN",
    "Réunion de cadrage avec le tuteur",
    "Présentation de l'équipe et des outils",
    "Signature de la convention de stage",
    "Plan d'intégration validé avec le tuteur",
  ];
  const internsSeed: InternSeed[] = [
    { name: "Rachidatou Balogoun", matricule: "IFRI-2026-089", university: "UAC / IFRI", position: "Stagiaire Développeur Frontend React (Next.js)", offerId: OFF.fe, tutorId: serge, currentWeek: 16, totalWeeks: 24, status: "ACTIF", vivier: false, onboardingDone: 7 },
    { name: "Ulrich Adjovi", matricule: "ENEAM-2025-041", university: "UAC / ENEAM", position: "Stagiaire Développeur Frontend React (Next.js)", offerId: OFF.fe, tutorId: serge, currentWeek: 12, totalWeeks: 24, status: "ACTIF", vivier: false, onboardingDone: 7 },
    { name: "Grâce Hounsou", matricule: "IFRI-2026-112", university: "UAC / IFRI", position: "Stagiaire Développeur Backend Node.js & API", offerId: OFF.be, tutorId: aicha, currentWeek: 23, totalWeeks: 24, status: "ACTIF", vivier: true, onboardingDone: 7 },
    { name: "Marius Kpodjedo", matricule: "EPAC-2025-077", university: "UAC / EPAC", position: "Stagiaire Développeur Backend Node.js & API", offerId: OFF.be, tutorId: aicha, currentWeek: 8, totalWeeks: 24, status: "ACTIF", vivier: false, onboardingDone: 7 },
    { name: "Sylvia Aguemon", matricule: "IFRI-2026-045", university: "UAC / IFRI", position: "Stagiaire Data Analyst (Power BI & SQL)", offerId: OFF.da, tutorId: marcelle, currentWeek: 5, totalWeeks: 12, status: "ACTIF", vivier: false, onboardingDone: 6 },
    { name: "Prince Dangnibo", matricule: "UNILOCA-2025-018", university: "Université de Lokossa", position: "Stagiaire Data Analyst (Power BI & SQL)", offerId: OFF.da, tutorId: marcelle, currentWeek: 10, totalWeeks: 12, status: "ACTIF", vivier: false, onboardingDone: 7 },
    { name: "Emmanuelle Tossou", matricule: "ISMA-2025-233", university: "ISM Adonaï", position: "Stagiaire Chargé(e) de Communication Digitale", offerId: OFF.com, tutorId: marcelle, currentWeek: 3, totalWeeks: 12, status: "ACTIF", vivier: false, onboardingDone: 4 },
    { name: "Jordy Amoussou", matricule: "IPD-2026-056", university: "UAC / IPD", position: "Stagiaire Chargé(e) de Communication Digitale", offerId: OFF.com, tutorId: marcelle, currentWeek: 2, totalWeeks: 12, status: "ACTIF", vivier: false, onboardingDone: 3 },
    { name: "Chimène Attolou", matricule: "IFRI-2026-201", university: "UAC / IFRI", position: "Stagiaire Développeur Frontend React (Next.js)", offerId: OFF.fe, tutorId: serge, currentWeek: 22, totalWeeks: 24, status: "ACTIF", vivier: true, onboardingDone: 7 },
    { name: "Wilfried Sagbo", matricule: "UNILOCA-2025-062", university: "Université de Lokossa", position: "Stagiaire Développeur Backend Node.js & API", offerId: OFF.be, tutorId: aicha, currentWeek: 14, totalWeeks: 24, status: "ACTIF", vivier: false, onboardingDone: 7 },
    { name: "Pélagie Zinsou", matricule: "EPAC-2026-019", university: "UAC / EPAC", position: "Stagiaire Data Analyst (Power BI & SQL)", offerId: OFF.da, tutorId: marcelle, currentWeek: 6, totalWeeks: 12, status: "ACTIF", vivier: false, onboardingDone: 6 },
    { name: "Rufin Ahounou", matricule: "CERFOLA-2026-034", university: "CERFOLA / CRS", position: "Stagiaire Chargé(e) de Communication Digitale", offerId: OFF.com, tutorId: marcelle, currentWeek: 4, totalWeeks: 12, status: "ACTIF", vivier: false, onboardingDone: 5 },
    { name: "Josiane Ahissou", matricule: "ENEAM-2024-118", university: "UAC / ENEAM", position: "Stagiaire DevOps & Sécurité Cloud", offerId: OFF.ops, tutorId: aicha, currentWeek: 0, totalWeeks: 24, status: "TERMINE", vivier: true, onboardingDone: 7, startWeeksAgo: 30 },
    { name: "Kelly Tchibozo", matricule: "IFRI-2024-095", university: "UAC / IFRI", position: "Stagiaire DevOps & Sécurité Cloud", offerId: OFF.ops, tutorId: aicha, currentWeek: 0, totalWeeks: 24, status: "TERMINE", vivier: true, onboardingDone: 7, startWeeksAgo: 34 },
    { name: "Fabrice N'Da", matricule: "EPAC-2024-133", university: "UAC / EPAC", position: "Stagiaire Développeur Backend Node.js & API", offerId: OFF.be, tutorId: serge, currentWeek: 0, totalWeeks: 24, status: "TERMINE", vivier: false, onboardingDone: 7, startWeeksAgo: 28 },
  ];

  const emailOf = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim().split(/\s+/).slice(0, 2).join(".") + "@etu.uac.bj";

  const studentProfiles: Record<string, string> = {}; // nom → StudentProfile.id
  for (const s of internsSeed) {
    const acronym = acronymOf(s.university);
    const user = await db.user.create({
      data: { email: emailOf(s.name), passwordHash: await hashPassword(DEMO_PASSWORD), fullName: s.name, role: "STUDENT", profileCompleted: true },
    });
    const profile = await db.studentProfile.create({
      data: {
        userId: user.id,
        matricule: s.matricule,
        universityId: universities[acronym],
        fieldOfStudy: fieldFor(s.position, acronym),
        level: pick(["Licence 3", "Master 1", "Master 2"], s.matricule.length),
        phone: "+229 97 12 34 56",
        skills: skillSet(s.position),
      },
    });
    studentProfiles[s.name] = profile.id;
  }

  /* --------------------------- Stagiaires -------------------------------- */
  console.log("Création des stagiaires, candidatures acceptées et ponts auth…");
  const internIds: Record<string, string> = {};
  const internMeta: Record<string, { startDate: Date; endDate: Date; week: number; totalWeeks: number; offerId: string }> = {};
  for (const s of internsSeed) {
    const weeksAgo = s.startWeeksAgo ?? s.currentWeek;
    const startDate = addDays(NOW, -(weeksAgo * 7) + 3);
    const endDate = addDays(startDate, s.totalWeeks * 7);
    const checklist = CHECKLIST.map((label, i) =>
      `${i + 1}|${label}|${i < s.onboardingDone ? "[x]" : "[ ]"}`,
    ).join("\n");
    const intern = await db.intern.create({
      data: {
        companyId: kkiapay.id, name: s.name, matricule: s.matricule, university: s.university,
        email: emailOf(s.name), position: s.position, tutorId: s.tutorId,
        startDate, endDate, totalWeeks: s.totalWeeks, status: s.status,
        vivierTag: s.vivier, onboarding: checklist,
        studentId: studentProfiles[s.name],
        universityId: universities[acronymOf(s.university)],
      },
    });
    internIds[s.name] = intern.id;
    internMeta[s.name] = { startDate, endDate, week: s.currentWeek, totalWeeks: s.totalWeeks, offerId: s.offerId };
    await db.candidature.create({
      data: {
        companyId: kkiapay.id, offerId: s.offerId, studentId: studentProfiles[s.name], studentName: s.name, matricule: s.matricule,
        university: s.university, email: emailOf(s.name), phone: "+229 97 12 34 56",
        cvSummary: `Étudiant(e) en ${fieldFor(s.position, acronymOf(s.university))} à ${s.university}. Projets académiques orientés ${s.position.includes("Frontend") ? "développement web frontend" : s.position.includes("Backend") ? "systèmes et API" : s.position.includes("Data") ? "analyse de données" : s.position.includes("Communication") ? "communication digitale" : "DevOps et cloud"}, motivé(e) par la fintech africaine.`,
        coverLetter: "Madame, Monsieur,\n\nActuellement en formation à " + s.university + ", je souhaite rejoindre KKiaPay pour transformer mes acquis académiques en compétences concrètes au sein d'une équipe produit ambitieuse. Rigoureux(se) et curieux(se), je suis prêt(e) à contribuer dès la première semaine.\n\nCordialement,\n" + s.name,
        status: "ACCEPTEE",
        aiScore: Math.floor(70 + rnd() * 25),
        aiQuestions: "",
        createdAt: addDays(NOW, -(weeksAgo * 7 + 18)),
      },
    });
  }

  /* -------------------- Autres candidatures (ATS) ------------------------- */
  console.log("Création des candidatures en pipeline…");
  const extraNames = [
    "Aimée Lagnide", "Bertrand Sossou", "Carine Adjallé", "Darius Hounsou", "Edwige Dansou",
    "Fernand Alassane", "Gislaine Kpossou", "Hervé Atinkpahoun", "Irina Sodjinou", "Joël Aholou",
    "Katia Adanhoumè", "Léandre Tchakpo", "Mireille Hounkpatin", "Nestor Adande", "Odile Segla",
    "Pacôme Lègbà", "Quentine Dossou-Yovo", "Roland Agbodjan", "Sabine Tognide", "Thierry Azonnankpon",
    "Ursule Hlangnon", "Victor Bocco", "Wendy Koudjo", "Xavier Bio-Yerima",
    "Yolande Adihou", "Zéphirin Dako", "Adjoavi Goudjo", "Brice Houngbedji", "Chantal Amoussouga",
    "Delice Oloulé", "Éric Kikan", "Fidèle Wanvoegbe", "Ginette Zounon", "Hyacinthe Noukpo",
    "Ismaël Adjo", "Joséphine Adjinacou", "Kossi Akakpo", "Léa Tossounon", "Modeste Kinkpé",
    "Nadège Salami", "Olivier Tokponto", "Perpétue Adjovi", "Renaud Zannou", "Stéphanie Aïvo",
    "Trophime Gbedo", "Vanessa Doumbè", "Yannick Homavo", "Bernadette Ikpo", "Cédrick Gantois",
    "Divine Sekpe", "Eudes Lokossou", "Fleur Adjissé", "Grégory Ayélé", "Hortense Akpinson",
  ];
  const unis = ["UAC / IFRI", "UAC / ENEAM", "UAC / EPAC", "Université de Lokossa", "ISM Adonaï", "UAC / IPD", "CERFOLA / CRS"];
  const uniPrefix: Record<string, string> = {
    "UAC / IFRI": "IFRI", "UAC / ENEAM": "ENEAM", "UAC / EPAC": "EPAC",
    "Université de Lokossa": "UNILOCA", "ISM Adonaï": "ISMA", "UAC / IPD": "IPD", "CERFOLA / CRS": "CERFOLA",
  };
  const cvByOffer: Record<string, string> = {
    [OFF.fe]: "Portfolio de projets React (site e-commerce, app météo). Confortable avec TypeScript, Tailwind CSS et Git. A déjà consommé des API REST en cours.",
    [OFF.be]: "Projets backend en Node.js/Express avec MongoDB et PostgreSQL. S'intéresse à l'architecture REST, aux tests et à Docker.",
    [OFF.da]: "Maîtrise de SQL et d'Excel, projet de dashboard Power BI sur données de ventes. Notions de Python/Pandas.",
    [OFF.com]: "Gère les réseaux d'une association étudiante (3k abonnés). Créative, à l'aise avec Canva et la rédaction web.",
    [OFF.ops]: "Curieux(se) d'infrastructure cloud, certificat AWS Academy en cours, à l'aise avec Linux et Git.",
  };
  const plans: Array<{ status: string; count: number; offers: string[]; dayOffsets: number[] }> = [
    { status: "NOUVELLE", count: 19, offers: [OFF.fe, OFF.fe, OFF.fe, OFF.fe, OFF.fe, OFF.fe, OFF.be, OFF.be, OFF.be, OFF.be, OFF.be, OFF.da, OFF.da, OFF.da, OFF.com, OFF.com, OFF.com, OFF.com, OFF.com], dayOffsets: [1, 2, 3, 4, 5, 7, 9, 11, 13, 15, 18, 22, 25, 1, 3, 6, 8, 12, 14] },
    { status: "PRESELECTIONNEE", count: 12, offers: [OFF.fe, OFF.fe, OFF.fe, OFF.fe, OFF.be, OFF.be, OFF.be, OFF.da, OFF.da, OFF.com, OFF.com, OFF.com], dayOffsets: [10, 14, 18, 21, 26, 30, 34, 12, 17, 9, 15, 24] },
    { status: "ENTRETIEN_PLANIFIE", count: 8, offers: [OFF.fe, OFF.fe, OFF.fe, OFF.be, OFF.be, OFF.da, OFF.com, OFF.com], dayOffsets: [8, 12, 19, 22, 28, 16, 11, 21] },
    { status: "OFFRE_ENVOYEE", count: 6, offers: [OFF.fe, OFF.fe, OFF.be, OFF.da, OFF.com, OFF.com], dayOffsets: [24, 31, 38, 27, 33, 44] },
    { status: "REFUSEE", count: 5, offers: [OFF.fe, OFF.be, OFF.da, OFF.com, OFF.ops], dayOffsets: [45, 60, 78, 92, 120] },
  ];
  let nameIdx = 0;
  for (const plan of plans) {
    for (let i = 0; i < plan.count; i++) {
      const name = extraNames[nameIdx % extraNames.length];
      nameIdx++;
      const university = unis[nameIdx % unis.length];
      const offerId = pick(plan.offers, i + nameIdx);
      const score = plan.status === "NOUVELLE" ? null : Math.floor(55 + rnd() * 40);
      await db.candidature.create({
        data: {
          companyId: kkiapay.id, offerId,
          studentName: name,
          matricule: `${uniPrefix[university]}-${2024 + (nameIdx % 3)}-${String(100 + ((nameIdx * 13) % 900)).padStart(3, "0")}`,
          university,
          email: emailOf(name), phone: "+229 96 11 22 33",
          cvSummary: cvByOffer[offerId] ?? "CV à consulter.",
          coverLetter: null,
          status: plan.status,
          interviewAt: plan.status === "ENTRETIEN_PLANIFIE" ? addDays(NOW, 2 + (i % 8)) : null,
          aiScore: score,
          aiQuestions: "",
          createdAt: addDays(NOW, -pick(plan.dayOffsets, i)),
        },
      });
    }
  }

  /* ------------------------- Tâches & suivis ------------------------------ */
  console.log("Création des tâches, présences et journaux…");
  const taskTemplates: Record<string, string[]> = {
    "Stagiaire Développeur Frontend React (Next.js)": [
      "Intégrer l'écran « Historique des transactions »",
      "Corriger les bugs UI du widget de paiement (tickets #341, #352)",
      "Écrire les tests unitaires du composant CheckoutForm",
    ],
    "Stagiaire Développeur Backend Node.js & API": [
      "Développer l'endpoint GET /v1/merchants/{id}/settlements",
      "Optimiser la requête de reporting mensuel (Explain & index)",
      "Documenter les endpoints webhook dans OpenAPI",
    ],
    "Stagiaire Data Analyst (Power BI & SQL)": [
      "Construire le dashboard « Taux de réussite par opérateur »",
      "Nettoyer le jeu de données des transactions de novembre",
      "Préparer le rapport mensuel d'insights (pptx)",
    ],
    "Stagiaire Chargé(e) de Communication Digitale": [
      "Planifier 3 publications LinkedIn (témoignages marchands)",
      "Créer le visuel « Comment payer avec KKiaPay » (Canva)",
      "Analyser les statistiques de la newsletter d'octobre",
    ],
    "Stagiaire DevOps & Sécurité Cloud": [
      "Automatiser le pipeline CI/CD du service webhook",
      "Corriger les alertes de scan OWASP (priorité haute)",
    ],
  };
  const journalNames = ["Grâce Hounsou", "Prince Dangnibo", "Rachidatou Balogoun", "Sylvia Aguemon", "Marius Kpodjedo"];
  for (const s of internsSeed) {
    const internId = internIds[s.name];
    const meta = internMeta[s.name];
    if (s.status === "ACTIF" && taskTemplates[s.position]) {
      const templates = taskTemplates[s.position];
      await db.internshipTask.create({ data: { internId, title: templates[0], description: "Priorité haute — revue avec le tuteur vendredi.", week: meta.week, status: "EN_COURS", createdAt: addDays(NOW, -6) } });
      await db.internshipTask.create({ data: { internId, title: templates[1], description: "Après validation de la tâche en cours.", week: meta.week, status: "A_FAIRE", createdAt: addDays(NOW, -4) } });
      await db.internshipTask.create({ data: { internId, title: templates[2], description: "", week: Math.max(1, meta.week - 1), status: "VALIDE", aiSuggested: true, createdAt: addDays(NOW, -12) } });
    }
    if (s.status === "ACTIF" && meta.week >= 2) {
      await db.presenceSheet.create({
        data: {
          internId, periodLabel: `Semaine ${meta.week - 1} (semaine dernière)`,
          daysPresent: 5, status: "VALIDEE", submittedAt: addDays(NOW, -(meta.week >= 4 ? 7 : 9)),
        },
      });
    }
    if (s.status === "ACTIF" && meta.week >= 4) {
      await db.presenceSheet.create({
        data: {
          internId, periodLabel: `Semaine ${meta.week} (en cours)`,
          daysPresent: 4 + (meta.week % 2), status: "A_VALIDER", submittedAt: addDays(NOW, -2),
        },
      });
    }
    if (s.status === "ACTIF" && journalNames.includes(s.name)) {
      await db.weeklyJournal.create({
        data: {
          internId, week: meta.week - 1,
          content: `Semaine ${meta.week - 1} — ${s.position.includes("Frontend") ? "J'ai finalisé l'intégration de l'écran demandé et corrigé deux bugs d'affichage sur mobile. J'ai appris à utiliser les hooks React de manière plus optimale." : s.position.includes("Backend") ? "J'ai livré l'endpoint planifié, écrit les tests Postman et investigué un problème de latence sur la base de données avec mon tuteur." : s.position.includes("Data") ? "J'ai avancé sur la modélisation Power BI et produit les premiers graphiques de taux de réussite. Prochaine étape : automatiser l'actualisation des données." : "J'ai planifié et publié les contenus de la semaine, et préparé le visuel du webinaire de décembre. Engagement en hausse de 12 %."} Difficultés : ${meta.week > 6 ? "gestion du temps entre tâches techniques et réunions." : "prise en main des outils internes, résolue avec l'aide de l'équipe."} Objectifs semaine ${meta.week} : avancer sur les tâches assignées et demander un retour sur ma méthode de travail.`,
        },
      });
    }
  }

  /* --------------------------- Conventions -------------------------------- */
  console.log("Création des conventions…");
  let convNum = 41;
  for (const s of internsSeed) {
    const meta = internMeta[s.name];
    await db.convention.create({
      data: {
        companyId: kkiapay.id, internId: internIds[s.name], reference: `CONV-${meta.startDate.getFullYear()}-${String(convNum++).padStart(3, "0")}`,
        studentName: s.name, university: s.university, position: s.position, status: "SIGNEE",
        signedStudent: true, signedCompany: true, signedUniversity: true,
        startDate: meta.startDate, endDate: meta.endDate,
      },
    });
  }
  const pending = [
    { ref: `CONV-2026-${String(convNum++).padStart(3, "0")}`, name: "Bénédienne Kpadonou", uni: "UAC / IFRI", pos: "Stagiaire Développeur Frontend React (Next.js)", s: true, c: false, u: false },
    { ref: `CONV-2026-${String(convNum++).padStart(3, "0")}`, name: "Aurélien Gbaguidi", uni: "UAC / ENEAM", pos: "Stagiaire Développeur Backend Node.js & API", s: false, c: true, u: false },
    { ref: `CONV-2026-${String(convNum++).padStart(3, "0")}`, name: "Naïma Latoundji", uni: "UAC / EPAC", pos: "Stagiaire Data Analyst (Power BI & SQL)", s: true, c: true, u: false },
  ];
  for (const p of pending) {
    await db.candidature.create({
      data: {
        companyId: kkiapay.id, offerId: OFF.fe, studentName: p.name, matricule: "IFRI-2026-310",
        university: p.uni, email: emailOf(p.name), cvSummary: "Dossier validé par le comité d'intégration, en attente des signatures de la convention tripartite.",
        status: "OFFRE_ENVOYEE", aiScore: 82, aiQuestions: "", createdAt: addDays(NOW, -30),
      },
    });
    await db.convention.create({
      data: {
        companyId: kkiapay.id, reference: p.ref, studentName: p.name, university: p.uni,
        position: p.pos, status: "EN_ATTENTE", signedStudent: p.s, signedCompany: p.c, signedUniversity: p.u,
        startDate: addDays(NOW, 21), endDate: addDays(NOW, 21 + 24 * 7),
      },
    });
  }

  /* ------------------------ Évaluations & attestation ---------------------- */
  console.log("Création des évaluations & de l'attestation…");
  const evals: Array<{ name: string; t: number; p: number; a: number; e: number; txt: string }> = [
    { name: "Josiane Ahissou", t: 5, p: 5, a: 4, e: 5, txt: "Josiane a dépassé les attentes sur l'automatisation de nos pipelines CI/CD : le temps de déploiement a baissé de 60 % grâce à son travail. Autonome, rigoureuse et force de proposition, elle laisse derrière elle une documentation impeccable. Nous serions ravis de l'accueillir en CDI." },
    { name: "Kelly Tchibozo", t: 4, p: 4, a: 5, e: 4, txt: "Kelly a réalisé un audit de sécurité complet de notre plateforme et corrigé 14 vulnérabilités classées OWASP. Très grande capacité d'autonomie. Communication à renforcer avec les équipes métier, sans que cela n'ait impacté la qualité des livrables." },
    { name: "Fabrice N'Da", t: 4, p: 3, a: 3, e: 4, txt: "Fabrice a contribué de manière solide au backend de reporting. Les premières semaines ont demandé un accompagnement soutenu ; la deuxième partie du stage a montré une nette progression technique. Ponctualité à surveiller sur le dernier mois, corrigée après point avec le tuteur." },
  ];
  for (const ev of evals) {
    await db.evaluation.create({
      data: { internId: internIds[ev.name], technique: ev.t, ponctualite: ev.p, autonomie: ev.a, espritEquipe: ev.e, appreciation: ev.txt, finalized: true },
    });
    if (ev.name === "Fabrice N'Da") {
      const intern = internsSeed.find((s) => s.name === ev.name);
      if (!intern) throw new Error("Stagiaire Fabrice N'Da introuvable dans le seed");
      await db.attestation.create({
        data: {
          internId: internIds[ev.name], reference: "ATT-2025-007",
          content: attestationContent({
            companyName: "KKiaPay",
            city: "Cotonou",
            studentName: ev.name,
            matricule: intern.matricule,
            university: intern.university,
            position: intern.position,
            startDate: internMeta[ev.name].startDate,
            endDate: internMeta[ev.name].endDate,
            tutorName: "Marcelle Ahouansou",
          }),
        },
      });
    }
  }
  await db.evaluation.create({
    data: { internId: internIds["Grâce Hounsou"], technique: 4, ponctualite: 5, autonomie: 4, espritEquipe: 4, appreciation: "", finalized: false },
  });

  /* ---------------------------- Vérification ------------------------------- */
  const counts = {
    users: await db.user.count(),
    universites: await db.universityProfile.count(),
    etudiants: await db.studentProfile.count(),
    offresPUBLIEE: await db.offer.count({ where: { status: "PUBLIEE" } }),
    candidatures: await db.candidature.count(),
    stagiairesACTIF: await db.intern.count({ where: { status: "ACTIF" } }),
    stagiairesTERMINE: await db.intern.count({ where: { status: "TERMINE" } }),
    conventionsEN_ATTENTE: await db.convention.count({ where: { status: "EN_ATTENTE" } }),
    pontsInternStudent: await db.intern.count({ where: { studentId: { not: null } } }),
  };
  console.log("Seed terminé :", JSON.stringify(counts, null, 2));
  if (counts.candidatures !== 68 || counts.stagiairesACTIF !== 12 || counts.offresPUBLIEE !== 4 || counts.conventionsEN_ATTENTE !== 3) {
    throw new Error("KPI cibles non atteints — vérifiez les données du seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
