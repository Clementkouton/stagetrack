import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEtablissementContext, getEtablissementSessionOptions } from "@/lib/etablissement-data";
import { getSessionUser } from "@/lib/session";
import { EtablissementShell, EtabDbError, type SessionOption } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espace Établissement — StageTrack",
  description:
    "Portail universitaire StageTrack : départements & chefs de département, étudiants rattachés, conventions et visas pédagogiques, suivi des stages, évaluations jury, encadrement des mémoires et Copilote IA Académique Groq.",
  robots: { index: false },
};

async function loadShellData(): Promise<{
  ok: boolean;
  error?: string;
  session?: {
    memberId: string;
    role: "ADMIN_SCHOOL" | "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";
    memberName: string;
    memberTitle: string | null;
    universityName: string;
    universityAcronym: string;
    departmentName: string | null;
    departmentCode: string | null;
  };
  sessionOptions?: SessionOption[];
}> {
  // Session réelle obligatoire : le proxy redirige déjà, mais on protège ici
  // aussi les rechargements directs (nouveau contexte de rendu).
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "UNIVERSITY" || !sessionUser.universityMember) {
    redirect("/auth");
  }

  try {
    const ctx = await getEtablissementContext();
    if (!ctx) return { ok: false, error: "Base de données inaccessible." };
    const options = await getEtablissementSessionOptions(ctx.universityId);
    return {
      ok: true,
      session: {
        memberId: ctx.memberId,
        role: ctx.role,
        memberName: ctx.memberName,
        memberTitle: ctx.memberTitle,
        universityName: ctx.universityName,
        universityAcronym: ctx.universityAcronym,
        departmentName: ctx.departmentName,
        departmentCode: ctx.departmentCode,
      },
      sessionOptions: options,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

export default async function EtablissementLayout({ children }: { children: React.ReactNode }) {
  const data = await loadShellData();

  if (!data.ok || !data.session) {
    return <EtabDbError message={data.error ?? "Erreur de base de données"} />;
  }

  return (
    <EtablissementShell session={data.session} sessionOptions={data.sessionOptions ?? []}>
      {children}
    </EtablissementShell>
  );
}
