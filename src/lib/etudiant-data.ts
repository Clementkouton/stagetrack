/**
 * Helpers serveur partagés du Dashboard Étudiant (données + calculs).
 * Utilisés par le layout (notifications) et les 7 modules.
 */
import { db } from "@/lib/db";

export interface StudentAlert {
  id: string;
  severity: "urgent" | "info";
  label: string;
  description: string;
  href: string;
}

export interface ActiveInternSummary {
  id: string;
  position: string;
  companyName: string;
  tutorName: string;
  startDate: Date;
  endDate: Date;
  totalWeeks: number;
  currentWeek: number;
}

/** Semaine en cours d'un stage, bornée entre 1 et totalWeeks. */
export function computeCurrentWeek(startDate: Date, endDate: Date, totalWeeks: number): number {
  const now = Date.now();
  const span = Math.max(endDate.getTime() - startDate.getTime(), 7 * 86400000);
  const week = Math.floor(((now - startDate.getTime()) / span) * totalWeeks) + 1;
  return Math.min(Math.max(week, 1), totalWeeks);
}

export function currentWeekLabel(week: number, startDate: Date): string {
  const start = new Date(startDate.getTime() + (week - 1) * 7 * 86400000);
  const end = new Date(start.getTime() + 4 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return `Semaine ${week} (${fmt(start)} – ${fmt(end)})`;
}

/** Récupère le stage actif résumé de l'étudiant (ou null). */
export async function getActiveIntern(studentId: string): Promise<ActiveInternSummary | null> {
  const intern = await db.intern.findFirst({
    where: { studentId, status: "ACTIF" },
    include: { company: { select: { name: true } }, tutor: { select: { name: true } } },
  });
  if (!intern) return null;
  const currentWeek = computeCurrentWeek(intern.startDate, intern.endDate, intern.totalWeeks);
  return {
    id: intern.id,
    position: intern.position,
    companyName: intern.company.name,
    tutorName: intern.tutor?.name ?? "Tuteur à assigner",
    startDate: intern.startDate,
    endDate: intern.endDate,
    totalWeeks: intern.totalWeeks,
    currentWeek,
  };
}

/** Notifications du header : actions requises et rappels. */
export async function getStudentAlerts(studentId: string): Promise<StudentAlert[]> {
  const alerts: StudentAlert[] = [];
  const now = new Date();

  const intern = await db.intern.findFirst({
    where: { studentId, status: "ACTIF" },
    include: {
      tasks: { select: { id: true, status: true, week: true } },
      journals: { select: { week: true } },
      presenceSheets: { select: { periodLabel: true, status: true, submittedAt: true } },
      conventions: { select: { id: true, reference: true, signedStudent: true, status: true } },
    },
  });

  if (intern) {
    const currentWeek = computeCurrentWeek(intern.startDate, intern.endDate, intern.totalWeeks);
    const openTasks = intern.tasks.filter((t) => t.status !== "VALIDE" && t.week <= currentWeek);
    if (openTasks.length > 0) {
      alerts.push({
        id: "tasks",
        severity: "info",
        label: `${openTasks.length} tâche${openTasks.length > 1 ? "s" : ""} en cours`,
        description: "Mettez à jour l'avancement de vos missions du stage.",
        href: "/etudiant/mon-stage",
      });
    }
    const journalDone = intern.journals.some((j) => j.week === currentWeek);
    if (!journalDone) {
      alerts.push({
        id: "journal",
        severity: "urgent",
        label: `Journal de bord — semaine ${currentWeek}`,
        description: `Votre bilan de la semaine ${currentWeek}/${intern.totalWeeks} n'est pas encore soumis.`,
        href: "/etudiant/mon-stage",
      });
    }
    const weekLabel = currentWeekLabel(currentWeek, intern.startDate);
    const sheetDone = intern.presenceSheets.some((s) => s.periodLabel === weekLabel);
    if (!sheetDone) {
      alerts.push({
        id: "presence",
        severity: "urgent",
        label: "Feuille de présence à déclarer",
        description: `Déclarez vos jours de présence pour la semaine ${currentWeek}.`,
        href: "/etudiant/mon-stage",
      });
    }
    const convention = intern.conventions.find((c) => !c.signedStudent);
    if (convention) {
      alerts.push({
        id: "convention",
        severity: "urgent",
        label: `Convention ${convention.reference} à signer`,
        description: "Votre signature est la dernière étape du circuit tripartite.",
        href: "/etudiant/documents",
      });
    }
  }

  const upcomingInterview = await db.candidature.findFirst({
    where: { studentId, status: "ENTRETIEN_PLANIFIE", interviewAt: { gte: now } },
    include: { offer: { select: { title: true } } },
    orderBy: { interviewAt: "asc" },
  });
  if (upcomingInterview?.interviewAt) {
    alerts.push({
      id: "interview",
      severity: "info",
      label: "Entretien planifié",
      description: `${upcomingInterview.offer?.title ?? "Poste"} — ${upcomingInterview.interviewAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}. Préparez-vous dans le Studio IA.`,
      href: "/etudiant/studio-ia",
    });
  }

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const stale = await db.candidature.count({
    where: { studentId, status: "NOUVELLE", createdAt: { lt: fourteenDaysAgo } },
  });
  if (stale > 0) {
    alerts.push({
      id: "relance",
      severity: "info",
      label: `${stale} candidature${stale > 1 ? "s" : ""} sans réponse depuis 14 jours`,
      description: "Un email de relance généré par l'IA peut accélérer le retour.",
      href: "/etudiant/candidatures",
    });
  }

  return alerts;
}
