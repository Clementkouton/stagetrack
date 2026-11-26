"use client";

/**
 * Conventions & Visas (client) — circuit 4 étapes, vérification IA
 * « adéquation pédagogique » (Groq /api/etablissement/ai), visa du Chef de
 * Département avec note, signature officielle de la Direction des Stages.
 */
import { useState } from "react";
import {
  IconBuildingSkyscraper,
  IconCircleCheck,
  IconCircleDot,
  IconClipboardCheck,
  IconLoader2,
  IconLock,
  IconPencilCheck,
  IconSchool,
  IconSparkles,
  IconCertificate,
  IconX,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { approvePedagogicalSubject, signUniversityConvention } from "@/app/etablissement/actions";
import type { ConventionRow } from "@/lib/etablissement-data";
import { formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface ConventionsPayload {
  role: "ADMIN_SCHOOL" | "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";
  departmentCode: string | null;
  universityAcronym: string;
  conventions: ConventionRow[];
}

interface FitResult {
  score: number;
  avis: string;
  favorable: boolean;
  reco: string[];
  model: string;
  fallback?: boolean;
}

/** Puce d'étape du circuit (1 étudiant, 2 entreprise, 3 visa, 4 direction). */
function StepDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          done ? "bg-brand text-white" : "border border-slate-300 bg-white text-slate-300",
        )}
      >
        {done ? <IconCircleCheck size={13} /> : <IconCircleDot size={11} />}
      </span>
      <span className={cn("hidden truncate text-[10px] font-semibold lg:inline", done ? "text-ink" : "text-slate-400")}>
        {label}
      </span>
    </div>
  );
}

function CircuitSteps({ c }: { c: ConventionRow }) {
  return (
    <div className="flex items-center gap-2">
      <StepDot done={c.signedStudent} label="Étudiant" />
      <span className="h-px w-3 shrink-0 bg-slate-200" />
      <StepDot done={c.signedCompany} label="Entreprise" />
      <span className="h-px w-3 shrink-0 bg-slate-200" />
      <StepDot done={c.pedagogicalApproved} label="Visa Dépt." />
      <span className="h-px w-3 shrink-0 bg-slate-200" />
      <StepDot done={c.signedUniversity} label="Direction" />
    </div>
  );
}

export function ConventionsClient({ payload }: { payload: ConventionsPayload }) {
  const { toast } = useToast();
  const isChef = payload.role === "HEAD_OF_DEPARTMENT";
  const [fitTarget, setFitTarget] = useState<ConventionRow | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [visaTarget, setVisaTarget] = useState<ConventionRow | null>(null);
  const [visaNote, setVisaNote] = useState("");
  const [visaApproved, setVisaApproved] = useState(true);
  const [visaSaving, setVisaSaving] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);

  const runFitCheck = async (c: ConventionRow) => {
    setFitTarget(c);
    setFitResult(null);
    setFitLoading(true);
    try {
      const res = await fetch("/api/etablissement/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fit",
          payload: {
            studentName: c.studentName,
            departmentName: c.departmentCode ? `Département ${c.departmentCode}` : "Département académique",
            specialty: c.studentSpecialty ?? "Spécialité non renseignée",
            level: c.studentLevel ?? "Niveau non renseigné",
            position: c.position,
            companyName: c.companyName,
            missions: c.missions ?? "",
          },
        }),
      });
      const data = (await res.json()) as FitResult & { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        toast({ title: "Analyse impossible", description: data.error ?? "Erreur du service IA.", variant: "destructive" });
        setFitTarget(null);
      } else {
        setFitResult({
          score: data.score,
          avis: data.avis,
          favorable: data.favorable,
          reco: data.reco,
          model: data.model,
          fallback: data.fallback,
        });
      }
    } catch {
      toast({ title: "Analyse impossible", description: "Connexion au service IA échouée.", variant: "destructive" });
      setFitTarget(null);
    } finally {
      setFitLoading(false);
    }
  };

  const submitVisa = async () => {
    if (!visaTarget) return;
    setVisaSaving(true);
    try {
      const result = await approvePedagogicalSubject({
        conventionId: visaTarget.id,
        approved: visaApproved,
        note: visaNote,
      });
      if (result.ok) {
        toast({
          title: visaApproved ? "Visa pédagogique accordé" : "Visa réservé",
          description: `${visaTarget.reference} — ${visaTarget.studentName}`,
        });
        setVisaTarget(null);
        setVisaNote("");
      } else {
        toast({ title: "Visa impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setVisaSaving(false);
    }
  };

  const submitSignature = async (c: ConventionRow) => {
    setSigningId(c.id);
    try {
      const result = await signUniversityConvention(c.id);
      if (result.ok) {
        toast({ title: "Convention signée officiellement", description: `${c.reference} — circuit de validation terminé.` });
      } else {
        toast({ title: "Signature impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSigningId(null);
    }
  };

  const visaEnabled = (c: ConventionRow) => isChef && c.signedStudent && c.signedCompany && !c.pedagogicalApproved && !c.signedUniversity;
  const signEnabled = (c: ConventionRow) =>
    !isChef && c.signedStudent && c.signedCompany && c.pedagogicalApproved && !c.signedUniversity;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Conventions &amp; Visas</h1>
        <p className="text-sm text-body">
          Circuit de validation : 1. Étudiant → 2. Entreprise → 3. Visa Chef de Département → 4. Signature Direction des
          Stages {payload.departmentCode ? `(département ${payload.departmentCode})` : `(${payload.universityAcronym})`}.
        </p>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="max-h-[34rem] overflow-y-auto rounded-xl">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500">Convention</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Circuit (4 étapes)</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-slate-500 xl:table-cell">Dates</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.conventions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-body">
                      Aucune convention dans votre périmètre.
                    </TableCell>
                  </TableRow>
                ) : (
                  payload.conventions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="text-xs font-bold text-ink">{c.reference}</p>
                        <p className="truncate text-sm font-semibold text-ink">{c.studentName}</p>
                        <p className="truncate text-[11px] text-body">
                          {c.position} · {c.companyName} · Dépt. {c.departmentCode ?? "—"}
                        </p>
                        {c.studentSpecialty ? (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {c.studentSpecialty} · {c.studentLevel ?? "—"}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <CircuitSteps c={c} />
                        {c.status === "SIGNEE" ? (
                          <Badge className="mt-2 gap-1 rounded-lg bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-700">
                            <IconCircleCheck size={11} /> Signée — circuit terminé
                          </Badge>
                        ) : c.pedagogicalApproved && c.pedagogicalNote ? (
                          <p className="mt-1.5 line-clamp-2 max-w-64 text-[10px] italic leading-snug text-slate-500">
                            « {c.pedagogicalNote} »
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <p className="text-[11px] text-body">
                          {c.startDate && c.endDate
                            ? `${formatDateFr(c.startDate)} → ${formatDateFr(c.endDate)}`
                            : "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void runFitCheck(c)}
                            className="h-8 gap-1 rounded-lg border-brand/30 px-2 text-[11px] font-semibold text-brand hover:bg-brand-50"
                          >
                            <IconSparkles size={12} className="text-gold" />
                            Vérifier l&apos;adéquation (IA)
                          </Button>
                          {visaEnabled(c) ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setVisaTarget(c);
                                setVisaNote("");
                                setVisaApproved(true);
                              }}
                              className="h-8 gap-1 rounded-lg bg-gold px-2 text-[11px] font-bold text-white hover:bg-gold-dark"
                            >
                              <IconCertificate size={12} />
                              Accorder le visa
                            </Button>
                          ) : null}
                          {signEnabled(c) ? (
                            <Button
                              size="sm"
                              disabled={signingId === c.id}
                              onClick={() => void submitSignature(c)}
                              className="h-8 gap-1 rounded-lg bg-brand px-2 text-[11px] font-bold text-white hover:bg-brand-dark"
                            >
                              {signingId === c.id ? <IconLoader2 size={12} className="animate-spin" /> : <IconPencilCheck size={12} />}
                              Signer officiellement
                            </Button>
                          ) : null}
                          {!visaEnabled(c) && !signEnabled(c) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300">
                              <IconLock size={11} />
                              {c.signedUniversity
                                ? "Terminée"
                                : c.pedagogicalApproved
                                  ? isChef
                                    ? "Visa accordé"
                                    : "Attente Direction"
                                  : isChef
                                    ? "Signatures en cours"
                                    : "Attente visa Dépt."}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------- Modale analyse IA ------------------- */}
      <Dialog
        open={fitTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFitTarget(null);
            setFitResult(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-ink">
              <IconSparkles size={17} className="text-gold" />
              Adéquation pédagogique (Groq IA)
            </DialogTitle>
            <DialogDescription className="text-xs text-body">
              {fitTarget
                ? `${fitTarget.studentName} — « ${fitTarget.position} » chez ${fitTarget.companyName} vs spécialité ${fitTarget.studentSpecialty ?? "—"} (${fitTarget.studentLevel ?? "—"}).`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {fitLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-body">
              <IconLoader2 size={20} className="animate-spin text-brand" />
              Analyse du sujet en cours…
            </div>
          ) : fitResult && fitTarget ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                <div
                  className={cn(
                    "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white",
                    fitResult.favorable ? "bg-emerald-700" : "bg-gold",
                  )}
                >
                  <span className="text-xl font-bold">{fitResult.score}</span>
                  <span className="text-[9px] font-semibold uppercase">/ 100</span>
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold", fitResult.favorable ? "text-emerald-800" : "text-gold-dark")}>
                    Avis {fitResult.favorable ? "favorable" : "réservé"}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-body">{fitResult.avis.replace(/^FAVORABLE\s*—\s*|^RESERVE\s*—\s*/i, "")}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Recommandations au Chef de Département</p>
                <ul className="mt-2 space-y-1.5">
                  {fitResult.reco.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-body">
                      <IconCircleCheck size={13} className="mt-0.5 shrink-0 text-brand" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <Badge variant="outline" className={cn("text-[10px]", fitResult.fallback ? "border-gold/40 bg-gold-50 text-gold-dark" : "border-brand/20 bg-brand-50 text-brand")}>
                  {fitResult.fallback ? "Mode dégradé local" : fitResult.model}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setFitTarget(null); setFitResult(null); }} className="h-9 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50">
                    Fermer
                  </Button>
                  {isChef && fitTarget && fitTarget.signedStudent && fitTarget.signedCompany && !fitTarget.pedagogicalApproved && !fitTarget.signedUniversity ? (
                    <Button
                      onClick={() => {
                        setVisaTarget(fitTarget);
                        setVisaNote(fitResult.reco[0] ?? "");
                        setVisaApproved(fitResult.favorable);
                        setFitTarget(null);
                        setFitResult(null);
                      }}
                      className="h-9 gap-1.5 rounded-xl bg-gold text-xs font-bold text-white hover:bg-gold-dark"
                    >
                      <IconCertificate size={14} />
                      Vers le visa
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ------------------- Modale visa ------------------- */}
      <Dialog
        open={visaTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVisaTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-ink">
              <IconCertificate size={17} className="text-gold" />
              Visa pédagogique — {visaTarget?.reference}
            </DialogTitle>
            <DialogDescription className="text-xs text-body">
              {visaTarget
                ? `${visaTarget.studentName} — « ${visaTarget.position} » chez ${visaTarget.companyName}. Étape 3 du circuit : votre visa conditionne la signature finale de la Direction.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisaApproved(true)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors",
                  visaApproved ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <IconClipboardCheck size={14} /> Visa accordé
              </button>
              <button
                type="button"
                onClick={() => setVisaApproved(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors",
                  !visaApproved ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <IconX size={14} /> Visa réservé
              </button>
            </div>
            <div>
              <Label htmlFor="visa-note" className="text-xs font-semibold text-ink">
                Note d&apos;avis pédagogique (10 caractères minimum)
              </Label>
              <Textarea
                id="visa-note"
                value={visaNote}
                onChange={(e) => setVisaNote(e.target.value)}
                rows={3}
                placeholder="Ex. Sujet cohérent avec la spécialité Réseaux (M1) ; missions conformes au référentiel ; tuteur identifié."
                className="mt-1 resize-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" onClick={() => setVisaTarget(null)} className="h-9 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50">
                Annuler
              </Button>
              <Button
                onClick={() => void submitVisa()}
                disabled={visaSaving || visaNote.trim().length < 10}
                className={cn(
                  "h-9 gap-1.5 rounded-xl text-xs font-bold text-white",
                  visaApproved ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-600 hover:bg-red-700",
                )}
              >
                {visaSaving ? <IconLoader2 size={14} className="animate-spin" /> : <IconCertificate size={14} />}
                {visaApproved ? "Accorder le visa" : "Enregistrer le visa réservé"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <IconSchool size={12} /> Visa actif uniquement pour le Chef de Département · Signature officielle réservée à la
        Direction des Stages, après visa. <IconBuildingSkyscraper size={12} /> Les signatures étudiant et entreprise
        proviennent des espaces correspondants.
      </p>
    </div>
  );
}
