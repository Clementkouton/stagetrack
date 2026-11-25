"use client";

/**
 * Documents & Conventions — suivi des conventions tripartites (Étudiant / Entreprise / Université)
 * et génération d'attestations de fin de stage (impression PDF via le navigateur).
 */
import { useState, useTransition } from "react";
import {
  IconCircleCheck,
  IconClock,
  IconFileDescription,
  IconSignature,
  IconLoader2,
  IconPrinter,
  IconRefresh,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { generateAttestation, signConvention } from "@/app/entreprise/actions";
import { formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface ConventionRow {
  id: string;
  reference: string;
  studentName: string;
  university: string;
  position: string;
  status: string;
  signedStudent: boolean;
  signedCompany: boolean;
  signedUniversity: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface AttestableIntern {
  id: string;
  name: string;
  position: string;
  university: string;
  matricule: string;
  endDate: string;
  hasAttestation: boolean;
  attestationReference: string | null;
}

function SignatureBadge({ label, signed }: { label: string; signed: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-bold",
        signed ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-800" : "border-gold/40 bg-gold-50 text-gold-dark",
      )}
    >
      {signed ? <IconCircleCheck size={11} /> : <IconClock size={11} />}
      {label} {signed ? "✓" : "⏳"}
    </Badge>
  );
}

export function DocumentsClient({
  conventions,
  attestableInterns,
}: {
  conventions: ConventionRow[];
  attestableInterns: AttestableIntern[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [attestation, setAttestation] = useState<{ reference: string; content: string; studentName: string } | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const enAttente = conventions.filter((c) => c.status === "EN_ATTENTE").length;
  const signees = conventions.filter((c) => c.status === "SIGNEE").length;

  const sign = (convention: ConventionRow, party: "company" | "student" | "university") => {
    startTransition(async () => {
      const result = await signConvention(convention.id, party);
      if (result.ok) {
        toast({ title: "Signature enregistrée", description: `${convention.reference} mise à jour.` });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  const generate = async (intern: AttestableIntern) => {
    setGeneratingId(intern.id);
    try {
      const result = await generateAttestation(intern.id);
      if (result.ok && result.data) {
        setAttestation({ reference: result.data.reference, content: result.data.content, studentName: intern.name });
        toast({ title: "Attestation prête", description: `Document ${result.data.reference} généré pour ${intern.name}.` });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Documents &amp; Conventions</h1>
        <p className="mt-1 text-sm text-body">
          {enAttente} convention(s) en attente de signatures · {signees} signée(s) · attestations de fin de stage
        </p>
      </div>

      {/* Conventions */}
      <Card className="border-slate-200/80 rounded-xl bg-white">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <IconSignature size={16} className="text-brand" />
            <h2 className="text-sm font-bold text-ink">Conventions de stage tripartites</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-left">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Référence</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Étudiant</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Université</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Période</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Signatures</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {conventions.map((c) => (
                  <tr key={c.id} className={cn("border-t border-slate-100 hover:bg-slate-50/60", c.status === "EN_ATTENTE" && "bg-gold-50/30")}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-brand">{c.reference}</p>
                      <Badge variant="outline" className={cn("mt-1 text-[10px] font-bold", c.status === "SIGNEE" ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-800" : "border-gold/40 bg-gold-50 text-gold-dark")}>
                        {c.status === "SIGNEE" ? "Signée" : "En attente"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.studentName}</p>
                      <p className="text-[11px] text-body">{c.position}</p>
                    </td>
                    <td className="px-4 py-3 text-body">{c.university}</td>
                    <td className="px-4 py-3 text-xs text-body">
                      {c.startDate && c.endDate ? `${formatDateFr(c.startDate)} → ${formatDateFr(c.endDate)}` : "À planifier"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <SignatureBadge label="Étudiant" signed={c.signedStudent} />
                        <SignatureBadge label="Entreprise" signed={c.signedCompany} />
                        <SignatureBadge label="Université" signed={c.signedUniversity} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === "EN_ATTENTE" ? (
                        <Button
                          size="sm"
                          onClick={() => sign(c, "company")}
                          disabled={pending || c.signedCompany}
                          className="h-8 gap-1 rounded-lg bg-brand px-2.5 text-xs hover:bg-brand-dark"
                        >
                          <IconSignature size={13} />
                          {c.signedCompany ? "Signée" : "Signer (entreprise)"}
                        </Button>
                      ) : (
                        <p className="text-[11px] text-slate-400">Complète</p>
                      )}
                    </td>
                  </tr>
                ))}
                {conventions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-body">
                      Aucune convention enregistrée.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Attestations */}
      <Card className="border-slate-200/80 rounded-xl bg-white">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <IconFileDescription size={16} className="text-brand" />
            <h2 className="text-sm font-bold text-ink">Attestations de fin de stage</h2>
          </div>
          <p className="mt-1 text-xs text-body">Générez et imprimez l&apos;attestation officielle pour les stagiaires ayant terminé leur stage.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {attestableInterns.length === 0 ? (
              <p className="col-span-full rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-body">
                Aucun stagiaire terminé pour le moment.
              </p>
            ) : (
              attestableInterns.map((intern) => (
                <div key={intern.id} className="rounded-xl border border-slate-200/80 p-4">
                  <p className="font-bold text-ink">{intern.name}</p>
                  <p className="mt-0.5 text-xs text-body">{intern.position}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {intern.university} · fin le {formatDateFr(intern.endDate)}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => void generate(intern)}
                    disabled={generatingId === intern.id}
                    className="mt-3 w-full gap-1.5 rounded-lg bg-brand text-xs hover:bg-brand-dark"
                  >
                    {generatingId === intern.id ? <IconLoader2 size={13} className="animate-spin" /> : <IconFileDescription size={13} />}
                    {intern.hasAttestation
                      ? `Revoir l'attestation (${intern.attestationReference})`
                      : "Générer l'attestation de fin de stage (PDF)"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog attestation */}
      <Dialog open={attestation !== null} onOpenChange={(open) => !open && setAttestation(null)}>
        {attestation ? (
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-ink">
                <IconFileDescription size={17} className="text-brand" />
                Attestation {attestation.reference} — {attestation.studentName}
              </DialogTitle>
              <DialogDescription>
                Document officiel prêt à être imprimé ou enregistré en PDF depuis le navigateur.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">{attestation.content}</pre>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAttestation(null)} className="gap-1.5 rounded-xl">
                <IconRefresh size={15} />
                Fermer
              </Button>
              <Button
                onClick={() => window.print()}
                className="gap-1.5 rounded-xl bg-brand hover:bg-brand-dark"
              >
                <IconPrinter size={15} />
                Imprimer / Enregistrer en PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
