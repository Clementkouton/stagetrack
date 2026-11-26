import type { Metadata } from "next";
import { IconDatabaseOff } from "@tabler/icons-react";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { getStudentAlerts, type StudentAlert } from "@/lib/etudiant-data";
import { EtudiantShell, type ShellStudent } from "@/components/etudiant/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espace Étudiant — StageTrack",
  description:
    "Espace étudiant StageTrack : offres de stage avec score de compatibilité IA, suivi des candidatures, Studio Carrière IA (Groq), suivi du stage actif, conventions et profil académique.",
  robots: { index: false },
};

interface ShellData {
  ok: boolean;
  student?: ShellStudent;
  alerts?: StudentAlert[];
  error?: string;
}

async function loadShellData(): Promise<ShellData> {
  try {
    const student = await getSessionDemoStudent();
    const alerts = await getStudentAlerts(student.id);
    return {
      ok: true,
      student: {
        fullName: student.fullName,
        matricule: student.matricule,
        schoolName: student.universityName,
        fieldOfStudy: student.fieldOfStudy,
        level: student.level,
        email: student.email,
      },
      alerts,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

export default async function EtudiantLayout({ children }: { children: React.ReactNode }) {
  const data = await loadShellData();

  if (!data.ok || !data.student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
            <IconDatabaseOff size={26} className="text-brand" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink">Connexion à la base impossible</h1>
          <p className="mt-2 text-sm leading-relaxed text-body">
            L&apos;espace étudiant nécessite la base <strong>PostgreSQL / Neon</strong>. Vérifiez que les variables
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">DATABASE_URL</code> et
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">DIRECT_URL</code>
            sont définies dans votre fichier <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code>,
            puis exécutez <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npx prisma db push</code>.
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-500">{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <EtudiantShell student={data.student} alerts={data.alerts ?? []}>
      {children}
    </EtudiantShell>
  );
}
