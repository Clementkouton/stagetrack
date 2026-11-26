/**
 * Module 4 — Studio Carrière IA : 3 onglets propulsés par Groq
 * (Optimiseur de CV, Générateur de lettre, Simulateur d'entretien).
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { DbErrorInline } from "@/components/etudiant/shell";
import { StudioClient, type StudioOffer } from "@/components/etudiant/studio-client";

export const dynamic = "force-dynamic";

interface StudioPayload {
  offers: StudioOffer[];
  student: {
    fullName: string;
    schoolName: string;
    fieldOfStudy: string;
    level: string;
    skills: string[];
  };
}

async function loadStudio(): Promise<{ ok: true; payload: StudioPayload } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const offers = await db.offer.findMany({
      where: { status: "PUBLIEE" },
      include: { company: { select: { name: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });
    return {
      ok: true,
      payload: {
        offers: offers.map((offer) => ({
          id: offer.id,
          title: offer.title,
          company: offer.company.name,
          city: offer.company.city,
          missions: offer.missions.split("\n").map((m) => m.trim()).filter(Boolean),
          skills: offer.skills.split("\n").map((s) => s.trim()).filter(Boolean),
        })),
        student: {
          fullName: student.fullName,
          schoolName: student.universityName,
          fieldOfStudy: student.fieldOfStudy,
          level: student.level,
          skills: student.skills,
        },
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur de base de données" };
  }
}

export default async function StudentStudioPage() {
  const result = await loadStudio();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return <StudioClient offers={result.payload.offers} student={result.payload.student} />;
}
