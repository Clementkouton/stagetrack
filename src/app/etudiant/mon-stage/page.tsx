/**
 * Module 5 — Mon stage actif : récapitulatif (entreprise, tuteur, dates,
 * progression) + 3 onglets (Missions, Présences, Journal de bord).
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { computeCurrentWeek, currentWeekLabel } from "@/lib/etudiant-data";
import { DbErrorInline } from "@/components/etudiant/shell";
import { StageClient, type StageData } from "@/components/etudiant/stage-client";

export const dynamic = "force-dynamic";

async function loadStage(): Promise<{ ok: true; data: StageData | null } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const intern = await db.intern.findFirst({
      where: { studentId: student.id, status: "ACTIF" },
      include: {
        company: { select: { name: true, city: true, sector: true } },
        tutor: { select: { id: true, name: true, email: true, role: true } },
        tasks: { orderBy: [{ week: "asc" }, { createdAt: "asc" }] },
        presenceSheets: { orderBy: { submittedAt: "desc" } },
        journals: { orderBy: [{ week: "desc" }, { createdAt: "desc" }] },
        conventions: { select: { reference: true, signedStudent: true, status: true } },
      },
    });

    if (!intern) return { ok: true, data: null };

    const currentWeek = computeCurrentWeek(intern.startDate, intern.endDate, intern.totalWeeks);
    return {
      ok: true,
      data: {
        intern: {
          id: intern.id,
          position: intern.position,
          company: intern.company.name,
          companyCity: intern.company.city,
          sector: intern.company.sector,
          tutorName: intern.tutor?.name ?? "Tuteur à assigner",
          tutorEmail: intern.tutor?.email ?? null,
          tutorRole: intern.tutor?.role ?? null,
          startDateISO: intern.startDate.toISOString(),
          endDateISO: intern.endDate.toISOString(),
          totalWeeks: intern.totalWeeks,
          currentWeek,
          weekLabel: currentWeekLabel(currentWeek, intern.startDate),
          onboarding: intern.onboarding.split("\n").filter(Boolean).map((line) => {
            const [, label, checked] = line.split("|");
            return { label: label ?? "", done: checked === "[x]" };
          }),
        },
        tasks: intern.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          week: t.week,
          status: t.status as "A_FAIRE" | "EN_COURS" | "VALIDE",
          aiSuggested: t.aiSuggested,
        })),
        presenceSheets: intern.presenceSheets.map((s) => ({
          id: s.id,
          periodLabel: s.periodLabel,
          daysPresent: s.daysPresent,
          totalDays: s.totalDays,
          status: s.status as "A_VALIDER" | "VALIDEE" | "REJETEE",
          submittedISO: s.submittedAt.toISOString(),
        })),
        journals: intern.journals.map((j) => ({
          id: j.id,
          week: j.week,
          content: j.content,
          createdISO: j.createdAt.toISOString(),
        })),
        convention:
          intern.conventions.length > 0
            ? {
                reference: intern.conventions[0].reference,
                signedStudent: intern.conventions[0].signedStudent,
                status: intern.conventions[0].status,
              }
            : null,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur de base de données" };
  }
}

export default async function StudentStagePage() {
  const result = await loadStage();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return <StageClient data={result.data} />;
}
