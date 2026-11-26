import { db } from "@/lib/db";
import { getEntrepriseCompanyId } from "@/lib/entreprise-data";
import {
  CandidaturesClient,
  type CandidatureRow,
  type MiniOffer,
  type TutorOption,
} from "@/components/entreprise/candidatures-client";
import type { CandidatureStatus } from "@/app/entreprise/actions";

export const dynamic = "force-dynamic";

const STATUS_KEYS = new Set<CandidatureStatus>([
  "NOUVELLE",
  "PRESELECTIONNEE",
  "ENTRETIEN_PLANIFIE",
  "OFFRE_ENVOYEE",
  "ACCEPTEE",
  "REFUSEE",
]);

export default async function EntrepriseCandidaturesPage() {
  const companyId = await getEntrepriseCompanyId();
  const [candidatures, offers, tutors] = await Promise.all([
    db.candidature.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: { offer: { select: { title: true } } },
    }),
    db.offer.findMany({ where: { companyId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    db.teamMember.findMany({ where: { companyId, active: true }, select: { id: true, name: true, role: true } }),
  ]);

  const rows: CandidatureRow[] = candidatures.map((c) => ({
    id: c.id,
    studentName: c.studentName,
    matricule: c.matricule,
    university: c.university,
    email: c.email,
    phone: c.phone,
    offerId: c.offerId,
    offerTitle: c.offer?.title ?? "Offre supprimée",
    cvSummary: c.cvSummary,
    coverLetter: c.coverLetter,
    status: STATUS_KEYS.has(c.status as CandidatureStatus) ? (c.status as CandidatureStatus) : "NOUVELLE",
    interviewAt: c.interviewAt ? c.interviewAt.toISOString() : null,
    aiScore: c.aiScore,
    aiSummary: c.aiSummary ? c.aiSummary.split("\n").filter(Boolean) : [],
    aiQuestions: c.aiQuestions.split("\n").filter(Boolean),
    createdAt: c.createdAt.toISOString(),
  }));

  const miniOffers: MiniOffer[] = offers.map((o) => ({ id: o.id, title: o.title }));
  const tutorOptions: TutorOption[] = tutors.map((t) => ({ id: t.id, name: t.name, role: t.role }));

  return <CandidaturesClient candidatures={rows} offers={miniOffers} tutors={tutorOptions} />;
}
