/**
 * Auto-seed « intelligent » du Dashboard Établissement StageTrack.
 * ---------------------------------------------------------------
 * Garantit qu'une université de démonstration complète existe toujours
 * (INSTI Lokossa) : Admin Université, départements + Chefs de Département
 * (comptes User + UniversityMember), 15 étudiants rattachés (INSTI-2026-001
 * à 015), stages actifs/terminés avec conventions au fil du circuit à 4 étapes,
 * tâches, présences, journaux, évaluations et attestations.
 *
 * Idempotent : chaque sous-étape vérifie l'existence avant création.
 * Sur la machine de l'utilisateur, la base cible est Neon (PostgreSQL).
 */
import { db } from "@/lib/db";
import { attestationContent } from "@/lib/entreprise-templates";
import { hashPassword } from "@/lib/password";

export const INSTI_ADMIN_EMAIL = "stages@insti-lokossa.bj";
export const INSTI_ACRONYM = "INSTI";
/** Mot de passe temporaire attribué aux Chefs de Département créés par la Direction. */
export const HEAD_TEMP_PASSWORD = "StageTrack@2026!";
/** Compte Maître de Mémoire de démonstration (encadrement académique). */
export const SUPERVISOR_EMAIL = "memoire.gei@insti-lokossa.bj";
export const SUPERVISOR_PASSWORD = "StageTrack@2026!";
/** Compte Tuteur / Maître de Stage de démonstration (KKiaPay). */
export const TUTOR_EMAIL = "serge.dossou@kkiapay.me";
export const TUTOR_PASSWORD = "StageTrack@2026!";
/** Charge maximale d'encadrement d'un Maître de Mémoire. */
export const SUPERVISOR_MAX_WORKLOAD = 6;

const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86400000);

export interface EtabDepartmentRef {
  id: string;
  name: string;
  code: string;
  headName: string | null;
}

export interface EtabSeedRefs {
  universityId: string;
  universityName: string;
  universityAcronym: string;
  adminMemberId: string;
  adminName: string;
  departments: EtabDepartmentRef[];
}

/* ============================== DÉFINITIONS ============================== */

interface DepartmentSeed {
  code: string;
  name: string;
  specialties: string[];
  head: { name: string; email: string };
}

const DEPARTMENTS_SEED: DepartmentSeed[] = [
  {
    code: "GEI",
    name: "Génie Électrique et Informatique",
    specialties: ["Informatique Industrielle", "Télécommunications", "Réseaux", "Électrotechnique"],
    head: { name: "Nadège Ahouansou", email: "chef.gei@insti-lokossa.bj" },
  },
  {
    code: "GC",
    name: "Génie Civil",
    specialties: ["Bâtiment & Travaux Publics", "Hydraulique", "Topographie"],
    head: { name: "Firmin Adounkè", email: "chef.gc@insti-lokossa.bj" },
  },
  {
    code: "GMP",
    name: "Génie Mécanique et Productique",
    specialties: ["Maintenance Industrielle", "Productique", "Énergétique"],
    head: { name: "Célestine Koudjo", email: "chef.gmp@insti-lokossa.bj" },
  },
  {
    code: "GL",
    name: "Génie Logiciel",
    specialties: ["Génie Logiciel", "Data & IA", "Cloud & DevOps"],
    head: { name: "Marcelin Dossa", email: "chef.gl@insti-lokossa.bj" },
  },
];

/** Départements également disponibles côté IFRI (cascade profil étudiant). */
const IFRI_DEPARTMENTS_SEED: DepartmentSeed[] = [
  {
    code: "GL",
    name: "Génie Logiciel",
    specialties: ["Génie Logiciel", "Data & IA", "Cloud & DevOps"],
    head: { name: "Éric Adjovi", email: "chef.gl@ifri.uac.bj" },
  },
  {
    code: "IG",
    name: "Informatique de Gestion",
    specialties: ["Systèmes d'Information", "Business Intelligence"],
    head: { name: "Aline Bankolé", email: "chef.ig@ifri.uac.bj" },
  },
];

interface StudentSeed {
  matricule: string;
  name: string;
  email: string;
  phone: string;
  deptCode: string;
  specialty: string;
  level: string;
  skills: string[];
  /** Configuration du stage : semaine atteinte, entreprise & position. */
  stage?: {
    position: string;
    companyName: "KKiaPay" | "GéoBénin Ingénierie" | "Atelier Industriel Lokossa";
    currentWeek: number;
    terminé?: boolean;
    /** État du circuit de convention : "visa" (attente chef), "signature" (attente direction), "signee". */
    convention: "visa" | "signature" | "signee";
  };
}

const STUDENTS_SEED: StudentSeed[] = [
  {
    matricule: "INSTI-2026-001", name: "Rodrigue Ahouandjinou", email: "rodrigue.ahouandjinou@insti-lokossa.bj",
    phone: "+229 97 12 34 56", deptCode: "GEI", specialty: "Réseaux", level: "Master 1",
    skills: ["Linux", "Docker", "Cisco", "Sécurité OWASP", "Python"],
    stage: { position: "Stagiaire DevOps & Sécurité Cloud", companyName: "KKiaPay", currentWeek: 8, convention: "visa" },
  },
  {
    matricule: "INSTI-2026-002", name: "Grâce Hounkpe", email: "grace.hounkpe@insti-lokossa.bj",
    phone: "+229 96 22 41 87", deptCode: "GEI", specialty: "Informatique Industrielle", level: "Licence 3",
    skills: ["React", "TypeScript", "Arduino", "Figma"],
    stage: { position: "Stagiaire Développeur Frontend React (Next.js)", companyName: "KKiaPay", currentWeek: 5, convention: "signature" },
  },
  {
    matricule: "INSTI-2026-003", name: "Sylvain Adjonou", email: "sylvain.adjonou@insti-lokossa.bj",
    phone: "+229 95 03 77 21", deptCode: "GC", specialty: "Bâtiment & Travaux Publics", level: "Master 2",
    skills: ["AutoCAD", "Revit", "MS Project", "Topographie"],
    stage: { position: "Stagiaire Assistant Conducteur de Travaux", companyName: "GéoBénin Ingénierie", currentWeek: 7, convention: "signee" },
  },
  {
    matricule: "INSTI-2026-004", name: "Marius Amoussou", email: "marius.amoussou@insti-lokossa.bj",
    phone: "+229 94 55 10 08", deptCode: "GMP", specialty: "Maintenance Industrielle", level: "Master 1",
    skills: ["GMAO", "Automatisme", "Hydraulique", "Excel"],
    stage: { position: "Stagiaire Maintenance Industrielle", companyName: "Atelier Industriel Lokossa", currentWeek: 6, convention: "signature" },
  },
  {
    matricule: "INSTI-2026-005", name: "Christelle Ayélé", email: "christelle.ayele@insti-lokossa.bj",
    phone: "+229 97 88 63 02", deptCode: "GEI", specialty: "Télécommunications", level: "Master 2",
    skills: ["Node.js", "PostgreSQL", "API REST", "Docker", "Git"],
    stage: { position: "Stagiaire Développeur Backend Node.js & API", companyName: "KKiaPay", currentWeek: 9, convention: "visa" },
  },
  {
    matricule: "INSTI-2026-006", name: "Ulrich Zinsou", email: "ulrich.zinsou@insti-lokossa.bj",
    phone: "+229 96 74 20 15", deptCode: "GL", specialty: "Data & IA", level: "Master 2",
    skills: ["SQL", "Power BI", "Python", "Analyse de données"],
    stage: { position: "Stagiaire Data Analyst (Power BI & SQL)", companyName: "KKiaPay", currentWeek: 7, convention: "signee" },
  },
  {
    matricule: "INSTI-2026-007", name: "Josiane Agbodjan", email: "josiane.agbodjan@insti-lokossa.bj",
    phone: "+229 95 61 48 33", deptCode: "GL", specialty: "Génie Logiciel", level: "Licence 3",
    skills: ["Java", "Selenium", "Git", "Tests unitaires"],
    stage: { position: "Stagiaire Testeur & QA Mobile", companyName: "KKiaPay", currentWeek: 12, terminé: true, convention: "signee" },
  },
  {
    matricule: "INSTI-2026-008", name: "Éric Tossou", email: "eric.tossou@insti-lokossa.bj",
    phone: "+229 94 30 92 76", deptCode: "GEI", specialty: "Électrotechnique", level: "Master 1",
    skills: ["AutoCAD Electrical", "Mesures & Instrumentation", "Excel"],
    stage: { position: "Stagiaire Électricité Bâtiment", companyName: "GéoBénin Ingénierie", currentWeek: 12, terminé: true, convention: "signee" },
  },
  {
    matricule: "INSTI-2026-009", name: "Pélagie Dohou", email: "pelagie.dohou@insti-lokossa.bj",
    phone: "+229 97 05 66 90", deptCode: "GC", specialty: "Hydraulique", level: "Master 1",
    skills: ["QGIS", "Hydrologie", "AutoCAD", "Rédaction technique"],
  },
  {
    matricule: "INSTI-2026-010", name: "Aristide Kpassou", email: "aristide.kpassou@insti-lokossa.bj",
    phone: "+229 96 18 53 44", deptCode: "GMP", specialty: "Productique", level: "Licence 3",
    skills: ["SolidWorks", "Usinage CN", "Lean Manufacturing"],
  },
  {
    matricule: "INSTI-2026-011", name: "Sabine Lokonon", email: "sabine.lokonon@insti-lokossa.bj",
    phone: "+229 95 42 27 18", deptCode: "GEI", specialty: "Réseaux", level: "Licence 3",
    skills: ["Cisco Packet Tracer", "Configuration réseau", "Windows Server"],
  },
  {
    matricule: "INSTI-2026-012", name: "Hervé Koudjodji", email: "herve.koudjodji@insti-lokossa.bj",
    phone: "+229 94 71 35 62", deptCode: "GL", specialty: "Cloud & DevOps", level: "Master 1",
    skills: ["Docker", "CI/CD", "AWS", "Bash"],
  },
  {
    matricule: "INSTI-2026-013", name: "Inès Tossavi", email: "ines.tossavi@insti-lokossa.bj",
    phone: "+229 96 09 84 51", deptCode: "GC", specialty: "Topographie", level: "Licence 3",
    skills: ["Topographie", "GPS différentiel", "Covadis"],
  },
  {
    matricule: "INSTI-2026-014", name: "Blaise Sagbo", email: "blaise.sagbo@insti-lokossa.bj",
    phone: "+229 95 77 14 09", deptCode: "GMP", specialty: "Énergétique", level: "Master 2",
    skills: ["Thermodynamique", "Efficacité énergétique", "MATLAB"],
  },
  {
    matricule: "INSTI-2026-015", name: "Rachelle Agboton", email: "rachelle.agboton@insti-lokossa.bj",
    phone: "+229 97 46 91 83", deptCode: "GEI", specialty: "Informatique Industrielle", level: "Master 2",
    skills: ["Automatisme", "PLC Siemens", "Supervision SCADA"],
  },
];

/* ============================== HELPERS ============================== */

async function ensureUser(
  email: string,
  fullName: string,
  passwordPlain: string,
  role: "UNIVERSITY" | "STUDENT" = "UNIVERSITY",
) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    // Auto-réparation : un compte créé par une exécution précédente avec le
    // mauvais rôle (ex. étudiants) est repositionné au bon rôle.
    if (existing.role !== role) {
      await db.user.update({ where: { id: existing.id }, data: { role, profileCompleted: true } });
    }
    return existing.id;
  }
  const created = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(passwordPlain),
      fullName,
      role,
      // Comptes de démonstration établis : onboarding déjà complété.
      profileCompleted: true,
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureCompanyMinimal(name: string, sector: string, city: string, tutorName: string): Promise<string> {
  const existing = await db.company.findUnique({ where: { name }, select: { id: true } });
  if (existing) return existing.id;
  const company = await db.company.create({
    data: {
      name,
      sector,
      city,
      description: `Entreprise partenaire StageTrack — accueille des stagiaires des départements techniques de l'INSTI Lokossa (${sector}).`,
    },
    select: { id: true },
  });
  await db.teamMember.create({
    data: {
      companyId: company.id,
      name: tutorName,
      email: `${tutorName.toLowerCase().replace(/[^a-z]+/g, ".")}@${name.toLowerCase().replace(/[^a-z]+/g, "")}.bj`,
      role: "TUTEUR",
      phone: "+229 97 00 00 00",
    },
  });
  return company.id;
}

interface CompanyRef {
  id: string;
  tutorId: string;
  tutorName: string;
}

async function ensureCompanies(): Promise<Record<StudentSeed["stage"] extends undefined ? never : string, CompanyRef>> {
  const refs: Record<string, CompanyRef> = {};
  for (const [name, sector, city, tutorName] of [
    ["KKiaPay", "Fintech / Paiements mobiles", "Cotonou", null],
    ["GéoBénin Ingénierie", "BTP & Génie Civil", "Cotonou", "Anicet Gbaguidi"],
    ["Atelier Industriel Lokossa", "Maintenance & Productique", "Lokossa", "Valentin Houngbo"],
  ] as const) {
    const companyId = name === "KKiaPay"
      ? (await db.company.findUnique({ where: { name: "KKiaPay" }, select: { id: true } }))?.id ?? (await ensureCompanyMinimal(name, sector, city, "Serge Dossou"))
      : await ensureCompanyMinimal(name, sector, city, tutorName);
    const tutor = await db.teamMember.findFirst({
      where: { companyId, role: "TUTEUR", active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    if (!tutor) throw new Error(`Tuteur introuvable pour ${name}`);
    refs[name] = { id: companyId, tutorId: tutor.id, tutorName: tutor.name };
  }
  return refs;
}

const ONBOARDING_CHECKLIST = [
  "Accès aux locaux et badge",
  "Configuration du poste de travail",
  "Réunion de cadrage avec le tuteur",
  "Signature de la convention de stage",
  "Plan d'intégration validé avec le tuteur",
]
  .map((label, i) => `${i + 1}|${label}|[x]`)
  .join("\n");

function taskSeed(position: string, week: number): { title: string; description: string; week: number; status: string }[] {
  const current = week;
  return [
    { title: "Étude documentaire du domaine", description: `Cadrage du sujet « ${position} » avec le tuteur et synthèse documentaire.`, week: Math.max(current - 4, 1), status: "DONE" },
    { title: "Premier livrable technique", description: "Mise en place de l'environnement et premier livrable validé en revue hebdomadaire.", week: Math.max(current - 3, 1), status: "DONE" },
    { title: "Mission en cours", description: "Réalisation de la mission principale de la semaine en binôme avec le tuteur.", week: Math.max(current - 1, 1), status: "IN_PROGRESS" },
    { title: "Livrable de la semaine en cours", description: "Finalisation du livrable attendu pour la revue de fin de semaine.", week: current, status: "IN_PROGRESS" },
    { title: "Préparation de la revue hebdomadaire", description: "Support de présentation des travaux pour la réunion hebdomadaire.", week: current, status: "TODO" },
  ];
}

function journalSeed(week: number, position: string): { week: number; content: string }[] {
  const entries: { week: number; content: string }[] = [];
  for (let w = Math.max(week - 2, 1); w <= Math.max(week - 1, 1); w++) {
    entries.push({
      week: w,
      content:
        `Semaine ${w} — travaux sur « ${position} » : avancement conforme au plan d'intégration, ` +
        "difficulté technique (accès aux environnements) résolue avec le tuteur, livrable de la semaine validé en revue. " +
        "Objectif de la semaine suivante : poursuivre la mission en cours et consolider la documentation.",
    });
  }
  return entries;
}

/* ============================== SEED PRINCIPAL ============================== */

async function ensureUniversityWithAdmin(): Promise<{ universityId: string; adminMemberId: string; adminName: string }> {
  let university = await db.universityProfile.findUnique({ where: { acronym: INSTI_ACRONYM }, select: { id: true, name: true } });
  if (!university) {
    const userId = await ensureUser(INSTI_ADMIN_EMAIL, "Direction des Stages — INSTI Lokossa", HEAD_TEMP_PASSWORD);
    university = await db.universityProfile.create({
      data: {
        userId,
        name: "INSTI — Institut National Supérieur de Technologie Industrielle",
        acronym: INSTI_ACRONYM,
        city: "Lokossa",
      },
      select: { id: true, name: true },
    });
  }

  let admin = await db.universityMember.findFirst({
    where: { universityId: university.id, role: "ADMIN_SCHOOL" },
    select: { id: true, user: { select: { fullName: true } } },
  });
  if (!admin) {
    const userId = await ensureUser(INSTI_ADMIN_EMAIL, "Direction des Stages — INSTI Lokossa", HEAD_TEMP_PASSWORD);
    const created = await db.universityMember.create({
      data: {
        userId,
        universityId: university.id,
        role: "ADMIN_SCHOOL",
        title: "Directeur des Stages",
      },
      select: { id: true, user: { select: { fullName: true } } },
    });
    admin = created;
  }

  return { universityId: university.id, adminMemberId: admin.id, adminName: admin.user.fullName };
}

async function ensureDepartments(
  universityId: string,
  seeds: DepartmentSeed[],
): Promise<EtabDepartmentRef[]> {
  const refs: EtabDepartmentRef[] = [];
  for (const seed of seeds) {
    let department = await db.department.findUnique({
      where: { universityId_code: { universityId, code: seed.code } },
      select: { id: true, name: true, code: true },
    });
    if (!department) {
      department = await db.department.create({
        data: { universityId, name: seed.name, code: seed.code, specialties: seed.specialties },
        select: { id: true, name: true, code: true },
      });
    } else if (department.name !== seed.name) {
      department = await db.department.update({
        where: { id: department.id },
        data: { name: seed.name, specialties: seed.specialties },
        select: { id: true, name: true, code: true },
      });
    }

    let head = await db.universityMember.findFirst({
      where: { departmentId: department.id, role: "HEAD_OF_DEPARTMENT" },
      select: { id: true, user: { select: { fullName: true } } },
    });
    if (!head) {
      const userId = await ensureUser(seed.head.email, seed.head.name, HEAD_TEMP_PASSWORD);
      await db.universityMember.create({
        data: {
          userId,
          universityId,
          departmentId: department.id,
          role: "HEAD_OF_DEPARTMENT",
          title: `Chef du Département ${seed.code}`,
        },
      });
      head = { id: "created", user: { fullName: seed.head.name } };
    }
    refs.push({ id: department.id, name: department.name, code: department.code, headName: head.user.fullName });
  }
  return refs;
}

async function ensureStudents(
  universityId: string,
  departments: EtabDepartmentRef[],
  companies: Record<string, CompanyRef>,
): Promise<void> {
  const deptByCode = new Map(departments.map((d) => [d.code, d]));
  const ifri = await db.universityProfile.findUnique({ where: { acronym: "IFRI" }, select: { id: true } });

  for (const seed of STUDENTS_SEED) {
    const department = deptByCode.get(seed.deptCode);
    if (!department) continue;

    const existingProfile = await db.studentProfile.findUnique({
      where: { matricule: seed.matricule },
      include: { internships: { select: { id: true } } },
    });

    if (!existingProfile) {
      const userId = await ensureUser(seed.email, seed.name, HEAD_TEMP_PASSWORD, "STUDENT");
      const profile = await db.studentProfile.create({
        data: {
          userId,
          matricule: seed.matricule,
          universityId,
          departmentId: department.id,
          specialty: seed.specialty,
          fieldOfStudy: department.name,
          level: seed.level,
          phone: seed.phone,
          cvUrl: `https://cv.stagetrack.bj/demo/${seed.matricule.toLowerCase()}.pdf`,
          skills: seed.skills,
        },
        select: { id: true },
      });
      await seedStageForStudent(seed, profile.id, universityId, department.id, companies);
      continue;
    }

    // Profil existant : compte toujours étudiant (auto-réparation d'anciens seeds)
    const existingUser = await db.user.findUnique({ where: { email: seed.email }, select: { id: true, role: true } });
    if (existingUser && existingUser.role !== "STUDENT") {
      await db.user.update({ where: { id: existingUser.id }, data: { role: "STUDENT", profileCompleted: true } });
    }

    // Profil existant : s'assurer du rattachement pédagogique complet
    await db.studentProfile.update({
      where: { id: existingProfile.id },
      data: {
        universityId,
        departmentId: department.id,
        specialty: seed.specialty,
        fieldOfStudy: department.name,
        level: seed.level,
      },
    });
    if (existingProfile.internships.length === 0 && seed.stage) {
      await seedStageForStudent(seed, existingProfile.id, universityId, department.id, companies);
    } else if (existingProfile.internships.length > 0 && seed.stage) {
      // Rattacher les stages existants au département (champ ajouté plus tard)
      await db.intern.updateMany({
        where: { studentId: existingProfile.id },
        data: { universityId, departmentId: department.id },
      });
    }
  }

  if (ifri) {
    // Rattacher l'étudiant de démonstration IFRI aux stages déjà en base (champ departmentId ajouté)
    await db.intern.updateMany({
      where: { student: { universityId: ifri.id }, departmentId: null },
      data: { universityId: ifri.id },
    });
    await db.intern.updateMany({
      where: { studentId: null, universityId: ifri.id },
      data: { universityId: ifri.id },
    });
  }
}

async function seedStageForStudent(
  seed: StudentSeed,
  studentId: string,
  universityId: string,
  departmentId: string,
  companies: Record<string, CompanyRef>,
): Promise<void> {
  if (!seed.stage) return;
  const company = companies[seed.stage.companyName];
  if (!company) return;
  const user = await db.user.findUnique({ where: { email: seed.email }, select: { fullName: true, email: true } });
  if (!user) return;

  const now = new Date();
  const terminé = seed.stage.terminé === true;
  const weeksElapsed = seed.stage.currentWeek;
  const totalWeeks = 12;
  const startDate = addDays(now, -weeksElapsed * 7);
  const endDate = terminé ? addDays(now, -(totalWeeks - weeksElapsed) * 7) : addDays(startDate, totalWeeks * 7);
  const position = seed.stage.position;

  const intern = await db.intern.create({
    data: {
      companyId: company.id,
      studentId,
      universityId,
      departmentId,
      name: user.fullName,
      matricule: seed.matricule,
      university: "INSTI Lokossa",
      email: user.email,
      position,
      tutorId: company.tutorId,
      startDate,
      endDate,
      totalWeeks,
      status: terminé ? "TERMINE" : "ACTIF",
      onboarding: ONBOARDING_CHECKLIST,
    },
    select: { id: true },
  });

  if (terminé) {
    await db.evaluation.create({
      data: {
        internId: intern.id,
        technique: seed.matricule.endsWith("007") ? 4 : 3,
        ponctualite: seed.matricule.endsWith("007") ? 5 : 4,
        autonomie: 4,
        espritEquipe: seed.matricule.endsWith("007") ? 4 : 3,
        appreciation:
          `${user.fullName} a accompli ses missions (« ${position} ») avec sérieux et méthode. ` +
          "Livrables conformes, bonne communication avec l'équipe et progression régulière tout au long du stage. " +
          "Nous recommandons ce profil aux partenaires académiques de l'INSTI.",
        finalized: true,
      },
    });
    const count = await db.attestation.count();
    await db.attestation.create({
      data: {
        internId: intern.id,
        reference: `ATT-${endDate.getFullYear()}-${String(count + 1).padStart(3, "0")}`,
        content: attestationContent({
          companyName: seed.stage.companyName,
          city: seed.stage.companyName === "KKiaPay" ? "Cotonou" : seed.stage.companyName === "GéoBénin Ingénierie" ? "Cotonou" : "Lokossa",
          studentName: user.fullName,
          matricule: seed.matricule,
          university: "INSTI Lokossa",
          position,
          startDate,
          endDate,
          tutorName: company.tutorName,
        }),
      },
    });
  } else {
    await db.internshipTask.createMany({
      data: taskSeed(position, weeksElapsed).map((t) => ({ ...t, internId: intern.id })),
    });
    const sheets: { internId: string; periodLabel: string; daysPresent: number; totalDays: number; status: string; submittedAt: Date }[] = [];
    for (let w = Math.max(weeksElapsed - 3, 1); w <= weeksElapsed - 1; w++) {
      sheets.push({
        internId: intern.id,
        periodLabel: `Semaine ${w}`,
        daysPresent: 5 - (w % 2),
        totalDays: 5,
        status: "VALIDEE",
        submittedAt: addDays(now, -(weeksElapsed - w) * 7 - 1),
      });
    }
    sheets.push({
      internId: intern.id,
      periodLabel: `Semaine ${weeksElapsed}`,
      daysPresent: 4,
      totalDays: 5,
      status: "A_VALIDER",
      submittedAt: addDays(now, -1),
    });
    await db.presenceSheet.createMany({ data: sheets });
    await db.weeklyJournal.createMany({
      data: journalSeed(weeksElapsed, position).map((j) => ({ ...j, internId: intern.id })),
    });
  }

  const state = seed.stage.convention;
  const reference = `CONV-INSTI-2026-${seed.matricule.slice(-3)}`;
  const existingConvention = await db.convention.findUnique({ where: { reference }, select: { id: true } });
  if (!existingConvention) {
    await db.convention.create({
      data: {
        companyId: company.id,
        internId: intern.id,
        departmentId,
        reference,
        studentName: user.fullName,
        university: "INSTI Lokossa",
        position,
        status: state === "signee" ? "SIGNEE" : "EN_ATTENTE",
        signedStudent: true,
        signedCompany: true,
        signedUniversity: state === "signee",
        pedagogicalApproved: state !== "visa",
        pedagogicalNote:
          state === "visa"
            ? null
            : "Sujet cohérent avec la spécialité de l'étudiant et le référentiel du département. Visa pédagogique accordé.",
        startDate,
        endDate,
      },
    });
  }

  // Thèse (mémoire) : problématique, plan et statut de validation par le Maître de Mémoire
  const THESIS_TOPIC_BY_MATRICULE: Record<string, { topic: string; plan: string; status: string }> = {
    "INSTI-2026-001": {
      topic: "Comment sécuriser les infrastructures cloud des fintechs ouest-africaines face aux menaces croissantes, tout en garantissant la performance des paiements mobiles en temps réel ?",
      plan: "Chapitre 1 — Contexte des fintechs en Afrique de l'Ouest\nChapitre 2 — Menaces et vecteurs d'attaque sur le cloud\nChapitre 3 — Architecture sécurisée proposée (zero trust)\nChapitre 4 — Implémentation et tests de charge\nChapitre 5 — Résultats, limites et recommandations",
      status: "A_VALIDER",
    },
    "INSTI-2026-002": {
      topic: "Quel design system permettre aux applications de paiement mobile d'être accessibles aux utilisateurs peu alphabétisés du Bénin ?",
      plan: "Chapitre 1 — Accessibilité numérique : état de l'art\nChapitre 2 — Enquête utilisateurs (Cotonou, Lokossa)\nChapitre 3 — Conception du design system accessible\nChapitre 4 — Prototype Next.js et tests utilisateurs\nChapitre 5 — Évaluation et perspectives",
      status: "TOPIC_APPROVED",
    },
    "INSTI-2026-005": {
      topic: "Dans quelle mesure une architecture d'API événementielle (files d'attente) garantit-elle la résilience des paiements lors des pics de trafic ?",
      plan: "Chapitre 1 — Architecture monolithique vs événementielle\nChapitre 2 — Files d'attente : RabbitMQ / Redis\nChapitre 3 — Implémentation sur l'API KKiaPay\nChapitre 4 — Tests de résilience et métriques\nChapitre 5 — Discussion et recommandations",
      status: "REVISION_REQUESTED",
    },
    "INSTI-2026-007": {
      topic: "L'automatisation des tests UI (Selenium) réduit-elle significativement les régressions sur les applications mobiles de paiement ?",
      plan: "Chapitre 1 — Qualité logicielle et tests automatisés\nChapitre 2 — Méthodologie de mesure des régressions\nChapitre 3 — Suite Selenium sur l'app mobile\nChapitre 4 — Résultats avant/après\nChapitre 5 — Portée et limites",
      status: "READY_TO_DEFEND",
    },
    "INSTI-2026-008": {
      topic: "Quel dimensionnement photovoltaïque optimise le coût total d'électrification solaire des bâtiments industriels à Lokossa ?",
      plan: "Chapitre 1 — Électrification industrielle au Bénin\nChapitre 2 — Modélisation des besoins énergétiques\nChapitre 3 — Dimensionnement PV et stockage\nChapitre 4 — Étude de cas : atelier de Lokossa\nChapitre 5 — Analyse coûts-avantages",
      status: "TOPIC_APPROVED",
    },
  };
  const thesis = THESIS_TOPIC_BY_MATRICULE[seed.matricule];
  if (thesis) {
    await db.intern.updateMany({
      where: { matricule: seed.matricule, companyId: company.id },
      data: {
        thesisTopic: thesis.topic,
        thesisPlan: thesis.plan,
        thesisStatus: thesis.status,
        thesisFileUrl: seed.matricule === "INSTI-2026-007" ? "https://memoire.stagetrack.bj/demo/insti-2026-007.pdf" : null,
        supervisorFeedback:
          thesis.status === "REVISION_REQUESTED"
            ? "Plan à affiner : détaillez la méthodologie de tests de résilience (chapitre 4) et citez au moins trois références académiques par chapitre."
            : thesis.status === "TOPIC_APPROVED"
              ? "Thème validé — problématique claire et faisable dans la durée du stage. Pensez à constituer votre bibliographie dès maintenant."
              : null,
        approvedToDefendAt: thesis.status === "READY_TO_DEFEND" ? endDate : null,
      },
    });
  }
}

/** Maître de Mémoire de démonstration + affectation des mémoires des stagiaires. */
async function ensureSupervisor(universityId: string): Promise<void> {
  const gei = await db.department.findFirst({
    where: { universityId, code: "GEI" },
    select: { id: true },
  });

  // Compte User dédié (créé une seule fois avec onboarding à compléter :
  // première connexion → parcours d'accueil en 3 étapes).
  let user = await db.user.findUnique({ where: { email: SUPERVISOR_EMAIL }, select: { id: true } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: SUPERVISOR_EMAIL,
        passwordHash: await hashPassword(SUPERVISOR_PASSWORD),
        fullName: "Prof. Léonce Hounsou",
        role: "UNIVERSITY",
        profileCompleted: false,
      },
      select: { id: true },
    });
  }

  let supervisor = await db.universityMember.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!supervisor) {
    supervisor = await db.universityMember.create({
      data: {
        userId: user.id,
        universityId,
        departmentId: gei?.id ?? null,
        role: "ACADEMIC_SUPERVISOR",
        title: "Maître de Mémoire — Génie Électrique et Informatique",
      },
      select: { id: true },
    });
  } else {
    await db.universityMember.update({
      where: { id: supervisor.id },
      data: {
        role: "ACADEMIC_SUPERVISOR",
        departmentId: gei?.id ?? null,
        title: "Maître de Mémoire — Génie Électrique et Informatique",
      },
      select: { id: true },
    });
  }

  // Affectation initiale des stagiaires encadrés (actifs + terminés) avec
  // intitulé de mémoire — uniquement s'ils n'ont pas encore d'encadreur :
  // une réaffectation manuelle du Chef est ainsi conservée.
  const THESIS_BY_MATRICULE: Record<string, string> = {
    "INSTI-2026-001": "Sécurisation des infrastructures cloud des fintechs en Afrique de l'Ouest",
    "INSTI-2026-002": "Conception d'interfaces accessibles pour les applications de paiement mobile",
    "INSTI-2026-005": "Architecture d'API de paiement scalable : files d'attente et résilience",
    "INSTI-2026-007": "Automatisation des tests d'applications mobiles de paiement",
    "INSTI-2026-008": "Électrification solaire des bâtiments industriels à Lokossa",
  };
  for (const [matricule, thesisTitle] of Object.entries(THESIS_BY_MATRICULE)) {
    await db.intern.updateMany({
      where: { matricule, universityId, thesisSupervisorId: null },
      data: { thesisSupervisorId: supervisor.id, thesisTitle },
    });
  }
}

/**
 * Tuteur de démonstration KKiaPay : User (COMPANY) relié au TeamMember tuteur
 * de KKiaPay — première connexion avec onboarding en 3 étapes.
 */
async function ensureTutorAccount(): Promise<void> {
  const company = await db.company.findUnique({ where: { name: "KKiaPay" }, select: { id: true } });
  if (!company) return;

  let user = await db.user.findUnique({ where: { email: TUTOR_EMAIL }, select: { id: true } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: TUTOR_EMAIL,
        passwordHash: await hashPassword(TUTOR_PASSWORD),
        fullName: "Serge Dossou",
        role: "COMPANY",
        profileCompleted: false,
      },
      select: { id: true },
    });
  }

  let member = await db.teamMember.findFirst({
    where: { companyId: company.id, role: "TUTEUR", email: TUTOR_EMAIL },
    select: { id: true },
  });
  if (!member) {
    member = await db.teamMember.create({
      data: {
        companyId: company.id,
        userId: user.id,
        name: "Serge Dossou",
        email: TUTOR_EMAIL,
        role: "TUTEUR",
        phone: "+229 97 11 22 33",
      },
      select: { id: true },
    });
  }
  // Relier le compte au membre (auto-réparation) et basculer les stagiaires
  // KKiaPay vers ce tuteur si aucun tuteur n'est encore assigné.
  await db.teamMember.update({ where: { id: member.id }, data: { userId: user.id } });
  await db.intern.updateMany({
    where: { companyId: company.id, tutorId: null },
    data: { tutorId: member.id },
  });
}

/**
 * Migration de données : ancien cycle de tâches (A_FAIRE / EN_COURS / VALIDE)
 * → nouveau cycle TODO / IN_PROGRESS / IN_REVIEW / DONE.
 */
async function repairLegacyTaskStatuses(): Promise<void> {
  await db.internshipTask.updateMany({ where: { status: "A_FAIRE" }, data: { status: "TODO" } });
  await db.internshipTask.updateMany({ where: { status: "EN_COURS" }, data: { status: "IN_PROGRESS" } });
  await db.internshipTask.updateMany({ where: { status: "VALIDE" }, data: { status: "DONE" } });
}

/** Point d'entrée : garantit l'université de démonstration complète. */
export async function ensureUniversitySeedData(): Promise<EtabSeedRefs> {
  const { universityId, adminMemberId, adminName } = await ensureUniversityWithAdmin();

  const [departmentCount, studentCount] = await Promise.all([
    db.department.count({ where: { universityId } }),
    db.studentProfile.count({ where: { universityId, matricule: { startsWith: "INSTI-" } } }),
  ]);

  if (departmentCount < DEPARTMENTS_SEED.length || studentCount < STUDENTS_SEED.length) {
    const companies = await ensureCompanies();
    const departments = await ensureDepartments(universityId, DEPARTMENTS_SEED);
    await ensureStudents(universityId, departments, companies);

    // Départements IFRI (cascade profil étudiant) — silencieux si IFRI absente
    const ifri = await db.universityProfile.findUnique({ where: { acronym: "IFRI" }, select: { id: true } });
    if (ifri) {
      const ifriDepartments = await ensureDepartments(ifri.id, IFRI_DEPARTMENTS_SEED);
      if (ifriDepartments.length > 0) {
        const ifriGl = ifriDepartments.find((d) => d.code === "GL");
        if (ifriGl) {
          await db.studentProfile.updateMany({
            where: { universityId: ifri.id, departmentId: null, fieldOfStudy: { contains: "Génie Logiciel" } },
            data: { departmentId: ifriGl.id, specialty: "Génie Logiciel" },
          });
        }
      }
    }
  }

  // Maître de Mémoire : toujours garanti (idempotent, hors du bloc conditionnel)
  await ensureSupervisor(universityId);

  // Tuteur entreprise de démonstration (KKiaPay) + réparation des statuts de tâches
  await ensureTutorAccount();
  await repairLegacyTaskStatuses();

  // Auto-réparation des rôles étudiants INSTI (anciens seeds en UNIVERSITY),
  // hors du bloc conditionnel pour rester garanti à chaque exécution.
  await db.user.updateMany({
    where: { email: { in: STUDENTS_SEED.map((s) => s.email) }, role: { not: "STUDENT" } },
    data: { role: "STUDENT", profileCompleted: true },
  });

  const departments = await db.department.findMany({
    where: { universityId },
    orderBy: { code: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      members: {
        where: { role: "HEAD_OF_DEPARTMENT" },
        select: { user: { select: { fullName: true } } },
        take: 1,
      },
    },
  });

  return {
    universityId,
    universityName: "INSTI — Institut National Supérieur de Technologie Industrielle",
    universityAcronym: INSTI_ACRONYM,
    adminMemberId,
    adminName,
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      headName: d.members[0]?.user.fullName ?? null,
    })),
  };
}
