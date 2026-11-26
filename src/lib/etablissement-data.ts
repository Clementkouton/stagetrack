/**
 * Données & permissions du Dashboard Établissement StageTrack.
 * ------------------------------------------------------------
 * Triple vue strictement isolée, pilotée par la session réelle (JWT) :
 *  - ADMIN_SCHOOL (Direction des Stages) : périmètre = toute l'université ;
 *  - HEAD_OF_DEPARTMENT (Chef de Département) : requêtes filtrées sur
 *    `departmentId` du chef connecté ;
 *  - ACADEMIC_SUPERVISOR (Maître de Mémoire) : requêtes filtrées sur
 *    `thesisSupervisorId` du membre connecté.
 * Un cookie de prévisualisation (`stg_etab_member`) permet de basculer entre
 * les comptes du même établissement (sélecteur « session démo » du header).
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ensureUniversitySeedData } from "@/lib/etablissement-seed";
import { getSessionUser } from "@/lib/session";

export const ETAB_SESSION_COOKIE = "stg_etab_member";

export type EtablissementRole = "ADMIN_SCHOOL" | "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";

export interface EtablissementContext {
  role: EtablissementRole;
  isChef: boolean;
  isSupervisor: boolean;
  /** User.id de la session réelle (onboarding / rafraîchissement du JWT). */
  sessionUserId: string;
  universityId: string;
  universityName: string;
  universityAcronym: string;
  universityCity: string | null;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  /** Filtre « périmètre » pour les requêtes Intern : département du chef ou
   *  encadrement du Maître de Mémoire ; rien pour l'admin (toute l'école). */
  internScope: { universityId: string; departmentId?: string; thesisSupervisorId?: string };
  /** Ancien filtre départemental (chef) — conservé pour les jointures Convention. */
  departmentScope: { departmentId: string } | null;
  /** Filtre encadrement (Maître de Mémoire). */
  supervisorScope: { thesisSupervisorId: string } | null;
}

export interface SessionSwitchOption {
  id: string; // memberId
  label: string;
  role: EtablissementRole;
  departmentCode: string | null;
}

/**
 * Résout le contexte courant depuis la session réelle (JWT) : Admin Université,
 * Chef de Département ou Maître de Mémoire. Un cookie de prévisualisation peut
 * basculer vers un autre membre du MÊME établissement (session démo du header).
 * Retourne null si la base est inaccessible (écran d'erreur côté layout) —
 * l'absence de session est gérée en amont par le proxy et le layout.
 */
export async function getEtablissementContext(): Promise<EtablissementContext | null> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "UNIVERSITY" || !sessionUser.universityMember) return null;

    const refs = await ensureUniversitySeedData();

    // Résolution du membre « actif » : session réelle, sauf prévisualisation.
    let activeMember = await db.universityMember.findUnique({
      where: { id: sessionUser.universityMember.id },
      include: { user: true, department: true, university: true },
    });

    const store = await cookies();
    const previewId = store.get(ETAB_SESSION_COOKIE)?.value?.trim() ?? "";
    if (previewId && previewId !== activeMember?.id) {
      const preview = await db.universityMember.findUnique({
        where: { id: previewId },
        include: { user: true, department: true, university: true },
      });
      if (preview && preview.universityId === sessionUser.universityMember.universityId) {
        activeMember = preview;
      }
    }
    if (!activeMember) return null;

    const base = {
      sessionUserId: sessionUser.id,
      universityId: activeMember.universityId,
      universityCity: activeMember.university.city,
      universityName:
        refs.universityId === activeMember.universityId ? refs.universityName : activeMember.university.name,
      universityAcronym:
        refs.universityId === activeMember.universityId ? refs.universityAcronym : activeMember.university.acronym,
    };

    if (activeMember.role === "HEAD_OF_DEPARTMENT" && activeMember.departmentId && activeMember.department) {
      return {
        ...base,
        role: "HEAD_OF_DEPARTMENT",
        isChef: true,
        isSupervisor: false,
        memberId: activeMember.id,
        memberName: activeMember.user.fullName,
        memberEmail: activeMember.user.email,
        memberTitle: activeMember.title ?? `Chef du Département ${activeMember.department.code}`,
        departmentId: activeMember.department.id,
        departmentName: activeMember.department.name,
        departmentCode: activeMember.department.code,
        internScope: { universityId: activeMember.universityId, departmentId: activeMember.department.id },
        departmentScope: { departmentId: activeMember.department.id },
        supervisorScope: null,
      };
    }

    if (activeMember.role === "ACADEMIC_SUPERVISOR") {
      return {
        ...base,
        role: "ACADEMIC_SUPERVISOR",
        isChef: false,
        isSupervisor: true,
        memberId: activeMember.id,
        memberName: activeMember.user.fullName,
        memberEmail: activeMember.user.email,
        memberTitle: activeMember.title ?? "Maître de Mémoire",
        departmentId: activeMember.departmentId,
        departmentName: activeMember.department?.name ?? null,
        departmentCode: activeMember.department?.code ?? null,
        internScope: { universityId: activeMember.universityId, thesisSupervisorId: activeMember.id },
        departmentScope: null,
        supervisorScope: { thesisSupervisorId: activeMember.id },
      };
    }

    return {
      ...base,
      role: "ADMIN_SCHOOL",
      isChef: false,
      isSupervisor: false,
      memberId: activeMember.id,
      memberName: activeMember.user.fullName,
      memberEmail: activeMember.user.email,
      memberTitle: activeMember.title ?? "Direction des Stages",
      departmentId: null,
      departmentName: null,
      departmentCode: null,
      internScope: { universityId: activeMember.universityId },
      departmentScope: null,
      supervisorScope: null,
    };
  } catch {
    return null;
  }
}

/** Options du sélecteur de prévisualisation (Admin, Chefs, Maîtres de Mémoire). */
export async function getEtablissementSessionOptions(universityId: string): Promise<SessionSwitchOption[]> {
  const members = await db.universityMember.findMany({
    where: { universityId },
    include: { user: { select: { fullName: true } }, department: { select: { code: true, name: true } } },
    orderBy: [{ role: "asc" }, { department: { code: "asc" } }],
  });
  return members
    .map((m) => ({
      id: m.id,
      role: m.role as EtablissementRole,
      departmentCode: m.department?.code ?? null,
      label:
        m.role === "ADMIN_SCHOOL"
          ? `${m.title ?? "Direction des Stages"}`
          : m.role === "ACADEMIC_SUPERVISOR"
            ? `Maître de Mémoire — ${m.user.fullName}`
            : `Chef Dépt. ${m.department?.code ?? "—"} — ${m.user.fullName}`,
    }))
    .sort((a, b) =>
      a.role === "ADMIN_SCHOOL" ? -1 : b.role === "ADMIN_SCHOOL" ? 1 : a.label.localeCompare(b.label),
    );
}

/* ============================== DASHBOARD ============================== */

export interface EtabKpis {
  students: number;
  placementRate: number;
  pendingConventions: number;
  activeInterns: number;
}

export interface PlacementRow {
  label: string;
  placed: number;
  searching: number;
}

export interface PriorityAction {
  conventionId: string;
  reference: string;
  studentName: string;
  position: string;
  departmentCode: string | null;
  kind: "visa" | "signature";
  label: string;
}

export async function getDashboardData(ctx: EtablissementContext) {
  const studentWhere =
    ctx.isSupervisor
      ? {
          universityId: ctx.universityId,
          internships: { some: { thesisSupervisorId: ctx.memberId } },
        }
      : {
          universityId: ctx.universityId,
          ...(ctx.departmentScope ? { departmentId: ctx.departmentScope.departmentId } : {}),
        };

  /** Périmètre convention : département du chef, encadrement du Maître de
   *  Mémoire, ou université entière pour l'admin. */
  const conventionScope = ctx.isChef
    ? {
        OR: [
          { departmentId: ctx.departmentId },
          { intern: { departmentId: ctx.departmentId } },
        ],
      }
    : ctx.isSupervisor
      ? { intern: { thesisSupervisorId: ctx.memberId } }
      : { intern: { universityId: ctx.universityId } };

  const [studentCount, placedCount, pendingCount, activeCount, students] = await Promise.all([
    db.studentProfile.count({ where: studentWhere }),
    db.intern.count({
      where: {
        ...ctx.internScope,
        status: "ACTIF",
      },
    }),
    db.convention.count({
      where: {
        AND: [
          conventionScope,
          { studentName: { not: "" } },
          {
            OR: [
              {
                pedagogicalApproved: false,
                signedStudent: true,
                signedCompany: true,
                signedUniversity: false,
              },
              { pedagogicalApproved: true, signedStudent: true, signedCompany: true, signedUniversity: false },
            ],
          },
        ],
      },
    }),
    db.intern.count({
      where: {
        ...ctx.internScope,
        status: "ACTIF",
      },
    }),
    db.studentProfile.findMany({
      where: studentWhere,
      select: { department: { select: { code: true, name: true } }, level: true, internships: { select: { id: true, status: true } } },
    }),
  ]);

  const placementRate = studentCount === 0 ? 0 : Math.round((placedCount / studentCount) * 100);

  // Vue Admin : placés vs en recherche par département ; vue Chef & Maître de
  // Mémoire : par niveau d'étude.
  let chartRows: PlacementRow[] = [];
  if (!ctx.isChef && !ctx.isSupervisor) {
    const departments = await db.department.findMany({
      where: { universityId: ctx.universityId },
      orderBy: { code: "asc" },
      select: { code: true },
    });
    chartRows = departments.map((d) => {
      const group = students.filter((s) => s.department?.code === d.code);
      const placed = group.filter((s) => s.internships.some((i) => i.status === "ACTIF")).length;
      return { label: d.code, placed, searching: group.length - placed };
    });
  } else {
    const levels = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"];
    chartRows = levels.map((level) => {
      const group = students.filter((s) => (s.level ?? "") === level);
      const placed = group.filter((s) => s.internships.some((i) => i.status === "ACTIF")).length;
      return { label: level, placed, searching: group.length - placed };
    });
  }

  // File d'actions prioritaires : conventions à viser (chef) ou à signer (admin).
  // Le Maître de Mémoire n'intervient pas dans le circuit — liste vide.
  const actions: PriorityAction[] = [];
  if (!ctx.isSupervisor) {
    const actionWhere = ctx.isChef
      ? {
          OR: [
            { departmentId: ctx.departmentId },
            { intern: { departmentId: ctx.departmentId } },
          ],
          signedStudent: true,
          signedCompany: true,
          pedagogicalApproved: false,
        }
      : {
          intern: { universityId: ctx.universityId },
          signedStudent: true,
          signedCompany: true,
          pedagogicalApproved: true,
          signedUniversity: false,
        };
    const pendingConventions = await db.convention.findMany({
      where: actionWhere,
      include: { department: { select: { code: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
    actions.push(
      ...pendingConventions.map((c) => ({
        conventionId: c.id,
        reference: c.reference,
        studentName: c.studentName,
        position: c.position,
        departmentCode: c.department?.code ?? null,
        kind: (ctx.isChef ? "visa" : "signature") as "visa" | "signature",
        label: ctx.isChef
          ? `Visa pédagogique à accorder — ${c.studentName}`
          : `Signature finale à apposer — ${c.studentName}`,
      })),
    );
  }

  const kpis: EtabKpis = {
    students: studentCount,
    placementRate,
    pendingConventions: pendingCount,
    activeInterns: activeCount,
  };

  return { kpis, chartRows, actions };
}

/* ============================== ÉTUDIANTS ============================== */

export interface EtabStudentRow {
  id: string;
  /** Identifiant du stage (Intern) actif ou terminé — pour l'affectation du mémoire. */
  internId: string | null;
  fullName: string;
  matricule: string;
  email: string;
  phone: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  specialty: string | null;
  fieldOfStudy: string | null;
  level: string | null;
  headName: string | null;
  companyName: string | null;
  position: string | null;
  stageStatus: "ACTIF" | "TERMINE" | "RECHERCHE";
  currentWeek: number | null;
  totalWeeks: number | null;
  startDate: Date | null;
  endDate: Date | null;
  skills: string[];
  cvUrl: string | null;
  conventionRef: string | null;
  conventionState: { signedStudent: boolean; signedCompany: boolean; pedagogicalApproved: boolean; signedUniversity: boolean } | null;
  thesisSupervisorId: string | null;
  thesisSupervisorName: string | null;
}

export async function getStudentsData(ctx: EtablissementContext, search?: string): Promise<EtabStudentRow[]> {
  const headByDepartment = await db.universityMember.findMany({
    where: { universityId: ctx.universityId, role: "HEAD_OF_DEPARTMENT" },
    select: { departmentId: true, user: { select: { fullName: true } } },
  });
  const headMap = new Map(headByDepartment.filter((m) => m.departmentId).map((m) => [m.departmentId as string, m.user.fullName]));

  const students = await db.studentProfile.findMany({
    where: {
      universityId: ctx.universityId,
      ...(ctx.isSupervisor
        ? { internships: { some: { thesisSupervisorId: ctx.memberId } } }
        : ctx.departmentScope
          ? { departmentId: ctx.departmentScope.departmentId }
          : {}),
      ...(search && search.trim().length >= 2
        ? {
            OR: [
              { user: { fullName: { contains: search.trim() } } },
              { matricule: { contains: search.trim() } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { fullName: true, email: true } },
      department: { select: { code: true, name: true } },
      internships: {
        include: {
          company: { select: { name: true } },
          thesisSupervisor: { include: { user: { select: { fullName: true } } } },
          conventions: { select: { reference: true, signedStudent: true, signedCompany: true, pedagogicalApproved: true, signedUniversity: true } },
        },
      },
    },
    orderBy: { matricule: "asc" },
  });

  return students.map((s) => {
    const active = s.internships.find((i) => i.status === "ACTIF") ?? null;
    const done = s.internships.find((i) => i.status === "TERMINE") ?? null;
    const stage = active ?? done;
    const computeWeek = (start: Date, end: Date, total: number) => {
      const span = Math.max(end.getTime() - start.getTime(), 7 * 86400000);
      const w = Math.floor(((Date.now() - start.getTime()) / span) * total) + 1;
      return Math.min(Math.max(w, 1), total);
    };
    const convention = stage?.conventions[0] ?? null;
    return {
      id: s.id,
      internId: stage?.id ?? null,
      fullName: s.user.fullName,
      matricule: s.matricule,
      email: s.user.email,
      phone: s.phone,
      departmentCode: s.department?.code ?? null,
      departmentName: s.department?.name ?? null,
      specialty: s.specialty,
      fieldOfStudy: s.fieldOfStudy,
      level: s.level,
      headName: s.departmentId ? headMap.get(s.departmentId) ?? null : null,
      companyName: stage?.company.name ?? null,
      position: stage?.position ?? null,
      stageStatus: active ? "ACTIF" : done ? "TERMINE" : "RECHERCHE",
      currentWeek: active ? computeWeek(active.startDate, active.endDate, active.totalWeeks) : null,
      totalWeeks: active ? active.totalWeeks : null,
      startDate: stage?.startDate ?? null,
      endDate: stage?.endDate ?? null,
      skills: s.skills,
      cvUrl: s.cvUrl,
      conventionRef: convention?.reference ?? null,
      conventionState: convention
        ? {
            signedStudent: convention.signedStudent,
            signedCompany: convention.signedCompany,
            pedagogicalApproved: convention.pedagogicalApproved,
            signedUniversity: convention.signedUniversity,
          }
        : null,
      thesisSupervisorId: stage?.thesisSupervisorId ?? null,
      thesisSupervisorName: stage?.thesisSupervisor?.user.fullName ?? null,
    };
  });
}

/* ============================== CONVENTIONS ============================== */

export interface ConventionRow {
  id: string;
  reference: string;
  studentName: string;
  position: string;
  departmentCode: string | null;
  companyName: string;
  studentSpecialty: string | null;
  studentLevel: string | null;
  signedStudent: boolean;
  signedCompany: boolean;
  pedagogicalApproved: boolean;
  pedagogicalNote: string | null;
  signedUniversity: boolean;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  missions: string | null;
  updatedAt: Date;
}

export async function getConventionsData(ctx: EtablissementContext): Promise<ConventionRow[]> {
  const conventions = await db.convention.findMany({
    where: {
      internId: { not: null },
      ...(ctx.isChef
        ? {
            OR: [
              { departmentId: ctx.departmentId },
              { intern: { departmentId: ctx.departmentId } },
            ],
          }
        : ctx.isSupervisor
          ? { intern: { thesisSupervisorId: ctx.memberId } }
          : { intern: { universityId: ctx.universityId } }),
    },
    include: {
      company: { select: { name: true } },
      department: { select: { code: true } },
      intern: {
        select: {
          position: true,
          startDate: true,
          endDate: true,
          student: { select: { specialty: true, level: true } },
          candidature: { select: { offer: { select: { missions: true } } } },
        },
      },
    },
    orderBy: [{ pedagogicalApproved: "asc" }, { updatedAt: "desc" }],
  });

  return conventions.map((c) => ({
    id: c.id,
    reference: c.reference,
    studentName: c.studentName,
    position: c.intern?.position ?? c.position,
    departmentCode: c.department?.code ?? null,
    companyName: c.company.name,
    studentSpecialty: c.intern?.student?.specialty ?? null,
    studentLevel: c.intern?.student?.level ?? null,
    signedStudent: c.signedStudent,
    signedCompany: c.signedCompany,
    pedagogicalApproved: c.pedagogicalApproved,
    pedagogicalNote: c.pedagogicalNote,
    signedUniversity: c.signedUniversity,
    status: c.status,
    startDate: c.intern?.startDate ?? c.startDate,
    endDate: c.intern?.endDate ?? c.endDate,
    missions: c.intern?.candidature?.offer?.missions ?? null,
    updatedAt: c.updatedAt,
  }));
}

/* ============================== SUIVI DES STAGES ============================== */

export interface SuiviRow {
  internId: string;
  studentName: string;
  matricule: string;
  position: string;
  companyName: string;
  departmentCode: string | null;
  tutorName: string | null;
  startDate: Date;
  endDate: Date;
  totalWeeks: number;
  currentWeek: number;
  presenceRate: number;
  sheetsCount: number;
  journals: { week: number; content: string; createdAt: Date }[];
  tasksDone: number;
  tasksTotal: number;
}

export async function getSuiviData(ctx: EtablissementContext): Promise<SuiviRow[]> {
  const interns = await db.intern.findMany({
    where: {
      ...ctx.internScope,
      status: "ACTIF",
    },
    include: {
      company: { select: { name: true } },
      department: { select: { code: true } },
      tutor: { select: { name: true } },
      tasks: { select: { status: true } },
      presenceSheets: { select: { daysPresent: true, totalDays: true } },
      journals: { orderBy: { week: "asc" }, select: { week: true, content: true, createdAt: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return interns.map((i) => {
    const span = Math.max(i.endDate.getTime() - i.startDate.getTime(), 7 * 86400000);
    const week = Math.min(Math.max(Math.floor(((Date.now() - i.startDate.getTime()) / span) * i.totalWeeks) + 1, 1), i.totalWeeks);
    const presence = i.presenceSheets.length
      ? Math.round(
          (i.presenceSheets.reduce((acc, s) => acc + s.daysPresent / Math.max(s.totalDays, 1), 0) /
            i.presenceSheets.length) *
            100,
        )
      : 0;
    return {
      internId: i.id,
      studentName: i.name,
      matricule: i.matricule,
      position: i.position,
      companyName: i.company.name,
      departmentCode: i.department?.code ?? null,
      tutorName: i.tutor?.name ?? null,
      startDate: i.startDate,
      endDate: i.endDate,
      totalWeeks: i.totalWeeks,
      currentWeek: week,
      presenceRate: presence,
      sheetsCount: i.presenceSheets.length,
      journals: i.journals,
      tasksDone: i.tasks.filter((t) => t.status === "DONE").length,
      tasksTotal: i.tasks.length,
    };
  });
}

/* ============================== ÉVALUATIONS ============================== */

export interface EvaluationRow {
  id: string;
  studentName: string;
  matricule: string;
  departmentCode: string | null;
  level: string | null;
  position: string;
  companyName: string;
  technique: number;
  ponctualite: number;
  autonomie: number;
  espritEquipe: number;
  average: number;
  appreciation: string;
  finalized: boolean;
  attestationRef: string | null;
  attestationContent: string | null;
}

export async function getEvaluationsData(ctx: EtablissementContext): Promise<EvaluationRow[]> {
  const interns = await db.intern.findMany({
    where: {
      ...ctx.internScope,
      status: "TERMINE",
    },
    include: {
      company: { select: { name: true } },
      department: { select: { code: true } },
      student: { select: { level: true } },
      evaluation: {
        select: {
          id: true,
          technique: true,
          ponctualite: true,
          autonomie: true,
          espritEquipe: true,
          appreciation: true,
          finalized: true,
        },
      },
      attestation: { select: { reference: true, content: true } },
    },
    orderBy: { endDate: "desc" },
  });

  return interns.map((i) => {
    const e = i.evaluation;
    return {
      id: i.evaluation?.id ?? i.id,
      studentName: i.name,
      matricule: i.matricule,
      departmentCode: i.department?.code ?? null,
      level: i.student?.level ?? null,
      position: i.position,
      companyName: i.company.name,
      technique: e?.technique ?? 0,
      ponctualite: e?.ponctualite ?? 0,
      autonomie: e?.autonomie ?? 0,
      espritEquipe: e?.espritEquipe ?? 0,
      average: e ? Math.round(((e.technique + e.ponctualite + e.autonomie + e.espritEquipe) / 4) * 10) / 10 : 0,
      appreciation: e?.appreciation ?? "",
      finalized: e?.finalized ?? false,
      attestationRef: i.attestation?.reference ?? null,
      attestationContent: i.attestation?.content ?? null,
    };
  });
}

/* ============================== DÉPARTEMENTS ============================== */

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  specialties: string[];
  students: number;
  placed: number;
  headName: string | null;
  headEmail: string | null;
  headMemberId: string | null;
}

export async function getDepartmentsData(universityId: string): Promise<DepartmentRow[]> {
  const departments = await db.department.findMany({
    where: { universityId },
    orderBy: { code: "asc" },
    include: {
      members: { where: { role: "HEAD_OF_DEPARTMENT" }, include: { user: { select: { fullName: true, email: true } } }, take: 1 },
      students: { select: { id: true, internships: { select: { id: true, status: true } } } },
    },
  });
  return departments.map((d) => {
    const head = d.members[0] ?? null;
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      specialties: d.specialties,
      students: d.students.length,
      placed: d.students.filter((s) => s.internships.some((i) => i.status === "ACTIF")).length,
      headName: head?.user.fullName ?? null,
      headEmail: head?.user.email ?? null,
      headMemberId: head?.id ?? null,
    };
  });
}

/* ============================== ENCADREMENT (MAÎTRE DE MÉMOIRE) ============================== */

export type ThesisStatus = "A_VALIDER" | "TOPIC_APPROVED" | "REVISION_REQUESTED" | "READY_TO_DEFEND";

export interface EncadrementRow {
  internId: string;
  studentName: string;
  matricule: string;
  email: string;
  phone: string | null;
  position: string;
  companyName: string;
  departmentCode: string | null;
  level: string | null;
  specialty: string | null;
  thesisTitle: string | null;
  thesisTopic: string | null;
  thesisPlan: string | null;
  thesisFileUrl: string | null;
  thesisStatus: ThesisStatus;
  supervisorFeedback: string | null;
  approvedToDefendAt: Date | null;
  tutor: { name: string; email: string; phone: string | null; position: string | null } | null;
  status: "ACTIF" | "TERMINE";
  startDate: Date;
  endDate: Date;
  totalWeeks: number;
  currentWeek: number;
  presenceRate: number;
  journals: { week: number; content: string; createdAt: Date }[];
  tasksDone: number;
  tasksTotal: number;
  evaluation: {
    technique: number;
    ponctualite: number;
    autonomie: number;
    espritEquipe: number;
    average: number;
    appreciation: string;
    finalized: boolean;
  } | null;
}

/**
 * Stages encadrés par le Maître de Mémoire connecté (actifs + terminés) :
 * intitulé du mémoire, progression, assiduité, journaux hebdomadaires et
 * évaluation finale de l'entreprise.
 */
export async function getEncadrementData(ctx: EtablissementContext): Promise<EncadrementRow[]> {
  const interns = await db.intern.findMany({
    where: { ...ctx.internScope, thesisSupervisorId: ctx.memberId },
    include: {
      company: { select: { name: true } },
      department: { select: { code: true } },
      student: { select: { level: true, specialty: true, phone: true } },
      tutor: { select: { name: true, email: true, phone: true, position: true } },
      tasks: { select: { status: true } },
      presenceSheets: { select: { daysPresent: true, totalDays: true } },
      journals: { orderBy: { week: "asc" }, select: { week: true, content: true, createdAt: true } },
      evaluation: {
        select: {
          technique: true,
          ponctualite: true,
          autonomie: true,
          espritEquipe: true,
          appreciation: true,
          finalized: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  return interns.map((i) => {
    const span = Math.max(i.endDate.getTime() - i.startDate.getTime(), 7 * 86400000);
    const week = Math.min(
      Math.max(Math.floor(((Date.now() - i.startDate.getTime()) / span) * i.totalWeeks) + 1, 1),
      i.totalWeeks,
    );
    const presence = i.presenceSheets.length
      ? Math.round(
          (i.presenceSheets.reduce((acc, s) => acc + s.daysPresent / Math.max(s.totalDays, 1), 0) /
            i.presenceSheets.length) *
            100,
        )
      : 0;
    const e = i.evaluation;
    return {
      internId: i.id,
      studentName: i.name,
      matricule: i.matricule,
      email: i.email,
      phone: i.student?.phone ?? null,
      position: i.position,
      companyName: i.company.name,
      departmentCode: i.department?.code ?? null,
      level: i.student?.level ?? null,
      specialty: i.student?.specialty ?? null,
      thesisTitle: i.thesisTitle,
      thesisTopic: i.thesisTopic,
      thesisPlan: i.thesisPlan,
      thesisFileUrl: i.thesisFileUrl,
      thesisStatus: i.thesisStatus as ThesisStatus,
      supervisorFeedback: i.supervisorFeedback,
      approvedToDefendAt: i.approvedToDefendAt,
      tutor: i.tutor
        ? { name: i.tutor.name, email: i.tutor.email, phone: i.tutor.phone, position: i.tutor.position }
        : null,
      status: i.status as "ACTIF" | "TERMINE",
      startDate: i.startDate,
      endDate: i.endDate,
      totalWeeks: i.totalWeeks,
      currentWeek: week,
      presenceRate: presence,
      journals: i.journals,
      tasksDone: i.tasks.filter((t) => t.status === "DONE").length,
      tasksTotal: i.tasks.length,
      evaluation: e
        ? {
            technique: e.technique,
            ponctualite: e.ponctualite,
            autonomie: e.autonomie,
            espritEquipe: e.espritEquipe,
            average: Math.round(((e.technique + e.ponctualite + e.autonomie + e.espritEquipe) / 4) * 10) / 10,
            appreciation: e.appreciation,
            finalized: e.finalized,
          }
        : null,
    };
  });
}

/* ============================== MAÎTRES DE MÉMOIRE (CHEF) ============================== */

export interface SupervisorRow {
  memberId: string;
  userId: string;
  fullName: string;
  email: string;
  title: string | null;
  grade: string | null;
  avatarUrl: string | null;
  profileCompleted: boolean;
  workload: number;
  maxWorkload: number;
  students: { name: string; matricule: string; level: string | null; thesisTitle: string | null; status: string }[];
}

/** Charge maximale d'encadrement d'un Maître de Mémoire. */
export const SUPERVISOR_WORKLOAD_LIMIT = 6;

/**
 * Maîtres de Mémoire rattachés au département du Chef connecté : charge
 * d'encadrement (stagiaires supervisés) et étudiants affectés.
 */
export async function getSupervisorsData(ctx: EtablissementContext): Promise<SupervisorRow[]> {
  const supervisors = await db.universityMember.findMany({
    where: {
      universityId: ctx.universityId,
      role: "ACADEMIC_SUPERVISOR",
      ...(ctx.departmentId ? { OR: [{ departmentId: ctx.departmentId }, { departmentId: null }] } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, avatarUrl: true, profileCompleted: true } },
      supervisedInternships: {
        select: {
          id: true,
          name: true,
          matricule: true,
          thesisTitle: true,
          status: true,
          student: { select: { level: true } },
        },
        orderBy: { matricule: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return supervisors.map((s) => ({
    memberId: s.id,
    userId: s.user.id,
    fullName: s.user.fullName,
    email: s.user.email,
    title: s.title,
    grade: s.title?.split("—")[0]?.trim() ?? null,
    avatarUrl: s.user.avatarUrl,
    profileCompleted: s.user.profileCompleted,
    workload: s.supervisedInternships.length,
    maxWorkload: SUPERVISOR_WORKLOAD_LIMIT,
    students: s.supervisedInternships.slice(0, 8).map((i) => ({
      name: i.name,
      matricule: i.matricule,
      level: i.student?.level ?? null,
      thesisTitle: i.thesisTitle,
      status: i.status,
    })),
  }));
}

/** Étudiants du département du chef (pour l'affectation d'un Maître de Mémoire). */
export async function getDepartmentInternsForAssignment(
  ctx: EtablissementContext,
): Promise<{ id: string; name: string; matricule: string; thesisSupervisorId: string | null; supervisorName: string | null }[]> {
  if (!ctx.departmentId) return [];
  const interns = await db.intern.findMany({
    where: { departmentId: ctx.departmentId, status: "ACTIF" },
    select: {
      id: true,
      name: true,
      matricule: true,
      thesisSupervisorId: true,
      thesisSupervisor: { select: { user: { select: { fullName: true } } } },
    },
    orderBy: { matricule: "asc" },
    take: 40,
  });
  return interns.map((i) => ({
    id: i.id,
    name: i.name,
    matricule: i.matricule,
    thesisSupervisorId: i.thesisSupervisorId,
    supervisorName: i.thesisSupervisor?.user.fullName ?? null,
  }));
}
