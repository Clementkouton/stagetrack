/** Templates de documents officiels StageTrack (attestations…). */

export interface AttestationInput {
  companyName: string;
  city: string;
  studentName: string;
  matricule: string;
  university: string;
  position: string;
  startDate: Date;
  endDate: Date;
  tutorName: string;
}

const fmt = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export function attestationContent(input: AttestationInput): string {
  const weeks = Math.max(
    1,
    Math.round((input.endDate.getTime() - input.startDate.getTime()) / (7 * 86400000)),
  );
  return `ATTESTATION DE FIN DE STAGE

Nous, soussignés, ${input.companyName} (${input.city}, Bénin), attestons que :

${input.studentName} — Étudiant(e) à ${input.university} (Matricule : ${input.matricule})

a effectué au sein de notre société un stage de fin de formation en qualité de ${input.position}, du ${fmt(input.startDate)} au ${fmt(input.endDate)}, soit une durée de ${weeks} semaines.

Durant cette période, il/elle a fait preuve de sérieux, d'assiduité et de dynamisme dans l'accomplissement des missions confiées. Le stage a donné lieu à la réalisation d'un rapport de fin de stage soutenu devant son établissement.

Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.

Fait à ${input.city}, le ${fmt(new Date())}

Le Responsable RH — ${input.tutorName}`;
}
