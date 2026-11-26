/**
 * Module 7 — Mon profil académique : matricule vérifié, établissement rattaché,
 * sélection en cascade (Université → Département → Spécialité → Niveau) avec
 * assignation automatique du Chef de Département, édition des informations
 * personnelles + compétences.
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { DbErrorInline } from "@/components/etudiant/shell";
import { ProfilClient, type CascadeUniversity, type DepartmentHeadInfo } from "@/components/etudiant/profil-client";

export const dynamic = "force-dynamic";

export interface ProfilPayload {
  profile: {
    fullName: string;
    email: string;
    matricule: string;
    universityId: string | null;
    departmentId: string | null;
    specialty: string | null;
    fieldOfStudy: string;
    level: string;
    phone: string;
    cvUrl: string;
    skills: string[];
  };
  universities: CascadeUniversity[];
  currentHead: DepartmentHeadInfo | null;
  candidatureCount: number;
}

async function loadProfil(): Promise<{ ok: true; payload: ProfilPayload } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const [profile, universities, candidatureCount] = await Promise.all([
      db.studentProfile.findUnique({
        where: { id: student.id },
        include: { user: { select: { email: true, fullName: true } } },
      }),
      db.universityProfile.findMany({
        orderBy: { acronym: "asc" },
        select: {
          id: true,
          name: true,
          acronym: true,
          city: true,
          departments: {
            orderBy: { code: "asc" },
            select: { id: true, name: true, code: true, specialties: true },
          },
        },
      }),
      db.candidature.count({ where: { studentId: student.id } }),
    ]);
    if (!profile) throw new Error("Profil étudiant introuvable");

    let currentHead: DepartmentHeadInfo | null = null;
    if (profile.departmentId) {
      const head = await db.universityMember.findFirst({
        where: { departmentId: profile.departmentId, role: "HEAD_OF_DEPARTMENT" },
        select: { user: { select: { fullName: true, email: true } }, title: true, department: { select: { code: true } } },
      });
      if (head) {
        currentHead = {
          fullName: head.user.fullName,
          title: head.title ?? `Chef du Département ${head.department?.code ?? ""}`.trim(),
          email: head.user.email,
        };
      }
    }

    return {
      ok: true,
      payload: {
        profile: {
          fullName: profile.user.fullName,
          email: profile.user.email,
          matricule: profile.matricule,
          universityId: profile.universityId,
          departmentId: profile.departmentId,
          specialty: profile.specialty,
          fieldOfStudy: profile.fieldOfStudy ?? "",
          level: profile.level ?? "",
          phone: profile.phone ?? "",
          cvUrl: profile.cvUrl ?? "",
          skills: profile.skills,
        },
        universities,
        currentHead,
        candidatureCount,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur de base de données" };
  }
}

export default async function StudentProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const { onboarding } = await searchParams;
  const result = await loadProfil();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return (
    <>
      {onboarding === "1" ? (
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/20 text-gold-dark">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Bienvenue sur StageTrack — rattachement académique requis</p>
              <p className="mt-0.5 text-xs leading-relaxed text-body">
                Choisissez votre établissement, votre département et votre spécialité ci-dessous pour accéder à votre
                tableau de bord. Cette étape n&apos;est demandée qu&apos;à la première connexion.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <ProfilClient {...result.payload} />
    </>
  );
}
