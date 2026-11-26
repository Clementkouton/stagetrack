/**
 * Module 1 — Tableau de bord étudiant : 4 KPI, graphique d'évolution des
 * candidatures (Recharts), alertes et actions rapides.
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { getActiveIntern, getStudentAlerts, type StudentAlert } from "@/lib/etudiant-data";
import { DbErrorInline } from "@/components/etudiant/shell";
import { DashboardClient, type DashboardData, type ChartPoint } from "@/components/etudiant/dashboard-client";

export const dynamic = "force-dynamic";

const WEEKS_SHOWN = 8;

async function loadDashboard(): Promise<{ ok: true; data: DashboardData } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const [candidatures, intern, alerts] = await Promise.all([
      db.candidature.findMany({
        where: { studentId: student.id },
        include: { company: { select: { name: true } }, offer: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      }),
      getActiveIntern(student.id),
      getStudentAlerts(student.id),
    ]);

    /* Historique hebdomadaire (8 dernières semaines) : envois & réponses */
    const now = Date.now();
    const chart: ChartPoint[] = [];
    for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
      const weekStart = new Date(now - (i + 1) * 7 * 86400000);
      const weekEnd = new Date(now - i * 7 * 86400000);
      const sent = candidatures.filter((c) => c.createdAt >= weekStart && c.createdAt < weekEnd).length;
      const replies = candidatures.filter(
        (c) =>
          c.status !== "NOUVELLE" &&
          c.updatedAt >= weekStart &&
          c.updatedAt < weekEnd &&
          c.createdAt < weekEnd,
      ).length;
      chart.push({
        week: i === 0 ? "Cette sem." : `S-${i}`,
        envoyees: sent,
        reponses: replies,
      });
    }

    const interviews = candidatures.filter(
      (c) => c.status === "ENTRETIEN_PLANIFIE" || c.status === "OFFRE_ENVOYEE",
    );
    const nextInterview = interviews
      .map((c) => c.interviewAt)
      .filter((d): d is Date => d instanceof Date && d.getTime() >= now)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const weekNow = new Date(now - 3.5 * 86400000);
    const sentThisWeek = candidatures.filter((c) => c.createdAt >= weekNow).length;

    const recentOffers = await db.offer.findMany({
      where: { status: "PUBLIEE" },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const tasks = intern
      ? await db.internshipTask.findMany({
          where: { internId: intern.id },
          select: { id: true, title: true, status: true, week: true },
        })
      : [];
    const openTasks = tasks.filter((t) => t.status !== "VALIDE");

    return {
      ok: true,
      data: {
        kpis: {
          candidaturesEnvoyees: candidatures.length,
          envoyeesCetteSemaine: sentThisWeek,
          entretiens: interviews.length,
          prochainEntretienISO: nextInterview ? nextInterview.toISOString() : null,
          currentWeek: intern?.currentWeek ?? 0,
          totalWeeks: intern?.totalWeeks ?? 0,
          hasIntern: Boolean(intern),
          internPosition: intern?.position ?? null,
          internCompany: intern?.companyName ?? null,
          tachesEnAttente: openTasks.length,
        },
        chart,
        alerts,
        recentOffers: recentOffers.map((o) => ({
          id: o.id,
          title: o.title,
          company: o.company.name,
          city: o.city,
          duration: o.duration,
          workMode: o.workMode,
        })),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur de base de données" };
  }
}

export default async function StudentDashboardPage() {
  const result = await loadDashboard();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return <DashboardClient data={result.data} />;
}
