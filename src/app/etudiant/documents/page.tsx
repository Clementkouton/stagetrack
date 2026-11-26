/**
 * Module 6 — Documents & Conventions : circuit de signature tripartite,
 * coffre-fort documentaire (StudentDocument), attestation de fin de stage
 * et consultation de l'évaluation finale.
 */
import { db } from "@/lib/db";
import { getSessionDemoStudent } from "@/lib/etudiant-seed";
import { DbErrorInline } from "@/components/etudiant/shell";
import { DocumentsClient, type DocumentsData } from "@/components/etudiant/documents-client";

export const dynamic = "force-dynamic";

async function loadDocuments(): Promise<{ ok: true; data: DocumentsData } | { ok: false; error: string }> {
  try {
    const student = await getSessionDemoStudent();
    const interns = await db.intern.findMany({ where: { studentId: student.id }, select: { id: true } });
    const internIds = interns.map((i) => i.id);

    const [conventions, documents, pastInterns] = await Promise.all([
      db.convention.findMany({
        where: internIds.length > 0 ? { internId: { in: internIds } } : { id: "___none___" },
        include: { company: { select: { name: true, city: true } }, intern: { select: { position: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.studentDocument.findMany({ where: { studentId: student.id }, orderBy: { uploadedAt: "desc" } }),
      db.intern.findMany({
        where: { studentId: student.id, status: "TERMINE" },
        include: { company: { select: { name: true } }, attestation: true, evaluation: true },
        orderBy: { endDate: "desc" },
      }),
    ]);

    return {
      ok: true,
      data: {
        conventions: conventions.map((c) => ({
          id: c.id,
          reference: c.reference,
          company: c.company.name,
          companyCity: c.company.city,
          position: c.intern?.position ?? c.position,
          university: c.university,
          status: c.status as "SIGNEE" | "EN_ATTENTE",
          signedStudent: c.signedStudent,
          signedCompany: c.signedCompany,
          signedUniversity: c.signedUniversity,
          startDateISO: c.startDate ? c.startDate.toISOString() : null,
          endDateISO: c.endDate ? c.endDate.toISOString() : null,
        })),
        documents: documents.map((d) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          url: d.url,
          hasFile: Boolean(d.content),
          uploadedISO: d.uploadedAt.toISOString(),
        })),
        pastInterns: pastInterns.map((intern) => ({
          id: intern.id,
          position: intern.position,
          company: intern.company.name,
          startDateISO: intern.startDate.toISOString(),
          endDateISO: intern.endDate.toISOString(),
          attestation: intern.attestation
            ? {
                reference: intern.attestation.reference,
                content: intern.attestation.content,
                generatedISO: intern.attestation.generatedAt.toISOString(),
              }
            : null,
          evaluation:
            intern.evaluation && intern.evaluation.finalized
              ? {
                  technique: intern.evaluation.technique,
                  ponctualite: intern.evaluation.ponctualite,
                  autonomie: intern.evaluation.autonomie,
                  espritEquipe: intern.evaluation.espritEquipe,
                  appreciation: intern.evaluation.appreciation,
                }
              : null,
        })),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erreur de base de données" };
  }
}

export default async function StudentDocumentsPage() {
  const result = await loadDocuments();
  if (!result.ok) return <DbErrorInline message={result.error} />;
  return <DocumentsClient data={result.data} />;
}
