/**
 * Types partagés de session StageTrack (importés par src/lib/session.ts).
 * Fichier séparé pour rester importable depuis le proxy (aucun import serveur lourd).
 */

export interface SessionStudentRef {
  id: string;
  matricule: string;
  universityId: string | null;
  departmentId: string | null;
}

export interface SessionTeamMemberRef {
  id: string;
  companyId: string;
  role: string; // ADMIN_RH | TUTEUR
  company: { id: string; name: string };
}

export interface SessionUniversityMemberRef {
  id: string;
  role: string; // ADMIN_SCHOOL | HEAD_OF_DEPARTMENT | ACADEMIC_SUPERVISOR
  title: string | null;
  universityId: string;
  departmentId: string | null;
  university: { id: string; name: string; acronym: string };
  department: { id: string; name: string; code: string } | null;
}

/** Utilisateur complet de session (vérifié JWT + rechargé depuis la base). */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: "STUDENT" | "COMPANY" | "UNIVERSITY" | "ADMIN";
  profileCompleted: boolean;
  avatarUrl: string | null;
  studentProfile: SessionStudentRef | null;
  teamMember: SessionTeamMemberRef | null;
  universityMember: SessionUniversityMemberRef | null;
}
