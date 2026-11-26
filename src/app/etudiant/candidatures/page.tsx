/**
 * Module 3 — Mes candidatures : bascule Kanban / Liste, fiche détail
 * (entretien, analyse IA, notes personnelles) et email de relance Groq.
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { DbErrorInline } from "@/components/etudiant/shell";
import { CandidaturesClient, type CandidatureItem, type CandidatureStatus } from "@/components/etudiant/candidatures-client";

export const dynamic = "force-dynamic";

async function loadCandidatures(): Promise<{ ok: true; items: CandidatureItem[]; studentName: string } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const candidatures = await db.candidature.findMany({
      where: { studentId: student.id },
      include: {
        company: { select: { name: true, city: true } },
        offer: { select: { title: true, city: true, duration: true, workMode: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const items: CandidatureItem[] = candidatures.map((c) => ({
      id: c.id,
      offerId: c.offerId,
      offerTitle: c.offer?.title ?? "Offre retirée",
      offerCity: c.offer?.city ?? c.company.city,
      offerDuration: c.offer?.duration ?? null,
      offerWorkMode: c.offer?.workMode ?? null,
      company: c.company.name,
      status: c.status as CandidatureStatus,
      interviewAtISO: c.interviewAt ? c.interviewAt.toISOString() : null,
      aiScore: c.aiScore,
      aiSummary: c.aiSummary,
      aiQuestions: c.aiQuestions.split("\n").map((q) => q.trim()).filter(Boolean),
      coverLetter: c.coverLetter,
      sentISO: c.createdAt.toISOString(),
      updatedISO: c.updatedAt.toISOString(),
    }));
    return { ok: true, items, studentName: student.fullName };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur de base de données" };
  }
}

export default async function StudentCandidaturesPage() {
  const result = await loadCandidatures();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return <CandidaturesClient items={result.items} studentName={result.studentName} />;
}
