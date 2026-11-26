"use server";

/**
 * Server Actions du Dashboard Établissement StageTrack.
 * -----------------------------------------------------
 * Permissions strictes : les actions « Admin Université » vérifient
 * role === ADMIN_SCHOOL, les actions « Chef de Département » vérifient
 * role === HEAD_OF_DEPARTMENT, et toute écriture est bornée au périmètre
 * (université / département) du membre de session courante.
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { refreshSessionAfterProfileUpdate } from "@/lib/session";
import {
  ETAB_SESSION_COOKIE,
  getEtablissementContext,
  type EtablissementContext,
} from "@/lib/etablissement-data";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface HeadCredentials {
  email: string;
  fullName: string;
  tempPassword: string;
  departmentCode: string;
  departmentName: string;
}

const ETABLISSEMENT_PATHS = [
  "/etablissement",
  "/etablissement/dashboard",
  "/etablissement/departements",
  "/etablissement/encadreurs",
  "/etablissement/etudiants",
  "/etablissement/conventions",
  "/etablissement/suivi",
  "/etablissement/evaluations",
  "/etablissement/encadrement",
  "/etablissement/parametres",
];

const SIDE_EFFECT_PATHS = [
  "/etudiant",
  "/etudiant/dashboard",
  "/etudiant/mon-stage",
  "/etudiant/documents",
  "/etudiant/profil",
  "/entreprise/documents",
  "/entreprise/stagiaires",
  "/entreprise/evaluations",
];

function revalidateAll(): void {
  for (const path of [...ETABLISSEMENT_PATHS, ...SIDE_EFFECT_PATHS]) revalidatePath(path);
}

const hashPasswordFn = (plain: string) => hashPassword(plain);

/** Mot de passe temporaire lisible et sécurisé : « StageTrack@XXXX-XX! ». */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const letters = alphabet[bytes[0] % alphabet.length] + alphabet[bytes[1] % alphabet.length];
  const digits = String(((bytes[2] << 8) | bytes[3]) % 10000).padStart(4, "0");
  return `StageTrack@${letters}${digits}!`;
}

/* ============================== SESSION DÉMO ============================== */

export async function switchEtablissementSession(memberId: string): Promise<ActionResult> {
  const target = memberId.trim();
  try {
    const ctx = await getEtablissementContext();
    if (!ctx) return { ok: false, error: "Session établissement introuvable." };
    if (!target) return { ok: false, error: "Membre cible invalide." };
    // Le sélecteur bascule uniquement entre les membres du MÊME établissement.
    const member = await db.universityMember.findUnique({ where: { id: target }, select: { id: true, universityId: true } });
    if (!member || member.universityId !== ctx.universityId) {
      return { ok: false, error: "Membre université introuvable dans votre établissement." };
    }
    const store = await cookies();
    store.set(ETAB_SESSION_COOKIE, target, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    revalidatePath("/");
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de changer de session de démonstration." };
  }
}

/* ============================== GARDES ============================== */

async function requireAdmin(): Promise<ActionResult<undefined> | EtablissementContext> {
  const ctx = await getEtablissementContext();
  if (!ctx) return { ok: false, error: "Base de données inaccessible — vérifiez DATABASE_URL." };
  if (ctx.role !== "ADMIN_SCHOOL") {
    return { ok: false, error: "Action réservée à l'Admin Université (Direction des Stages)." };
  }
  return ctx;
}

async function requireChef(): Promise<ActionResult<undefined> | EtablissementContext> {
  const ctx = await getEtablissementContext();
  if (!ctx) return { ok: false, error: "Base de données inaccessible — vérifiez DATABASE_URL." };
  if (ctx.role !== "HEAD_OF_DEPARTMENT" || !ctx.departmentId) {
    return { ok: false, error: "Action réservée au Chef de Département." };
  }
  return ctx;
}

/* ============================== DÉPARTEMENTS (ADMIN) ============================== */

export interface CreateDepartmentInput {
  name: string;
  code: string;
  specialties: string[];
  headFullName: string;
  headEmail: string;
}

export async function createDepartmentWithHead(input: CreateDepartmentInput): Promise<ActionResult<HeadCredentials>> {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const headFullName = input.headFullName.trim();
  const headEmail = input.headEmail.trim().toLowerCase();
  const specialties = input.specialties.map((s) => s.trim()).filter(Boolean).slice(0, 12);

  if (name.length < 4) return { ok: false, error: "Le nom du département est requis (4 caractères minimum)." };
  if (!/^[A-Z0-9]{2,6}$/.test(code)) return { ok: false, error: "Le code du département doit contenir 2 à 6 lettres/chiffres (ex. GEI)." };
  if (specialties.length < 1) return { ok: false, error: "Ajoutez au moins une spécialité au département." };
  if (headFullName.length < 4) return { ok: false, error: "Le nom complet du Chef de Département est requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(headEmail)) return { ok: false, error: "Email institutionnel du Chef invalide." };

  const guard = await requireAdmin();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  const tempPassword = generateTempPassword();
  try {
    const duplicate = await db.department.findUnique({
      where: { universityId_code: { universityId: ctx.universityId, code } },
      select: { id: true },
    });
    if (duplicate) return { ok: false, error: `Le code « ${code} » existe déjà dans votre établissement.` };
    const emailTaken = await db.user.findUnique({ where: { email: headEmail }, select: { id: true } });
    if (emailTaken) return { ok: false, error: "Un compte utilise déjà cet email institutionnel." };

    const department = await db.department.create({
      data: { universityId: ctx.universityId, name, code, specialties },
      select: { id: true, name: true, code: true },
    });

    const user = await db.user.create({
      data: {
        email: headEmail,
        passwordHash: await hashPasswordFn(tempPassword),
        fullName: headFullName,
        role: "UNIVERSITY",
        // Première connexion : le Chef devra compléter son profil (onboarding).
        profileCompleted: false,
      },
      select: { id: true },
    });
    await db.universityMember.create({
      data: {
        userId: user.id,
        universityId: ctx.universityId,
        departmentId: department.id,
        role: "HEAD_OF_DEPARTMENT",
        title: `Chef du Département ${code}`,
      },
    });

    revalidateAll();
    return {
      ok: true,
      data: {
        email: headEmail,
        fullName: headFullName,
        tempPassword,
        departmentCode: department.code,
        departmentName: department.name,
      },
    };
  } catch {
    return { ok: false, error: "Impossible de créer le département (erreur base de données)." };
  }
}

export async function resetDepartmentHeadPassword(memberId: string): Promise<ActionResult<HeadCredentials>> {
  const guard = await requireAdmin();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  try {
    const member = await db.universityMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, email: true, fullName: true } }, department: { select: { code: true, name: true } } },
    });
    if (!member || member.universityId !== ctx.universityId) {
      return { ok: false, error: "Chef de Département introuvable dans votre établissement." };
    }
    if (member.role !== "HEAD_OF_DEPARTMENT") {
      return { ok: false, error: "Seul le mot de passe d'un Chef de Département peut être réinitialisé ici." };
    }
    const tempPassword = generateTempPassword();
    await db.user.update({ where: { id: member.user.id }, data: { passwordHash: await hashPasswordFn(tempPassword) } });
    revalidateAll();
    return {
      ok: true,
      data: {
        email: member.user.email,
        fullName: member.user.fullName,
        tempPassword,
        departmentCode: member.department?.code ?? "—",
        departmentName: member.department?.name ?? "",
      },
    };
  } catch {
    return { ok: false, error: "Impossible de réinitialiser le mot de passe." };
  }
}

export interface ReplaceHeadInput {
  departmentId: string;
  headFullName: string;
  headEmail: string;
}

export async function replaceDepartmentHead(input: ReplaceHeadInput): Promise<ActionResult<HeadCredentials>> {
  const headFullName = input.headFullName.trim();
  const headEmail = input.headEmail.trim().toLowerCase();
  if (headFullName.length < 4) return { ok: false, error: "Le nom complet du nouveau Chef est requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(headEmail)) return { ok: false, error: "Email institutionnel du nouveau Chef invalide." };

  const guard = await requireAdmin();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  const tempPassword = generateTempPassword();
  try {
    const department = await db.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true, code: true, name: true, universityId: true },
    });
    if (!department || department.universityId !== ctx.universityId) {
      return { ok: false, error: "Département introuvable dans votre établissement." };
    }
    const currentHead = await db.universityMember.findFirst({
      where: { departmentId: department.id, role: "HEAD_OF_DEPARTMENT" },
      include: { user: { select: { id: true, email: true } } },
    });
    if (currentHead?.user.email === headEmail) {
      return { ok: false, error: "Ce membre est déjà le Chef de ce département." };
    }
    const emailTaken = await db.user.findUnique({ where: { email: headEmail }, select: { id: true } });
    if (emailTaken) return { ok: false, error: "Un compte utilise déjà cet email institutionnel." };

    const user = await db.user.create({
      data: {
        email: headEmail,
        passwordHash: await hashPasswordFn(tempPassword),
        fullName: headFullName,
        role: "UNIVERSITY",
        profileCompleted: false,
      },
      select: { id: true },
    });
    await db.universityMember.create({
      data: {
        userId: user.id,
        universityId: ctx.universityId,
        departmentId: department.id,
        role: "HEAD_OF_DEPARTMENT",
        title: `Chef du Département ${department.code}`,
      },
    });
    // Remplacement : l'ancien chef perd le département (compte conservé)
    if (currentHead) {
      await db.universityMember.update({
        where: { id: currentHead.id },
        data: { departmentId: null, title: `${currentHead.title ?? "Chef de Département"} (remplacé)` },
      });
      // La session démo ne doit plus pointer vers un chef sans département
      const store = await cookies();
      if (store.get(ETAB_SESSION_COOKIE)?.value === currentHead.id) {
        store.set(ETAB_SESSION_COOKIE, "admin", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      }
    }

    revalidateAll();
    return {
      ok: true,
      data: {
        email: headEmail,
        fullName: headFullName,
        tempPassword,
        departmentCode: department.code,
        departmentName: department.name,
      },
    };
  } catch {
    return { ok: false, error: "Impossible de remplacer le Chef de Département." };
  }
}

/* ============================== CONVENTIONS ============================== */

export interface VisaInput {
  conventionId: string;
  approved: boolean;
  note?: string;
}

export async function approvePedagogicalSubject(input: VisaInput): Promise<ActionResult> {
  const guard = await requireChef();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  const note = (input.note ?? "").trim();
  if (input.approved && note.length < 10) {
    return { ok: false, error: "Ajoutez une note d'avis pédagogique (10 caractères minimum) pour accorder le visa." };
  }
  if (!input.approved && note.length < 10) {
    return { ok: false, error: "Motivez le visa réservé (10 caractères minimum)." };
  }

  try {
    const convention = await db.convention.findUnique({
      where: { id: input.conventionId },
      select: { id: true, departmentId: true, signedStudent: true, signedCompany: true, pedagogicalApproved: true, signedUniversity: true },
    });
    if (!convention || convention.departmentId !== ctx.departmentId) {
      return { ok: false, error: "Convention hors de votre périmètre de département." };
    }
    if (!convention.signedStudent || !convention.signedCompany) {
      return { ok: false, error: "Les signatures étudiant et entreprise sont requises avant le visa pédagogique." };
    }
    if (convention.signedUniversity) {
      return { ok: false, error: "Convention déjà signée par la Direction des Stages — circuit terminé." };
    }
    await db.convention.update({
      where: { id: convention.id },
      data: { pedagogicalApproved: input.approved, pedagogicalNote: note },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le visa pédagogique." };
  }
}

export async function signUniversityConvention(conventionId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  try {
    const convention = await db.convention.findUnique({
      where: { id: conventionId },
      select: { id: true, departmentId: true, signedStudent: true, signedCompany: true, pedagogicalApproved: true, signedUniversity: true },
    });
    if (!convention) return { ok: false, error: "Convention introuvable." };
    if (ctx.isChef && convention.departmentId !== ctx.departmentId) {
      return { ok: false, error: "Convention hors de votre périmètre de département." };
    }
    if (!convention.signedStudent || !convention.signedCompany) {
      return { ok: false, error: "Signatures étudiant et entreprise manquantes." };
    }
    if (!convention.pedagogicalApproved) {
      return { ok: false, error: "Le visa pédagogique du Chef de Département est requis avant la signature officielle." };
    }
    if (convention.signedUniversity) return { ok: false, error: "Convention déjà signée par la Direction des Stages." };

    await db.convention.update({
      where: { id: convention.id },
      data: { signedUniversity: true, status: "SIGNEE" },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer la signature officielle." };
  }
}

/* ============================== PARAMÈTRES ÉCOLE (ADMIN) ============================== */

export interface UniversitySettingsInput {
  name: string;
  acronym: string;
  city: string;
}

export async function updateUniversitySettings(input: UniversitySettingsInput): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  const name = input.name.trim();
  const acronym = input.acronym.trim().toUpperCase();
  const city = input.city.trim();
  if (name.length < 6) return { ok: false, error: "Le nom de l'établissement est requis (6 caractères minimum)." };
  if (!/^[A-Z0-9]{2,10}$/.test(acronym)) return { ok: false, error: "Le sigle doit contenir 2 à 10 lettres/chiffres (ex. INSTI)." };

  try {
    const clash = await db.universityProfile.findUnique({ where: { acronym }, select: { id: true } });
    if (clash && clash.id !== ctx.universityId) {
      return { ok: false, error: `Le sigle « ${acronym} » est déjà utilisé par un autre établissement.` };
    }
    await db.universityProfile.update({
      where: { id: ctx.universityId },
      data: { name, acronym, city: city || null },
    });
    // Enregistrement des informations établissement = onboarding complété
    // (le cookie JWT est re-signé avec profileCompleted = true).
    await db.user.update({ where: { id: ctx.sessionUserId }, data: { profileCompleted: true } });
    await refreshSessionAfterProfileUpdate(ctx.sessionUserId);
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer les paramètres de l'établissement." };
  }
}

/* ============================== PROFIL MEMBRE (CHEF / MAÎTRE DE MÉMOIRE) ============================== */

export interface MemberProfileInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Profil du membre connecté (Chef de Département ou Maître de Mémoire) :
 * changement de mot de passe + confirmation des informations personnelles.
 * Enregistre l'onboarding (profileCompleted = true) et re-signe le JWT.
 */
export async function updateUniversityMemberProfile(input: MemberProfileInput): Promise<ActionResult> {
  const ctx = await getEtablissementContext();
  if (!ctx) return { ok: false, error: "Session établissement introuvable — reconnectez-vous." };
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  if (newPassword.length < 8) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  }
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins une lettre et un chiffre." };
  }

  try {
    const sessionUser = await db.user.findUnique({
      where: { id: ctx.sessionUserId },
      select: { id: true, passwordHash: true, fullName: true, email: true, role: true, profileCompleted: true },
    });
    if (!sessionUser) return { ok: false, error: "Session introuvable." };

    const valid = await verifyPassword(currentPassword, sessionUser.passwordHash);
    if (!valid) return { ok: false, error: "Le mot de passe actuel est incorrect." };

    await db.user.update({
      where: { id: sessionUser.id },
      data: { passwordHash: await hashPasswordFn(newPassword), profileCompleted: true },
    });
    await refreshSessionAfterProfileUpdate(sessionUser.id);
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer votre profil." };
  }
}

/* ============================== MAÎTRES DE MÉMOIRE (CHEF) ============================== */

export interface SupervisorCredentials {
  email: string;
  fullName: string;
  tempPassword: string;
  grade: string;
  maxWorkload: number;
}

export interface CreateSupervisorInput {
  fullName: string;
  email: string;
  grade: string;
}

/**
 * Création d'un compte Maître de Mémoire (ACADEMIC_SUPERVISOR) par le Chef de
 * Département : mot de passe temporaire affiché une fois (popup copiable),
 * onboarding obligatoire à la première connexion.
 */
export async function createSupervisorAccount(input: CreateSupervisorInput): Promise<ActionResult<SupervisorCredentials>> {
  const guard = await requireChef();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const grade = input.grade.trim() || "Enseignant-chercheur";
  if (fullName.length < 4) return { ok: false, error: "Le nom complet du Maître de Mémoire est requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Email institutionnel invalide." };
  if (grade.length < 3) return { ok: false, error: "Le grade / titre est requis (ex. Prof., Dr.)." };

  const tempPassword = generateTempPassword();
  try {
    const emailTaken = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (emailTaken) return { ok: false, error: "Un compte utilise déjà cet email institutionnel." };

    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPasswordFn(tempPassword),
        fullName,
        role: "UNIVERSITY",
        profileCompleted: false, // première connexion : onboarding obligatoire
      },
      select: { id: true },
    });
    await db.universityMember.create({
      data: {
        userId: user.id,
        universityId: ctx.universityId,
        departmentId: ctx.departmentId,
        role: "ACADEMIC_SUPERVISOR",
        title: `${grade} — Maître de Mémoire`,
      },
    });

    revalidateAll();
    return {
      ok: true,
      data: { email, fullName, tempPassword, grade, maxWorkload: 6 },
    };
  } catch {
    return { ok: false, error: "Impossible de créer le compte Maître de Mémoire." };
  }
}

/** Réinitialisation du mot de passe d'un Maître de Mémoire du département (Chef). */
export async function resetSupervisorPassword(memberId: string): Promise<ActionResult<SupervisorCredentials>> {
  const guard = await requireChef();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  try {
    const member = await db.universityMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!member || member.universityId !== ctx.universityId || member.role !== "ACADEMIC_SUPERVISOR") {
      return { ok: false, error: "Maître de Mémoire introuvable dans votre département." };
    }
    const tempPassword = generateTempPassword();
    await db.user.update({
      where: { id: member.user.id },
      data: { passwordHash: await hashPasswordFn(tempPassword), profileCompleted: false },
    });
    revalidateAll();
    return {
      ok: true,
      data: {
        email: member.user.email,
        fullName: member.user.fullName,
        tempPassword,
        grade: member.title?.split("—")[0]?.trim() ?? "Maître de Mémoire",
        maxWorkload: 6,
      },
    };
  } catch {
    return { ok: false, error: "Impossible de réinitialiser le mot de passe." };
  }
}

/* ============================== AFFECTATION MÉMOIRE (CHEF) ============================== */

/** Assigne (ou retire) un Maître de Mémoire sur le stage d'un étudiant du département. */
export async function assignThesisSupervisor(internId: string, supervisorMemberId: string | null): Promise<ActionResult> {
  const guard = await requireChef();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  try {
    const intern = await db.intern.findUnique({
      where: { id: internId },
      select: { id: true, departmentId: true },
    });
    if (!intern || intern.departmentId !== ctx.departmentId) {
      return { ok: false, error: "Stage hors de votre département." };
    }
    if (supervisorMemberId) {
      const supervisor = await db.universityMember.findUnique({
        where: { id: supervisorMemberId },
        select: { id: true, universityId: true, role: true },
      });
      if (!supervisor || supervisor.universityId !== ctx.universityId || supervisor.role !== "ACADEMIC_SUPERVISOR") {
        return { ok: false, error: "Maître de Mémoire invalide." };
      }
    }
    await db.intern.update({
      where: { id: internId },
      data: { thesisSupervisorId: supervisorMemberId },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'affecter le Maître de Mémoire." };
  }
}

/* ============================== VALIDATION DU MÉMOIRE (MAÎTRE DE MÉMOIRE) ============================== */

async function requireSupervisor(): Promise<ActionResult<undefined> | EtablissementContext> {
  const ctx = await getEtablissementContext();
  if (!ctx) return { ok: false, error: "Base de données inaccessible — vérifiez DATABASE_URL." };
  if (ctx.role !== "ACADEMIC_SUPERVISOR") {
    return { ok: false, error: "Action réservée au Maître de Mémoire." };
  }
  return ctx;
}

/** Garde-fou : le stage doit être encadré par le Maître de Mémoire connecté. */
async function supervisedInternInScope(internId: string, memberId: string): Promise<boolean> {
  const intern = await db.intern.findUnique({
    where: { id: internId },
    select: { thesisSupervisorId: true },
  });
  return intern?.thesisSupervisorId === memberId;
}

/** ① Valider le thème du mémoire (TOPIC_APPROVED). */
export async function approveThesisTopic(internId: string, note?: string): Promise<ActionResult> {
  const guard = await requireSupervisor();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  if (!(await supervisedInternInScope(internId, ctx.memberId))) {
    return { ok: false, error: "Ce mémoire n'est pas sous votre encadrement." };
  }
  try {
    const intern = await db.intern.findUnique({ where: { id: internId }, select: { thesisStatus: true } });
    if (!intern) return { ok: false, error: "Stage introuvable." };
    if (intern.thesisStatus === "READY_TO_DEFEND") {
      return { ok: false, error: "Le Bon à Soutenir est déjà délivré pour ce mémoire." };
    }
    await db.intern.update({
      where: { id: internId },
      data: {
        thesisStatus: "TOPIC_APPROVED",
        supervisorFeedback: (note ?? "").trim() || "Thème validé — problématique claire et cohérente avec la spécialité. Constituez votre bibliographie dès maintenant.",
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de valider le thème." };
  }
}

/** ② Demander des corrections (REVISION_REQUESTED + feedback obligatoire). */
export async function requestThesisCorrections(internId: string, feedback: string): Promise<ActionResult> {
  const guard = await requireSupervisor();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  const text = feedback.trim();
  if (text.length < 15) return { ok: false, error: "Décrivez les corrections attendues (15 caractères minimum)." };
  if (!(await supervisedInternInScope(internId, ctx.memberId))) {
    return { ok: false, error: "Ce mémoire n'est pas sous votre encadrement." };
  }
  try {
    await db.intern.update({
      where: { id: internId },
      data: { thesisStatus: "REVISION_REQUESTED", supervisorFeedback: text },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer la demande de corrections." };
  }
}

/** ③ Délivrer le Bon à Soutenir (READY_TO_DEFEND + approvedToDefendAt) — thème validé requis. */
export async function deliverReadyToDefend(internId: string): Promise<ActionResult> {
  const guard = await requireSupervisor();
  if ("ok" in guard && guard.ok === false) return { ok: false, error: guard.error };
  const ctx = guard as EtablissementContext;

  if (!(await supervisedInternInScope(internId, ctx.memberId))) {
    return { ok: false, error: "Ce mémoire n'est pas sous votre encadrement." };
  }
  try {
    const intern = await db.intern.findUnique({ where: { id: internId }, select: { thesisStatus: true } });
    if (!intern) return { ok: false, error: "Stage introuvable." };
    if (intern.thesisStatus === "READY_TO_DEFEND") {
      return { ok: false, error: "Le Bon à Soutenir est déjà délivré." };
    }
    if (intern.thesisStatus !== "TOPIC_APPROVED") {
      return { ok: false, error: "Validez d'abord le thème du mémoire avant de délivrer le Bon à Soutenir." };
    }
    await db.intern.update({
      where: { id: internId },
      data: {
        thesisStatus: "READY_TO_DEFEND",
        approvedToDefendAt: new Date(),
        supervisorFeedback:
          "Bon à Soutenir délivré — mémoire autorisé à être soutenu devant le jury. Bonne préparation de la soutenance.",
      },
    });
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de délivrer le Bon à Soutenir." };
  }
}

/* ============================== PROFIL MEMBRE — ONBOARDING 3 ÉTAPES ============================== */

export interface MemberOnboardingInput {
  title: string;
  avatarUrl?: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * Onboarding du membre connecté (Chef de Département / Maître de Mémoire) :
 * photo de profil (upload data URL ou avatar SVG auto-généré), fonction/grade
 * et nouveau mot de passe. Passe profileCompleted à true et re-signe le JWT.
 * Porte toujours sur le compte de SESSION (jamais sur la prévisualisation).
 */
export async function updateMemberOnboarding(input: MemberOnboardingInput): Promise<ActionResult> {
  const ctx = await getEtablissementContext();
  if (!ctx) return { ok: false, error: "Session établissement introuvable — reconnectez-vous." };

  const title = input.title.trim();
  if (title.length < 4) return { ok: false, error: "Votre fonction / grade est requis (4 caractères minimum)." };
  if (input.newPassword.length < 8) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  }
  if (!/[A-Za-z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins une lettre et un chiffre." };
  }
  if (input.avatarUrl && input.avatarUrl.length > 10_000_000) {
    return { ok: false, error: "Photo trop volumineuse (10 Mo maximum) — utilisez un avatar généré." };
  }

  try {
    const sessionUser = await db.user.findUnique({
      where: { id: ctx.sessionUserId },
      select: { id: true, passwordHash: true, universityMember: { select: { id: true } } },
    });
    if (!sessionUser) return { ok: false, error: "Session introuvable." };

    const valid = await verifyPassword(input.currentPassword, sessionUser.passwordHash);
    if (!valid) return { ok: false, error: "Le mot de passe actuel (temporaire reçu) est incorrect." };

    await db.user.update({
      where: { id: sessionUser.id },
      data: {
        passwordHash: await hashPasswordFn(input.newPassword),
        avatarUrl: input.avatarUrl?.trim() || null,
        profileCompleted: true,
      },
    });
    if (sessionUser.universityMember) {
      await db.universityMember.update({
        where: { id: sessionUser.universityMember.id },
        data: { title },
      });
    }
    await refreshSessionAfterProfileUpdate(sessionUser.id);
    revalidateAll();
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer votre profil." };
  }
}
