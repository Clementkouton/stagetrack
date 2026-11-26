"use server";

/**
 * Server Actions Prisma du Dashboard Étudiant StageTrack.
 * -------------------------------------------------------
 * Toutes les actions sont typées strictement (zéro `any`), vérifient
 * l'appartenance des ressources au profil étudiant courant et revalident
 * les pages concernées (côté étudiant ET côté entreprise/établissement).
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, refreshSessionAfterProfileUpdate } from "@/lib/session";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

const STUDENT_PATHS = [
  "/etudiant",
  "/etudiant/dashboard",
  "/etudiant/offres",
  "/etudiant/candidatures",
  "/etudiant/studio-ia",
  "/etudiant/mon-stage",
  "/etudiant/documents",
  "/etudiant/profil",
];

const BACK_OFFICE_PATHS = [
  "/entreprise/suivi",
  "/entreprise/stagiaires",
  "/entreprise/documents",
  "/entreprise/candidatures",
  "/entreprise/evaluations",
];

function revalidateStudent(): void {
  for (const path of STUDENT_PATHS) revalidatePath(path);
}

function revalidateBackOffice(): void {
  for (const path of BACK_OFFICE_PATHS) revalidatePath(path);
}

/* ========================= CANDIDATURES (ATS) ========================= */

export interface ApplicationInput {
  offerId: string;
  coverLetter: string;
}

export async function createApplication(input: ApplicationInput): Promise<ActionResult> {
  const coverLetter = input.coverLetter.trim();
  if (coverLetter.length < 30) {
    return { ok: false, error: "La lettre de motivation doit contenir au moins 30 caractères (ou utilisez la génération IA)." };
  }
  try {
    const student = await getSessionDemoStudent();
    const offer = await db.offer.findUnique({ where: { id: input.offerId }, include: { company: true } });
    if (!offer) return { ok: false, error: "Offre introuvable ou retirée de la publication." };
    if (offer.status !== "PUBLIEE") return { ok: false, error: "Cette offre n'est plus ouverte aux candidatures." };

    const duplicate = await db.candidature.findFirst({
      where: { offerId: offer.id, studentId: student.id },
      select: { id: true },
    });
    if (duplicate) return { ok: false, error: "Vous avez déjà postulé à cette offre : suivez son avancement dans « Mes candidatures »." };

    await db.candidature.create({
      data: {
        companyId: offer.companyId,
        offerId: offer.id,
        studentId: student.id,
        studentName: student.fullName,
        matricule: student.matricule,
        university: student.universityName,
        email: student.email,
        phone: student.phone,
        cvSummary: `Étudiant ${student.universityName} — ${student.fieldOfStudy} (${student.level}). Compétences : ${student.skills.join(", ")}.`,
        coverLetter,
        status: "NOUVELLE",
      },
    });
    revalidateStudent();
    revalidateBackOffice();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'envoyer la candidature (erreur base de données)." };
  }
}

/* ==================== TÂCHES DU STAGE (InternshipTask) ==================== */

const TASK_STATUSES = ["A_FAIRE", "EN_COURS", "VALIDE"] as const;
export type StudentTaskStatus = (typeof TASK_STATUSES)[number];

export async function updateTaskStatus(taskId: string, status: StudentTaskStatus): Promise<ActionResult> {
  if (!TASK_STATUSES.includes(status)) return { ok: false, error: "Statut de tâche invalide." };
  try {
    const student = await getSessionDemoStudent();
    const task = await db.internshipTask.findUnique({
      where: { id: taskId },
      include: { intern: { select: { studentId: true } } },
    });
    if (!task || task.intern.studentId !== student.id) return { ok: false, error: "Tâche introuvable." };
    await db.internshipTask.update({ where: { id: taskId }, data: { status } });
    revalidateStudent();
    revalidateBackOffice();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour la tâche." };
  }
}

/* ======================= PRÉSENCES (PresenceSheet) ======================= */

export interface PresenceInput {
  internId: string;
  periodLabel: string;
  daysPresent: number;
}

export async function submitPresenceSheet(input: PresenceInput): Promise<ActionResult> {
  const label = input.periodLabel.trim();
  if (label.length < 5) return { ok: false, error: "Précisez le libellé de la période (ex. « Semaine 7 »)." };
  if (!Number.isInteger(input.daysPresent) || input.daysPresent < 0 || input.daysPresent > 5) {
    return { ok: false, error: "Le nombre de jours présents doit être compris entre 0 et 5." };
  }
  try {
    const student = await getSessionDemoStudent();
    const intern = await db.intern.findUnique({ where: { id: input.internId }, select: { studentId: true, totalWeeks: true } });
    if (!intern || intern.studentId !== student.id) return { ok: false, error: "Stage introuvable." };
    const duplicate = await db.presenceSheet.findFirst({
      where: { internId: input.internId, periodLabel: label },
      select: { id: true },
    });
    if (duplicate) return { ok: false, error: `Une feuille « ${label} » a déjà été soumise pour ce stage.` };
    await db.presenceSheet.create({
      data: {
        internId: input.internId,
        periodLabel: label,
        daysPresent: input.daysPresent,
        totalDays: 5,
        status: "A_VALIDER",
      },
    });
    revalidateStudent();
    revalidateBackOffice();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de déclarer la présence." };
  }
}

/* ===================== JOURNAL DE BORD (WeeklyJournal) ===================== */

export interface JournalInput {
  internId: string;
  week: number;
  content: string;
}

export async function submitWeeklyJournal(input: JournalInput): Promise<ActionResult> {
  const content = input.content.trim();
  if (content.length < 40) return { ok: false, error: "Le compte-rendu hebdomadaire doit contenir au moins 40 caractères." };
  if (!Number.isInteger(input.week) || input.week < 1 || input.week > 52) {
    return { ok: false, error: "Numéro de semaine invalide." };
  }
  try {
    const student = await getSessionDemoStudent();
    const intern = await db.intern.findUnique({ where: { id: input.internId }, select: { studentId: true } });
    if (!intern || intern.studentId !== student.id) return { ok: false, error: "Stage introuvable." };
    await db.weeklyJournal.create({
      data: { internId: input.internId, week: input.week, content },
    });
    revalidateStudent();
    revalidateBackOffice();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de soumettre le journal de bord." };
  }
}

/* ================= CONVENTIONS (signature étudiant) ================= */

export async function signMyConvention(conventionId: string): Promise<ActionResult> {
  try {
    const student = await getSessionDemoStudent();
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      include: { intern: { select: { studentId: true } } },
    });
    if (!convention) return { ok: false, error: "Convention introuvable." };
    if (convention.intern && convention.intern.studentId !== student.id) {
      return { ok: false, error: "Cette convention n'est pas rattachée à votre profil." };
    }
    if (convention.signedStudent) return { ok: false, error: "Vous avez déjà signé cette convention." };
    const updated = await db.convention.update({
      where: { id: conventionId },
      data: { signedStudent: true },
    });
    const fullySigned = updated.signedStudent && updated.signedCompany && updated.signedUniversity;
    await db.convention.update({
      where: { id: conventionId },
      data: { status: fullySigned ? "SIGNEE" : "EN_ATTENTE" },
    });
    revalidateStudent();
    revalidateBackOffice();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer votre signature." };
  }
}

/* ================= COFFRE-FORT (StudentDocument) ================= */

const DOCUMENT_TYPES = ["PIECE_IDENTITE", "ASSURANCE", "RAPPORT_STAGE", "CV", "AUTRE"] as const;
export type StudentDocumentType = (typeof DOCUMENT_TYPES)[number];

const MAX_DOCUMENT_CHARS = 1_500_000; // ≈ 1,1 Mo en data URL

export interface DocumentInput {
  type: StudentDocumentType;
  name: string;
  url?: string;
  content?: string;
}

export async function uploadStudentDocument(input: DocumentInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (name.length < 3) return { ok: false, error: "Le nom du document doit contenir au moins 3 caractères." };
  if (!DOCUMENT_TYPES.includes(input.type)) return { ok: false, error: "Type de document invalide." };
  if (!input.url && !input.content) return { ok: false, error: "Déposez un fichier ou renseignez un lien externe." };
  if (input.content && input.content.length > MAX_DOCUMENT_CHARS) {
    return { ok: false, error: "Fichier trop volumineux (max ≈ 1 Mo). Utilisez un lien externe (Drive, GitHub…)." };
  }
  if (input.url && !/^https?:\/\/.+/.test(input.url.trim())) {
    return { ok: false, error: "Le lien externe doit commencer par http:// ou https://." };
  }
  try {
    const student = await getSessionDemoStudent();
    await db.studentDocument.create({
      data: {
        studentId: student.id,
        type: input.type,
        name,
        url: input.url?.trim() || null,
        content: input.content || null,
      },
    });
    revalidateStudent();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de déposer le document." };
  }
}

export async function deleteStudentDocument(documentId: string): Promise<ActionResult> {
  try {
    const student = await getSessionDemoStudent();
    const document = await db.studentDocument.findUnique({ where: { id: documentId }, select: { studentId: true } });
    if (!document || document.studentId !== student.id) return { ok: false, error: "Document introuvable." };
    await db.studentDocument.delete({ where: { id: documentId } });
    revalidateStudent();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de supprimer le document." };
  }
}

/* ==================== PROFIL ACADÉMIQUE (StudentProfile) ==================== */

export interface StudentProfileInput {
  fieldOfStudy: string;
  level: string;
  phone: string;
  cvUrl: string;
  skills: string[];
}

export async function updateStudentProfile(input: StudentProfileInput): Promise<ActionResult> {
  const fieldOfStudy = input.fieldOfStudy.trim();
  if (fieldOfStudy.length < 2) return { ok: false, error: "La filière est requise." };
  if (!input.level) return { ok: false, error: "Sélectionnez votre niveau d'études." };
  if (input.phone.trim() && !/^[+\d][\d\s().-]{7,19}$/.test(input.phone.trim())) {
    return { ok: false, error: "Numéro de téléphone invalide (ex. +229 97 41 25 36)." };
  }
  if (input.cvUrl.trim() && !/^https?:\/\/.+/.test(input.cvUrl.trim())) {
    return { ok: false, error: "Le lien du CV doit commencer par http:// ou https://." };
  }
  const skills = input.skills.map((s) => s.trim()).filter(Boolean).slice(0, 15);
  if (skills.length === 0) return { ok: false, error: "Ajoutez au moins une compétence technique." };
  try {
    const student = await getSessionDemoStudent();
    await db.studentProfile.update({
      where: { id: student.id },
      data: {
        fieldOfStudy,
        level: input.level,
        phone: input.phone.trim() || null,
        cvUrl: input.cvUrl.trim() || null,
        skills,
      },
    });
    revalidateStudent();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le profil académique." };
  }
}

/* ============ RATTACHEMENT ACADÉMIQUE EN CASCADE (Université → Département) ============ */

export interface AcademicProfileInput {
  universityId: string;
  departmentId: string;
  specialty: string;
  level: string;
}

export interface DepartmentHeadInfo {
  fullName: string;
  title: string;
  email: string;
}

export interface AcademicProfileResult {
  universityName: string;
  universityAcronym: string;
  universityCity: string | null;
  departmentName: string;
  departmentCode: string;
  specialty: string;
  level: string;
  head: DepartmentHeadInfo | null;
}

/**
 * Rattachement automatique du parcours académique :
 * 1. Met à jour StudentProfile (universityId, departmentId, specialty, level) ;
 * 2. Rattache les stages actifs de l'étudiant (Intern.universityId + departmentId) ;
 * 3. Identifie automatiquement le Chef de Département assigné et renvoie sa
 *    carte d'identité (nom, titre, email institutionnel) pour confirmation.
 */
export async function updateStudentAcademicProfile(
  input: AcademicProfileInput,
): Promise<ActionResult<AcademicProfileResult>> {
  const specialty = input.specialty.trim();
  if (!input.level) return { ok: false, error: "Sélectionnez votre niveau d'études." };
  if (!specialty) return { ok: false, error: "Sélectionnez votre spécialité dans le département choisi." };

  try {
    const student = await getSessionDemoStudent();
    const department = await db.department.findUnique({
      where: { id: input.departmentId },
      include: { university: { select: { id: true, name: true, acronym: true, city: true } } },
    });
    if (!department) return { ok: false, error: "Département introuvable." };
    if (department.universityId !== input.universityId) {
      return { ok: false, error: "Ce département ne dépend pas de l'université sélectionnée." };
    }
    if (!department.specialties.includes(specialty)) {
      return { ok: false, error: "La spécialité choisie n'existe pas dans ce département." };
    }

    await db.studentProfile.update({
      where: { id: student.id },
      data: {
        universityId: department.universityId,
        departmentId: department.id,
        specialty,
        fieldOfStudy: department.name,
        level: input.level,
        schoolName: null,
      },
    });

    // Rattacher les stages actifs de l'étudiant à l'université et au département
    await db.intern.updateMany({
      where: { studentId: student.id },
      data: { universityId: department.universityId, departmentId: department.id },
    });

    // Propager le département aux conventions rattachées (suivi établissement)
    const linkedInterns = await db.intern.findMany({
      where: { studentId: student.id },
      select: { id: true },
    });
    await db.convention.updateMany({
      where: { internId: { in: linkedInterns.map((i) => i.id) } },
      data: { departmentId: department.id },
    });

    // Onboarding complété : le proxy autorise l'accès au dashboard (JWT re-signé).
    const sessionUser = await getSessionUser();
    if (sessionUser && sessionUser.studentProfile?.id === student.id) {
      await db.user.update({ where: { id: sessionUser.id }, data: { profileCompleted: true } });
      await refreshSessionAfterProfileUpdate(sessionUser.id);
    }

    // Identification automatique du Chef de Département assigné
    const head = await db.universityMember.findFirst({
      where: { departmentId: department.id, role: "HEAD_OF_DEPARTMENT" },
      include: { user: { select: { fullName: true, email: true } } },
    });

    revalidateStudent();
    revalidatePath("/etablissement/dashboard");
    revalidatePath("/etablissement/etudiants");

    return {
      ok: true,
      data: {
        universityName: department.university.name,
        universityAcronym: department.university.acronym,
        universityCity: department.university.city,
        departmentName: department.name,
        departmentCode: department.code,
        specialty,
        level: input.level,
        head: head
          ? {
              fullName: head.user.fullName,
              title: head.title ?? `Chef du Département ${department.code}`,
              email: head.user.email,
            }
          : null,
      },
    };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le parcours académique." };
  }
}
