/**
 * Module 2 — Offres de stage étudiant : recherche, filtres dynamiques,
 * score de compatibilité IA, détail en Sheet, lettre de motivation Groq
 * et candidature en 1 clic.
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { compatScore } from "@/lib/etudiant-format";
import { DbErrorInline } from "@/components/etudiant/shell";
import { OffersClient, type OfferCardItem } from "@/components/etudiant/offers-client";

export const dynamic = "force-dynamic";

interface OffersPayload {
  offers: OfferCardItem[];
  student: {
    fullName: string;
    schoolName: string;
    fieldOfStudy: string;
    level: string;
    skills: string[];
  };
}

async function loadOffers(): Promise<{ ok: true; payload: OffersPayload } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const [offers, myCandidatures] = await Promise.all([
      db.offer.findMany({
        where: { status: "PUBLIEE" },
        include: { company: { select: { name: true, city: true, website: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.candidature.findMany({ where: { studentId: student.id }, select: { offerId: true } }),
    ]);

    const appliedOfferIds = new Set(myCandidatures.map((c) => c.offerId).filter((id): id is string => id !== null));

    const offersItems: OfferCardItem[] = offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      sector: offer.sector,
      city: offer.city,
      duration: offer.duration,
      workMode: offer.workMode,
      contractType: offer.contractType,
      gratification: offer.gratification,
      description: offer.description,
      missions: offer.missions.split("\n").map((m) => m.trim()).filter(Boolean),
      skills: offer.skills.split("\n").map((s) => s.trim()).filter(Boolean),
      company: { name: offer.company.name, city: offer.company.city, website: offer.company.website },
      score: compatScore(student.skills, student.fieldOfStudy, offer),
      applied: appliedOfferIds.has(offer.id),
      postedISO: offer.createdAt.toISOString(),
    }));

    return {
      ok: true,
      payload: {
        offers: offersItems,
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

export default async function StudentOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offre?: string }>;
}) {
  const params = await searchParams;
  const result = await loadOffers();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return (
    <OffersClient
      offers={result.payload.offers}
      initialQuery={params.q ?? ""}
      initialOfferId={params.offre ?? null}
      student={result.payload.student}
    />
  );
}
