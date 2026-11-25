import { db } from "@/lib/db";
import {
  SuiviClient,
  type JournalRow,
  type PresenceRow,
  type SuiviIntern,
  type TaskRow,
} from "@/components/entreprise/suivi-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseSuiviPage() {
  const [interns, tasks, presences, journals] = await Promise.all([
    db.intern.findMany({
      where: { status: "ACTIF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, startDate: true, totalWeeks: true },
    }),
    db.internshipTask.findMany({
      orderBy: [{ week: "desc" }, { createdAt: "desc" }],
      include: { intern: { select: { name: true } } },
    }),
    db.presenceSheet.findMany({
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
      include: { intern: { select: { name: true, position: true } } },
    }),
    db.weeklyJournal.findMany({
      orderBy: { week: "desc" },
      include: { intern: { select: { name: true, position: true } } },
    }),
  ]);

  const now = Date.now();
  const suiviInterns: SuiviIntern[] = interns.map((i) => {
    const elapsed = Math.floor((now - i.startDate.getTime()) / (7 * 86400000));
    return {
      id: i.id,
      name: i.name,
      position: i.position,
      currentWeek: Math.max(1, Math.min(i.totalWeeks, elapsed + 1)),
      totalWeeks: i.totalWeeks,
    };
  });

  const taskRows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    internId: t.internId,
    internName: t.intern.name,
    title: t.title,
    description: t.description,
    week: t.week,
    status: t.status,
    aiSuggested: t.aiSuggested,
  }));

  const presenceRows: PresenceRow[] = presences.map((p) => ({
    id: p.id,
    internId: p.internId,
    internName: p.intern.name,
    position: p.intern.position,
    periodLabel: p.periodLabel,
    daysPresent: p.daysPresent,
    totalDays: p.totalDays,
    status: p.status,
    submittedAt: p.submittedAt.toISOString(),
  }));

  const journalRows: JournalRow[] = journals.map((j) => ({
    id: j.id,
    internName: j.intern.name,
    position: j.intern.position,
    week: j.week,
    content: j.content,
  }));

  return <SuiviClient interns={suiviInterns} tasks={taskRows} presences={presenceRows} journals={journalRows} />;
}
