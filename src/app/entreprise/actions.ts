"use server";

/**
 * Server Actions Prisma du Dashboard Entreprise StageTrack (société KKiaPay).
 * Toutes les actions sont typées strictement (zéro `any`) et revalident les pages.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getCompanyScope, getSessionUser, refreshSessionAfterProfileUpdate } from "@/lib/session";
import { attestationContent } from "@/lib/entreprise-templates";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

const COMPANY_SLUG = "entreprise";

function revalidateAll() {
  for (const path of [
    "/entreprise",
    "/entreprise/dashboard",
    "/entreprise/offres",
    "/entreprise/candidatures",
    "/entreprise/stagiaires",
    "/entreprise/suivi",
    "/entreprise/documents",
    "/entreprise/evaluations",
    "/entreprise/parametres",
  ]) {
    revalidatePath(path);
  }
}

/* ======================= GARDES DE PÉRIMÈTRE ========================
 * Session réelle : ADMIN_RH = toute la société ; TUTEUR = uniquement ses
 * stagiaires encadrés (intern.tutorId). Fallback : société démo KKiaPay. */
interface CompanyGuard {
  companyId: string;
  isAdmin: boolean;
  tutorId: string | null;
}

async function requireCompanyScope(): Promise<CompanyGuard | null> {
  const scope = await getCompanyScope();
  if (scope) return scope;
  const demo = await db.company.findUnique({ where: { name: "KKiaPay" }, select: { id: true } });
  if (!demo) return null;
  return { companyId: demo.id, isAdmin: true, tutorId: null };
}

/** Vérifie qu'un stagiaire appartient au périmètre du membre connecté. */
async function internInScope(internId: string): Promise<CompanyGuard | null> {
  const guard = await requireCompanyScope();
  if (!guard) return null;
  const intern = await db.intern.findUnique({
    where: { id: internId },
    select: { companyId: true, tutorId: true },
  });
  if (!intern || intern.companyId !== guard.companyId) return null;
  if (!guard.isAdmin && intern.tutorId !== guard.tutorId) return null;
  return guard;
}

/** Vérifie qu'une offre / candidature / convention appartient à la société. */
async function companyEntityInScope(
  entity: { companyId: string },
): Promise<CompanyGuard | null> {
  const guard = await requireCompanyScope();
  if (!guard) return null;
  return entity.companyId === guard.companyId ? guard : null;
}

/* ============================== OFFRES ============================== */

export interface OfferInput {
  title: string;
  sector: string;
  city: string;
  duration: string;
  workMode: string;
  contractType: string;
  gratification?: string;
  description: string;
  missions: string[];
  skills: string[];
  status?: "PUBLIEE" | "BROUILLON" | "POURVUE";
  aiGenerated?: boolean;
}

const validateOfferInput = (input: OfferInput): string | null => {
  if (input.title.trim().length < 5) return "Le titre de l'offre doit contenir au moins 5 caractères.";
  if (!input.sector) return "Veuillez sélectionner un secteur d'activité.";
  if (!input.city) return "Veuillez sélectionner une ville.";
  if (!input.duration) return "Veuillez préciser la durée du stage.";
  if (input.description.trim().length < 20) return "La description doit contenir au moins 20 caractères.";
  if (input.missions.length === 0) return "Ajoutez au moins une mission.";
  if (input.skills.length === 0) return "Ajoutez au moins une compétence requise.";
  return null;
};

export async function createOffer(input: OfferInput): Promise<ActionResult> {
  const error = validateOfferInput(input);
  if (error) return { ok: false, error };
  const guard = await requireCompanyScope();
  if (!guard) return { ok: false, error: "Entreprise introuvable en base." };
  if (!guard.isAdmin) return { ok: false, error: "Seul un responsable RH peut publier une offre." };
  try {
    await db.offer.create({
      data: {
        companyId: guard.companyId,
        title: input.title.trim(),
        sector: input.sector,
        city: input.city,
        duration: input.duration,
        workMode: input.workMode || "SUR_SITE",
        contractType: input.contractType || "STAGE_ACADEMIQUE",
        gratification: input.gratification || null,
        description: input.description.trim(),
        missions: input.missions.join("\n"),
        skills: input.skills.join("\n"),
        status: input.status ?? "PUBLIEE",
        aiGenerated: input.aiGenerated ?? false,
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de créer l'offre (erreur base de données)." };
  }
}

export async function updateOfferStatus(offerId: string, status: "PUBLIEE" | "BROUILLON" | "POURVUE"): Promise<ActionResult> {
  try {
    const offer = await db.offer.findUnique({ where: { id: offerId }, select: { companyId: true } });
    const guard = offer ? await companyEntityInScope(offer) : null;
    if (!guard || !guard.isAdmin) return { ok: false, error: "Offre hors de votre périmètre ou action réservée au responsable RH." };
    await db.offer.update({ where: { id: offerId }, data: { status } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour le statut de l'offre." };
  }
}

export async function deleteOffer(offerId: string): Promise<ActionResult> {
  try {
    const offer = await db.offer.findUnique({ where: { id: offerId }, select: { companyId: true } });
    const guard = offer ? await companyEntityInScope(offer) : null;
    if (!guard || !guard.isAdmin) return { ok: false, error: "Offre hors de votre périmètre ou action réservée au responsable RH." };
    const used = await db.candidature.count({ where: { offerId } });
    if (used > 0) {
      await db.offer.update({ where: { id: offerId }, data: { status: "BROUILLON" } });
      revalidateAll();
      return { ok: false, error: "Offre non supprimée : des candidatures y sont rattachées. Elle a été mise en brouillon." };
    }
    await db.offer.delete({ where: { id: offerId } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de supprimer l'offre." };
  }
}

/* =========================== CANDIDATURES =========================== */

export type CandidatureStatus =
  | "NOUVELLE"
  | "PRESELECTIONNEE"
  | "ENTRETIEN_PLANIFIE"
  | "OFFRE_ENVOYEE"
  | "ACCEPTEE"
  | "REFUSEE";

export async function moveCandidature(candidatureId: string, status: CandidatureStatus): Promise<ActionResult> {
  try {
    const candidature = await db.candidature.findUnique({ where: { id: candidatureId }, select: { companyId: true } });
    const guard = candidature ? await companyEntityInScope(candidature) : null;
    if (!guard) return { ok: false, error: "Candidature hors de votre périmètre." };
    await db.candidature.update({ where: { id: candidatureId }, data: { status } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de déplacer la candidature." };
  }
}

export async function scheduleInterview(candidatureId: string, interviewAtISO: string): Promise<ActionResult> {
  const date = new Date(interviewAtISO);
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Date d'entretien invalide." };
  const candidature = await db.candidature.findUnique({ where: { id: candidatureId }, select: { companyId: true } });
  const guard = candidature ? await companyEntityInScope(candidature) : null;
  if (!guard) return { ok: false, error: "Candidature hors de votre périmètre." };
  try {
    await db.candidature.update({
      where: { id: candidatureId },
      data: { interviewAt: date, status: "ENTRETIEN_PLANIFIE" },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de planifier l'entretien." };
  }
}

export interface CandidateAnalysis {
  score: number;
  summary: string;
  questions: string[];
  model?: string;
  fallback?: boolean;
}

export async function saveCandidatureAnalysis(candidatureId: string, analysis: CandidateAnalysis): Promise<ActionResult> {
  const candidature = await db.candidature.findUnique({ where: { id: candidatureId }, select: { companyId: true } });
  const guard = candidature ? await companyEntityInScope(candidature) : null;
  if (!guard) return { ok: false, error: "Candidature hors de votre périmètre." };
  try {
    await db.candidature.update({
      where: { id: candidatureId },
      data: {
        aiScore: analysis.score,
        aiSummary: analysis.summary,
        aiQuestions: analysis.questions.join("\n"),
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer l'analyse IA." };
  }
}

export interface ConvertInput {
  candidatureId: string;
  tutorId: string;
  startDateISO: string;
  totalWeeks: number;
}

export async function convertCandidatureToIntern(input: ConvertInput): Promise<ActionResult<{ internId: string }>> {
  const start = new Date(input.startDateISO);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Date de début de stage invalide." };
  if (!input.tutorId) return { ok: false, error: "Veuillez assigner un tuteur de stage." };
  if (input.totalWeeks < 1 || input.totalWeeks > 52) return { ok: false, error: "La durée du stage doit être entre 1 et 52 semaines." };
  const candidaturePre = await db.candidature.findUnique({ where: { id: input.candidatureId }, select: { companyId: true } });
  const guardPre = candidaturePre ? await companyEntityInScope(candidaturePre) : null;
  if (!guardPre || !guardPre.isAdmin) return { ok: false, error: "Conversion réservée au responsable RH de la société." };
  try {
    const candidature = await db.candidature.findUnique({
      where: { id: input.candidatureId },
      include: { offer: true, intern: true },
    });
    if (!candidature) return { ok: false, error: "Candidature introuvable." };
    if (candidature.intern) return { ok: false, error: "Ce candidat est déjà converti en stagiaire actif." };
    const checklist = [
      "Accès aux locaux et badge",
      "Configuration du poste de travail",
      "Création des accès Git, Figma & VPN",
      "Réunion de cadrage avec le tuteur",
      "Présentation de l'équipe et des outils",
      "Signature de la convention de stage",
      "Plan d'intégration validé avec le tuteur",
    ]
      .map((label, i) => `${i + 1}|${label}|[ ]`)
      .join("\n");
    const intern = await db.intern.create({
      data: {
        companyId: candidature.companyId,
        candidatureId: candidature.id,
        name: candidature.studentName,
        matricule: candidature.matricule,
        university: candidature.university,
        email: candidature.email,
        position: candidature.offer?.title ?? "Stagiaire",
        tutorId: input.tutorId,
        startDate: start,
        endDate: new Date(start.getTime() + input.totalWeeks * 7 * 86400000),
        totalWeeks: input.totalWeeks,
        status: "ACTIF",
        onboarding: checklist,
      },
    });
    await db.candidature.update({ where: { id: input.candidatureId }, data: { status: "ACCEPTEE" } });
    revalidateAll();
    return { ok: true, data: { internId: intern.id } };
  } catch {
    return { ok: false, error: "Impossible de convertir la candidature en stagiaire actif." };
  }
}

/* ============================ STAGIAIRES ============================ */

export async function toggleOnboardingItem(internId: string, itemIndex: number, done: boolean): Promise<ActionResult> {
  const guard = await internInScope(internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    const intern = await db.intern.findUnique({ where: { id: internId } });
    if (!intern) return { ok: false, error: "Stagiaire introuvable." };
    const items = intern.onboarding.split("\n").filter(Boolean);
    if (itemIndex < 0 || itemIndex >= items.length) return { ok: false, error: "Élément de checklist introuvable." };
    const [num, label] = items[itemIndex].split("|");
    items[itemIndex] = `${num}|${label}|${done ? "[x]" : "[ ]"}`;
    await db.intern.update({ where: { id: internId }, data: { onboarding: items.join("\n") } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour la checklist d'onboarding." };
  }
}

export async function toggleVivierTag(internId: string, vivier: boolean): Promise<ActionResult> {
  const guard = await internInScope(internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    await db.intern.update({ where: { id: internId }, data: { vivierTag: vivier } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour le tag vivier." };
  }
}

export async function terminateIntern(internId: string): Promise<ActionResult> {
  const guard = await internInScope(internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    await db.intern.update({ where: { id: internId }, data: { status: "TERMINE" } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de clôturer le stage." };
  }
}

/* =========================== TÂCHES / SUIVI ========================= */

export interface TaskInput {
  internId: string;
  title: string;
  description?: string;
  week: number;
}

/** Cycle de vie d'une tâche : TODO → IN_PROGRESS → IN_REVIEW → DONE. */
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export async function createTask(input: TaskInput): Promise<ActionResult> {
  if (input.title.trim().length < 3) return { ok: false, error: "Le titre de la tâche doit contenir au moins 3 caractères." };
  const guard = await internInScope(input.internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    await db.internshipTask.create({
      data: {
        internId: input.internId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        week: input.week,
        status: "TODO",
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de créer la tâche." };
  }
}

export interface AiTask {
  title: string;
  description: string;
}

export async function saveAiTasks(internId: string, week: number, tasks: AiTask[]): Promise<ActionResult<{ count: number }>> {
  if (tasks.length === 0) return { ok: false, error: "Aucune tâche à enregistrer." };
  const guard = await internInScope(internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    await db.internshipTask.createMany({
      data: tasks.slice(0, 10).map((t) => ({
        internId,
        title: t.title.slice(0, 140),
        description: t.description.slice(0, 400) || null,
        week,
        status: "TODO" as TaskStatus,
        aiSuggested: true,
      })),
    });
    revalidateAll();
    return { ok: true, data: { count: tasks.length } };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer les tâches suggérées par l'IA." };
  }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const task = await db.internshipTask.findUnique({ where: { id: taskId }, select: { internId: true } });
  const guard = task ? await internInScope(task.internId) : null;
  if (!guard) return { ok: false, error: "Tâche hors de votre périmètre." };
  try {
    await db.internshipTask.update({ where: { id: taskId }, data: { status } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour la tâche." };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const task = await db.internshipTask.findUnique({ where: { id: taskId }, select: { internId: true } });
  const guard = task ? await internInScope(task.internId) : null;
  if (!guard) return { ok: false, error: "Tâche hors de votre périmètre." };
  try {
    await db.internshipTask.delete({ where: { id: taskId } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de supprimer la tâche." };
  }
}

/** Retour du tuteur sur un journal hebdomadaire (WeeklyJournal.tutorFeedback). */
export async function addJournalFeedback(journalId: string, feedback: string): Promise<ActionResult> {
  const text = feedback.trim();
  if (text.length < 5) return { ok: false, error: "Le retour doit contenir au moins 5 caractères." };
  const journal = await db.weeklyJournal.findUnique({
    where: { id: journalId },
    select: { internId: true },
  });
  const guard = journal ? await internInScope(journal.internId) : null;
  if (!guard) return { ok: false, error: "Journal hors de votre périmètre." };
  try {
    await db.weeklyJournal.update({ where: { id: journalId }, data: { tutorFeedback: text } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le retour sur le journal." };
  }
}

export async function validatePresenceSheet(sheetId: string, approve: boolean): Promise<ActionResult> {
  const sheet = await db.presenceSheet.findUnique({ where: { id: sheetId }, select: { internId: true } });
  const guard = sheet ? await internInScope(sheet.internId) : null;
  if (!guard) return { ok: false, error: "Feuille de présence hors de votre périmètre." };
  try {
    await db.presenceSheet.update({
      where: { id: sheetId },
      data: { status: approve ? "VALIDEE" : "REJETEE" },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de traiter la feuille de présence." };
  }
}

/* ======================= DOCUMENTS / CONVENTIONS ==================== */

export async function signConvention(conventionId: string, party: "company" | "student" | "university"): Promise<ActionResult> {
  const convention = await db.convention.findUnique({ where: { id: conventionId }, select: { companyId: true } });
  const guard = convention ? await companyEntityInScope(convention) : null;
  if (!guard) return { ok: false, error: "Convention hors de votre périmètre." };
  if (party !== "company" && !guard.isAdmin) {
    return { ok: false, error: "Seul le responsable RH valide les signatures autres que celle de l'entreprise." };
  }
  try {
    const data =
      party === "company"
        ? { signedCompany: true }
        : party === "student"
          ? { signedStudent: true }
          : { signedUniversity: true };
    const updated = await db.convention.update({ where: { id: conventionId }, data });
    const fullySigned = updated.signedStudent && updated.signedCompany && updated.signedUniversity;
    await db.convention.update({
      where: { id: conventionId },
      data: { status: fullySigned ? "SIGNEE" : "EN_ATTENTE" },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer la signature." };
  }
}

export async function generateAttestation(internId: string): Promise<ActionResult<{ reference: string; content: string }>> {
  const guard = await internInScope(internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    const intern = await db.intern.findUnique({ where: { id: internId }, include: { attestation: true } });
    if (!intern) return { ok: false, error: "Stagiaire introuvable." };
    if (intern.attestation) {
      return { ok: true, data: { reference: intern.attestation.reference, content: intern.attestation.content } };
    }
    const company = await db.company.findUnique({ where: { id: intern.companyId } });
    const count = await db.attestation.count();
    const reference = `ATT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
    const content = attestationContent({
      companyName: company?.name ?? "KKiaPay",
      city: company?.city ?? "Cotonou",
      studentName: intern.name,
      matricule: intern.matricule,
      university: intern.university,
      position: intern.position,
      startDate: intern.startDate,
      endDate: intern.endDate,
      tutorName: "Marcelle Ahouansou",
    });
    await db.attestation.create({ data: { internId, reference, content } });
    revalidateAll();
    return { ok: true, data: { reference, content } };
  } catch {
    return { ok: false, error: "Impossible de générer l'attestation de fin de stage." };
  }
}

/* =========================== ÉVALUATIONS ============================ */

export interface EvaluationInput {
  internId: string;
  technique: number;
  ponctualite: number;
  autonomie: number;
  espritEquipe: number;
  appreciation: string;
  recommandation: "FORTEMENT_RECOMMANDE" | "RECOMMANDE" | "NEUTRE" | "NON_RECOMMANDE";
  finalized: boolean;
}

export async function saveEvaluation(input: EvaluationInput): Promise<ActionResult> {
  const ratings = [input.technique, input.ponctualite, input.autonomie, input.espritEquipe];
  if (ratings.some((r) => r < 0 || r > 5)) return { ok: false, error: "Les notes doivent être comprises entre 0 et 5." };
  if (input.finalized && input.appreciation.trim().length < 30) {
    return { ok: false, error: "L'appréciation doit contenir au moins 30 caractères pour finaliser l'évaluation." };
  }
  const guard = await internInScope(input.internId);
  if (!guard) return { ok: false, error: "Stagiaire hors de votre périmètre." };
  try {
    await db.evaluation.upsert({
      where: { internId: input.internId },
      create: {
        internId: input.internId,
        technique: input.technique,
        ponctualite: input.ponctualite,
        autonomie: input.autonomie,
        espritEquipe: input.espritEquipe,
        appreciation: input.appreciation.trim(),
        recommandation: input.recommandation,
        finalized: input.finalized,
      },
      update: {
        technique: input.technique,
        ponctualite: input.ponctualite,
        autonomie: input.autonomie,
        espritEquipe: input.espritEquipe,
        appreciation: input.appreciation.trim(),
        recommandation: input.recommandation,
        finalized: input.finalized,
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer l'évaluation." };
  }
}

/* ======================= PROFIL PERSONNEL TUTEUR ======================= */

export interface TutorProfileInput {
  position: string;
  phone: string;
  avatarUrl?: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Profil du membre connecté (Tuteur / Maître de Stage) : fonction, téléphone,
 * avatar (photo data URL ou SVG généré) et mot de passe. Enregistre
 * l'onboarding (profileCompleted = true) et re-signe le JWT.
 */
export async function updateTutorProfile(input: TutorProfileInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "COMPANY" || !user.teamMember) {
    return { ok: false, error: "Session entreprise introuvable — reconnectez-vous." };
  }
  const position = input.position.trim();
  if (position.length < 3) return { ok: false, error: "La fonction est requise (3 caractères minimum)." };
  if (input.newPassword.length < 8) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  }
  if (!/[A-Za-z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins une lettre et un chiffre." };
  }
  try {
    const row = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!row) return { ok: false, error: "Compte introuvable." };
    const valid = await verifyPassword(input.currentPassword, row.passwordHash);
    if (!valid) return { ok: false, error: "Le mot de passe actuel est incorrect." };

    await db.teamMember.update({
      where: { id: user.teamMember.id },
      data: { position, phone: input.phone.trim() || null },
    });
    await db.user.update({
      where: { id: row.id },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        avatarUrl: input.avatarUrl?.trim() || null,
        profileCompleted: true,
      },
    });
    await refreshSessionAfterProfileUpdate(row.id);
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer votre profil." };
  }
}

/* ============================ PARAMÈTRES ============================ */

export interface CompanyProfileInput {
  name: string;
  sector: string;
  city: string;
  description: string;
  website?: string;
}

export async function saveCompanyProfile(input: CompanyProfileInput): Promise<ActionResult> {
  if (input.name.trim().length < 2) return { ok: false, error: "Le nom de l'entreprise est requis." };
  if (input.description.trim().length < 30) return { ok: false, error: "La description de la vitrine doit contenir au moins 30 caractères." };
  const guard = await requireCompanyScope();
  if (!guard) return { ok: false, error: "Entreprise introuvable." };
  if (!guard.isAdmin) return { ok: false, error: "Seul un responsable RH peut modifier la vitrine de l'entreprise." };
  try {
    await db.company.update({
      where: { id: guard.companyId },
      data: {
        name: input.name.trim(),
        sector: input.sector,
        city: input.city,
        description: input.description.trim(),
        website: input.website?.trim() || null,
      },
    });
    // Onboarding complété : JWT re-signé (profileCompleted = true).
    const sessionUser = await getSessionUser();
    if (sessionUser?.teamMember?.companyId === guard.companyId) {
      await db.user.update({ where: { id: sessionUser.id }, data: { profileCompleted: true } });
      await refreshSessionAfterProfileUpdate(sessionUser.id);
    }
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer la vitrine entreprise." };
  }
}

export interface TeamMemberInput {
  name: string;
  email: string;
  role: "ADMIN_RH" | "TUTEUR";
  phone?: string;
}

export async function addTeamMember(input: TeamMemberInput): Promise<ActionResult> {
  if (input.name.trim().length < 3) return { ok: false, error: "Le nom du membre doit contenir au moins 3 caractères." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { ok: false, error: "Adresse email professionnelle invalide." };
  const guard = await requireCompanyScope();
  if (!guard || !guard.isAdmin) return { ok: false, error: "Seul un responsable RH peut gérer l'équipe." };
  try {
    const company = await db.company.findUnique({ where: { id: guard.companyId }, select: { id: true } });
    if (!company) return { ok: false, error: "Entreprise introuvable." };
    const exists = await db.teamMember.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (exists) return { ok: false, error: "Un membre avec cet email existe déjà." };
    await db.teamMember.create({
      data: {
        companyId: company.id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        phone: input.phone?.trim() || null,
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'ajouter le membre de l'équipe." };
  }
}

export async function removeTeamMember(memberId: string): Promise<ActionResult> {
  const guard = await requireCompanyScope();
  if (!guard || !guard.isAdmin) return { ok: false, error: "Seul un responsable RH peut gérer l'équipe." };
  try {
    const member = await db.teamMember.findUnique({ where: { id: memberId }, select: { companyId: true } });
    if (!member || member.companyId !== guard.companyId) {
      return { ok: false, error: "Membre hors de votre société." };
    }
    const assigned = await db.intern.count({ where: { tutorId: memberId } });
    if (assigned > 0) return { ok: false, error: "Ce tuteur supervise des stagiaires actifs : réassignez-les avant de le retirer." };
    await db.teamMember.delete({ where: { id: memberId } });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de retirer ce membre." };
  }
}
