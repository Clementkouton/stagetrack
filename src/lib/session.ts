/**
 * Session StageTrack côté serveur (App Router / Server Actions / Route Handlers).
 * ------------------------------------------------------------------------------
 * `getSessionUser()` est la source de vérité unique : elle vérifie le JWT du
 * cookie `stagetrack_session` puis recharge l'utilisateur depuis PostgreSQL/Neon.
 * Les helpers de périmètre (`getStudentScope`, `getCompanyScope`,
 * `getUniversityScope`) alimentent le filtrage par rôle de toutes les
 * Server Actions : isAdmin vs tutorId côté Entreprise ; ADMIN_SCHOOL vs
 * departmentId vs thesisSupervisorId côté Université.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionRole,
  type UniversityMemberRoleToken,
} from "@/lib/jwt";
import type { SessionUser } from "@/lib/session-types";

export type { SessionRole, UniversityMemberRoleToken, SessionUser };

/** Lit la session courante (vérification JWT + rechargement base). Cached par requête. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      profileCompleted: true,
      avatarUrl: true,
      studentProfile: { select: { id: true, matricule: true, universityId: true, departmentId: true } },
      teamMember: {
        select: {
          id: true,
          companyId: true,
          role: true,
          company: { select: { id: true, name: true } },
        },
      },
      universityMember: {
        select: {
          id: true,
          role: true,
          title: true,
          universityId: true,
          departmentId: true,
          university: { select: { id: true, name: true, acronym: true } },
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as SessionRole,
    profileCompleted: user.profileCompleted,
    avatarUrl: user.avatarUrl,
    studentProfile: user.studentProfile,
    teamMember: user.teamMember,
    universityMember: user.universityMember,
  };
});

/** (Re)signe le cookie de session pour l'utilisateur donné — appelé après login ou rafraîchissement du profil. */
export async function setSessionCookie(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  profileCompleted: boolean;
  memberRole?: UniversityMemberRoleToken;
  companyAdmin?: boolean;
}): Promise<void> {
  const token = await signSessionToken({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role as SessionRole,
    profileCompleted: user.profileCompleted,
    memberRole: user.memberRole,
    companyAdmin: user.companyAdmin,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Déconnecte : suppression du cookie. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete("stg_etab_member"); // sélecteur de session démo établissement
}

/* ------------------------------ Périmètres ------------------------------ */

export interface StudentScope {
  studentId: string;
  matricule: string;
  universityId: string | null;
  departmentId: string | null;
}

/** Périmètre étudiant : le StudentProfile de l'utilisateur connecté (sinon null). */
export async function getStudentScope(): Promise<StudentScope | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT" || !user.studentProfile) return null;
  return {
    studentId: user.studentProfile.id,
    matricule: user.studentProfile.matricule,
    universityId: user.studentProfile.universityId,
    departmentId: user.studentProfile.departmentId,
  };
}

export interface CompanyScope {
  companyId: string;
  companyName: string;
  /** ADMIN_RH : accès complet à la société. */
  isAdmin: boolean;
  /** TUTEUR : identifiant TeamMember pour filtrer les stagiaires encadrés (intern.tutorId). */
  tutorId: string | null;
}

/** Périmètre entreprise : société du membre connecté + droits (isAdmin vs tutorId). */
export async function getCompanyScope(): Promise<CompanyScope | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "COMPANY" || !user.teamMember) return null;
  return {
    companyId: user.teamMember.companyId,
    companyName: user.teamMember.company.name,
    isAdmin: user.teamMember.role === "ADMIN_RH",
    tutorId: user.teamMember.role === "ADMIN_RH" ? null : user.teamMember.id,
  };
}

export interface UniversityScope {
  memberId: string;
  memberRole: UniversityMemberRoleToken;
  title: string | null;
  universityId: string;
  universityName: string;
  universityAcronym: string;
  departmentId: string | null;
  departmentCode: string | null;
}

/**
 * Périmètre université : membre connecté (Admin École / Chef / Maître de Mémoire).
 * Les données sont filtrées par departmentId (chef) ou thesisSupervisorId
 * (maître de mémoire) dans les actions et lectures de l'espace établissement.
 */
export async function getUniversityScope(): Promise<UniversityScope | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "UNIVERSITY" || !user.universityMember) return null;
  const member = user.universityMember;
  return {
    memberId: member.id,
    memberRole: member.role as UniversityMemberRoleToken,
    title: member.title,
    universityId: member.universityId,
    universityName: member.university.name,
    universityAcronym: member.university.acronym,
    departmentId: member.departmentId,
    departmentCode: member.department?.code ?? null,
  };
}

/**
 * Re-signe le cookie de session après une mise à jour de profil
 * (profileCompleted passé à true) pour que le proxy débloque l'accès
 * au dashboard sans nouvelle connexion.
 */
export async function refreshSessionAfterProfileUpdate(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      profileCompleted: true,
      universityMember: { select: { role: true } },
      teamMember: { select: { role: true } },
    },
  });
  if (!user) return;
  await setSessionCookie({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    profileCompleted: user.profileCompleted,
    memberRole: user.universityMember?.role as UniversityMemberRoleToken | undefined,
    companyAdmin: user.role === "COMPANY" ? user.teamMember?.role === "ADMIN_RH" : undefined,
  });
}
