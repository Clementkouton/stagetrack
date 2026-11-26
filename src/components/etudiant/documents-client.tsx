"use client";

/**
 * Module 6 (client) — Documents & Conventions : circuit tripartite
 * (Étudiant → Entreprise → Université) avec signature électronique,
 * coffre-fort documentaire (dépôt/consultation/suppression),
 * attestation officielle téléchargeable et évaluation finale.
 */
import { useState } from "react";
import {
  IconCertificate,
  IconCheck,
  IconDownload,
  IconExternalLink,
  IconFileText,
  IconFiles,
  IconLoader2,
  IconLock,
  IconPencil,
  IconShieldCheck,
  IconSignature,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { deleteStudentDocument, signMyConvention, uploadStudentDocument, type StudentDocumentType } from "@/app/etudiant/actions";
import { formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface DocumentsData {
  conventions: Array<{
    id: string;
    reference: string;
    company: string;
    companyCity: string;
    position: string;
    university: string;
    status: "SIGNEE" | "EN_ATTENTE";
    signedStudent: boolean;
    signedCompany: boolean;
    signedUniversity: boolean;
    startDateISO: string | null;
    endDateISO: string | null;
  }>;
  documents: Array<{
    id: string;
    type: string;
    name: string;
    url: string | null;
    hasFile: boolean;
    uploadedISO: string;
  }>;
  pastInterns: Array<{
    id: string;
    position: string;
    company: string;
    startDateISO: string;
    endDateISO: string;
    attestation: { reference: string; content: string; generatedISO: string } | null;
    evaluation: {
      technique: number;
      ponctualite: number;
      autonomie: number;
      espritEquipe: number;
      appreciation: string;
    } | null;
  }>;
}

const DOCUMENT_TYPES = [
  { value: "PIECE_IDENTITE", label: "Pièce d'identité" },
  { value: "ASSURANCE", label: "Assurance" },
  { value: "RAPPORT_STAGE", label: "Rapport de stage" },
  { value: "CV", label: "CV" },
  { value: "AUTRE", label: "Autre" },
];

const MAX_FILE_BYTES = 10_000_000; // ≈ 1 Mo avant encodage base64

function SignatureStep({ label, signed }: { label: string; signed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
          signed ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-300",
        )}
      >
        {signed ? <IconCheck size={18} /> : <IconPencil size={16} />}
      </span>
      <span className={cn("text-[11px] font-semibold", signed ? "text-emerald-700" : "text-slate-400")}>{label}</span>
      <span className={cn("text-[9px] uppercase tracking-wide", signed ? "text-emerald-500" : "text-slate-400")}>
        {signed ? "Signé" : "En attente"}
      </span>
    </div>
  );
}

export function DocumentsClient({ data }: { data: DocumentsData }) {
  const { toast } = useToast();
  const [conventions, setConventions] = useState(data.conventions);
  const [documents, setDocuments] = useState(data.documents);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<StudentDocumentType>("PIECE_IDENTITE");
  const [uploadName, setUploadName] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<{ name: string; content: string } | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const sign = async (conventionId: string) => {
    setSigningId(conventionId);
    try {
      const result = await signMyConvention(conventionId);
      if (result.ok) {
        setConventions((prev) =>
          prev.map((c) => {
            if (c.id !== conventionId) return c;
            const updated = { ...c, signedStudent: true };
            updated.status = updated.signedStudent && updated.signedCompany && updated.signedUniversity ? "SIGNEE" : "EN_ATTENTE";
            return updated;
          }),
        );
        toast({ title: "Convention signée", description: "Votre signature électronique a été enregistrée." });
      } else {
        toast({ title: "Signature impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSigningId(null);
    }
  };

  const readFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "Fichier trop volumineux", description: "Maximum ≈ 1 Mo — utilisez plutôt un lien externe (Drive…).", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setUploadFile({ name: file.name, content });
      if (!uploadName.trim()) setUploadName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    setUploadBusy(true);
    try {
      const result = await uploadStudentDocument({
        type: uploadType,
        name: uploadName.trim() || uploadFile?.name || "Document",
        url: uploadUrl.trim() || undefined,
        content: uploadFile?.content,
      });
      if (result.ok) {
        const optimistic = {
          id: `tmp-${Date.now()}`,
          type: uploadType,
          name: uploadName.trim() || uploadFile?.name || "Document",
          url: uploadUrl.trim() || null,
          hasFile: Boolean(uploadFile),
          uploadedISO: new Date().toISOString(),
        };
        setDocuments((prev) => [optimistic, ...prev]);
        setUploadOpen(false);
        setUploadName("");
        setUploadUrl("");
        setUploadFile(null);
        toast({ title: "Document déposé", description: "Il est maintenant sécurisé dans votre coffre-fort." });
      } else {
        toast({ title: "Dépôt impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setUploadBusy(false);
    }
  };

  const removeDocument = async (id: string) => {
    try {
      const result = await deleteStudentDocument(id);
      if (result.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        toast({ title: "Document supprimé" });
      } else {
        toast({ title: "Suppression impossible", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", description: "Veuillez réessayer.", variant: "destructive" });
    }
  };

  const downloadAttestation = (reference: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attestation-${reference}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Attestation téléchargée", description: `Fichier attestation-${reference}.txt` });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Documents &amp; Conventions</h1>
        <p className="text-sm text-body">Signature tripartite, coffre-fort documentaire et attestations officielles.</p>
      </div>

      {/* ------------------------- Conventions ------------------------- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <IconSignature size={17} className="text-brand" /> Conventions de stage — circuit tripartite
        </h2>
        {conventions.length === 0 ? (
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-body">
              Aucune convention pour le moment. Elle sera créée automatiquement dès votre stage actif.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {conventions.map((convention) => {
              const signedCount = [convention.signedStudent, convention.signedCompany, convention.signedUniversity].filter(Boolean).length;
              return (
                <Card key={convention.id} className="border-slate-200/80 shadow-sm">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-400">Référence</p>
                        <p className="text-sm font-bold text-ink">{convention.reference}</p>
                        <p className="mt-0.5 truncate text-xs text-body">
                          {convention.company} ({convention.companyCity}) · {convention.position}
                        </p>
                        <p className="text-xs text-body">Université : {convention.university}</p>
                        {convention.startDateISO && convention.endDateISO ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatDateFr(convention.startDateISO)} → {formatDateFr(convention.endDateISO)}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          convention.status === "SIGNEE" ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-gold/40 bg-gold-50 text-gold-dark",
                        )}
                      >
                        {convention.status === "SIGNEE" ? "Signée" : "En attente"}
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <SignatureStep label="Étudiant" signed={convention.signedStudent} />
                        <span className="mb-5 h-0.5 w-6 rounded bg-slate-200" aria-hidden />
                        <SignatureStep label="Entreprise" signed={convention.signedCompany} />
                        <span className="mb-5 h-0.5 w-6 rounded bg-slate-200" aria-hidden />
                        <SignatureStep label="Université" signed={convention.signedUniversity} />
                      </div>
                      <Progress value={(signedCount / 3) * 100} className="mt-3 h-1.5" aria-label={`${signedCount}/3 signatures`} />
                    </div>

                    {convention.signedStudent ? (
                      <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                        <IconShieldCheck size={14} /> Vous avez signé cette convention.
                      </p>
                    ) : (
                      <Button
                        onClick={() => void sign(convention.id)}
                        disabled={signingId === convention.id}
                        className="h-10 w-full gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        {signingId === convention.id ? <IconLoader2 size={15} className="animate-spin" /> : <IconPencil size={15} />}
                        Signer ma convention
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------- Coffre-fort ------------------------- */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <IconLock size={17} className="text-brand" /> Coffre-fort documentaire
          </h2>
          <Button
            onClick={() => setUploadOpen(true)}
            className="h-9 gap-1.5 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark"
          >
            <IconUpload size={15} /> Déposer un document
          </Button>
        </div>
        {documents.length === 0 ? (
          <Card className="border-dashed border-slate-300 shadow-sm">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <IconFiles size={28} className="text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-ink">Votre coffre-fort est vide</p>
              <p className="mt-1 text-xs text-body">Déposez votre pièce d&apos;identité, votre attestation d&apos;assurance et votre rapport de stage.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => {
              const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type;
              return (
                <Card key={doc.id} className="border-slate-200/80 shadow-sm">
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                      <IconFileText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{doc.name}</p>
                      <p className="mt-0.5 text-[11px] text-body">{typeLabel} · déposé le {formatDateFr(doc.uploadedISO)}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] font-medium text-brand transition-colors hover:bg-brand-50"
                          >
                            <IconExternalLink size={12} /> Ouvrir le lien
                          </a>
                        ) : null}
                        {doc.hasFile ? (
                          <Badge variant="outline" className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[9px] text-emerald-700">
                            Fichier sécurisé
                          </Badge>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void removeDocument(doc.id)}
                          aria-label={`Supprimer ${doc.name}`}
                          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* --------------------- Attestations & évaluations --------------------- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <IconCertificate size={17} className="text-brand" /> Attestation de fin de stage &amp; évaluation
        </h2>
        {data.pastInterns.length === 0 ? (
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-body">
              Vos attestations et évaluations finales apparaîtront ici à la fin de vos stages.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.pastInterns.map((intern) => (
              <Card key={intern.id} className="border-slate-200/80 shadow-sm">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">{intern.position} — {intern.company}</p>
                      <p className="text-xs text-body">
                        {formatDateFr(intern.startDateISO)} → {formatDateFr(intern.endDateISO)}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-slate-300 bg-slate-100 text-[10px] text-slate-600">
                      Stage terminé
                    </Badge>
                  </div>

                  {intern.attestation ? (
                    <div className="rounded-xl border border-gold/30 bg-gold-50/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <IconCertificate size={16} className="text-gold-dark" />
                          <p className="text-xs font-bold text-gold-dark">Attestation officielle — {intern.attestation.reference}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => downloadAttestation(intern.attestation!.reference, intern.attestation!.content)}
                          className="h-8 gap-1.5 rounded-lg bg-gold text-[11px] font-bold text-brand hover:bg-gold-dark"
                        >
                          <IconDownload size={13} /> Télécharger
                        </Button>
                      </div>
                      <p className="mt-2 max-h-36 overflow-y-auto whitespace-pre-line rounded-lg border border-gold/25 bg-white p-3 text-[11px] leading-relaxed text-body">
                        {intern.attestation.content}
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-body">
                      L&apos;attestation sera générée par l&apos;entreprise à la clôture administrative du stage.
                    </p>
                  )}

                  {intern.evaluation ? (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Évaluation finale du tuteur</p>
                      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { label: "Technique", value: intern.evaluation.technique },
                          { label: "Ponctualité", value: intern.evaluation.ponctualite },
                          { label: "Autonomie", value: intern.evaluation.autonomie },
                          { label: "Esprit d'équipe", value: intern.evaluation.espritEquipe },
                        ].map((crit) => (
                          <div key={crit.label} className="rounded-xl border border-slate-200/80 p-2.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-ink">{crit.label}</span>
                              <span className="font-bold text-brand">{crit.value}/5</span>
                            </div>
                            <Progress value={(crit.value / 5) * 100} className="mt-1.5 h-1.5" aria-label={`${crit.label} ${crit.value}/5`} />
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 rounded-xl border border-brand/15 bg-brand-50/60 p-3 text-xs leading-relaxed text-body">
                        <span className="font-bold text-brand">Appréciation : </span>
                        {intern.evaluation.appreciation}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------- Dialog de dépôt ------------------------- */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">Déposer un document</DialogTitle>
            <DialogDescription className="text-left">
              Pièce d&apos;identité, assurance, rapport de stage… (fichier ≤ 1 Mo ou lien externe sécurisé)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-ink">Type de document</label>
              <Select value={uploadType} onValueChange={(value) => setUploadType(value as StudentDocumentType)}>
                <SelectTrigger className="mt-1 h-10 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="doc-name" className="text-xs font-semibold text-ink">Nom du document</label>
              <Input
                id="doc-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Ex. CNI Sènami Djogbenou"
                className="mt-1 h-10 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink">Fichier (≤ 1 Mo)</label>
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file);
                }}
                className="mt-1 h-10 cursor-pointer rounded-xl text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                aria-label="Choisir un fichier"
              />
              {uploadFile ? <p className="mt-1 text-[11px] text-emerald-600">Fichier prêt : {uploadFile.name}</p> : null}
            </div>
            <Separator />
            <div>
              <label htmlFor="doc-url" className="text-xs font-semibold text-ink">…ou lien externe (Drive, GitHub)</label>
              <Input
                id="doc-url"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
                className="mt-1 h-10 rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={() => void upload()}
              disabled={uploadBusy || (!uploadFile && uploadUrl.trim() === "") || (uploadName.trim().length < 3 && !uploadFile)}
              className="gap-1.5 rounded-xl bg-brand text-white hover:bg-brand-dark"
            >
              {uploadBusy ? <IconLoader2 size={15} className="animate-spin" /> : <IconUpload size={15} />}
              Déposer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
