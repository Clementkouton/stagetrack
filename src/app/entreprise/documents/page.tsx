import { db } from "@/lib/db";
import { getEntrepriseCompanyId, getEntrepriseInternWhere } from "@/lib/entreprise-data";
import {
  DocumentsClient,
  type AttestableIntern,
  type ConventionRow,
} from "@/components/entreprise/documents-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseDocumentsPage() {
  const internWhere = await getEntrepriseInternWhere();
  const companyId = await getEntrepriseCompanyId();
  const [conventions, finishedInterns] = await Promise.all([
    db.convention.findMany({
      where: { companyId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.intern.findMany({
      where: { ...internWhere, status: "TERMINE" },
      orderBy: { endDate: "desc" },
      include: { attestation: true },
    }),
  ]);

  const conventionRows: ConventionRow[] = conventions.map((c) => ({
    id: c.id,
    reference: c.reference,
    studentName: c.studentName,
    university: c.university,
    position: c.position,
    status: c.status,
    signedStudent: c.signedStudent,
    signedCompany: c.signedCompany,
    signedUniversity: c.signedUniversity,
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
  }));

  const attestable: AttestableIntern[] = finishedInterns.map((i) => ({
    id: i.id,
    name: i.name,
    position: i.position,
    university: i.university,
    matricule: i.matricule,
    endDate: i.endDate.toISOString(),
    hasAttestation: Boolean(i.attestation),
    attestationReference: i.attestation?.reference ?? null,
  }));

  return <DocumentsClient conventions={conventionRows} attestableInterns={attestable} />;
}
