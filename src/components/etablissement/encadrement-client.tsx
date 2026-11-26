"use client";

/**
 * Mes Mémorants (Maître de Mémoire) :
 *  - 4 KPI : mémorants actifs, thèmes à valider, Bons à Soutenir délivrés, assiduité moyenne ;
 *  - cartes étudiants : matricule, entreprise, contact du tuteur entreprise, statut du mémoire ;
 *  - tiroir de validation : problématique / plan / fichier, Groq (analyse + questions),
 *    « Valider le thème », « Demander des corrections », « Délivrer le Bon à Soutenir » ;
 *  - modales journaux et évaluation entreprise.
 */
import { useState, useTransition } from "react";
import {
  IconActivity,
  IconAlertTriangle,
  IconBook2,
  IconBooks,
  IconCalendarMonth,
  IconCheck,
  IconClipboardCheck,
  IconExternalLink,
  IconExternalLink as IconLink,
  IconLoader2,
  IconMail,
  IconPhone,
  IconProgress,
  IconSparkles,
  IconStar,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  approveThesisTopic,
  deliverReadyToDefend,
  requestThesisCorrections,
} from "@/app/etablissement/actions";
import type { EncadrementRow, ThesisStatus } from "@/lib/etablissement-data";
import { formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface EncadrementPayload {
  memberName: string;
  memberTitle: string | null;
  universityName: string;
  universityAcronym: string;
  stages: EncadrementRow[];
}

interface ThesisAnalysis {
  avis: string;
  valable: boolean;
  questions: string[];
  reco: string[];
  model?: string;
  fallback?: boolean;
}

const THESIS_STATUS_META: Record<ThesisStatus, { label: string; cls: string }> = {
  A_VALIDER: { label: "Thème à valider", cls: "border-gold/40 bg-gold-50 text-gold-dark" },
  TOPIC_APPROVED: { label: "Thème validé", cls: "border-brand/25 bg-brand-50 text-brand" },
  REVISION_REQUESTED: { label: "Corrections demandées", cls: "border-orange-300 bg-orange-50 text-orange-700" },
  READY_TO_DEFEND: { label: "Bon à Soutenir délivré", cls: "border-emerald-700/30 bg-emerald-700/10 text-emerald-800" },
};

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof IconBooks; tone: string }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-4">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>
          <Icon size={18} />
        </span>
        <p className="mt-3 text-2xl font-bold tracking-tight text-ink">{value}</p>
        <p className="text-xs font-semibold text-ink">{label}</p>
      </CardContent>
    </Card>
  );
}

export function EncadrementClient({ payload }: { payload: EncadrementPayload }) {
  const { toast } = useToast();
  const [drawerTarget, setDrawerTarget] = useState<EncadrementRow | null>(null);
  const [journalTarget, setJournalTarget] = useState<EncadrementRow | null>(null);
  const [evaluationTarget, setEvaluationTarget] = useState<EncadrementRow | null>(null);
  const [pending, startTransition] = useTransition();

  const actives = payload.stages.filter((s) => s.status === "ACTIF");
  const aValider = payload.stages.filter((s) => s.thesisStatus === "A_VALIDER" || s.thesisStatus === "REVISION_REQUESTED");
  const bons = payload.stages.filter((s) => s.thesisStatus === "READY_TO_DEFEND");
  const presenceRates = payload.stages.filter((s) => s.presenceRate > 0);
  const avgPresence = presenceRates.length
    ? Math.round(presenceRates.reduce((acc, s) => acc + s.presenceRate, 0) / presenceRates.length)
    : 0;

  const presenceTone = (rate: number): string =>
    rate >= 80 ? "text-emerald-700" : rate >= 60 ? "text-gold-dark" : "text-red-600";

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, successTitle: string, successDesc: string) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast({ title: successTitle, description: successDesc });
        setDrawerTarget(null);
      } else {
        toast({ title: "Action impossible", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Mes Mémorants</h1>
        <p className="text-sm text-body">
          {payload.memberTitle ?? "Maître de Mémoire"} — {actives.length} stage(s) en cours et{" "}
          {payload.stages.length - actives.length} terminé(s) sous votre encadrement à {payload.universityAcronym}.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Mémorants actifs" value={String(actives.length)} icon={IconBooks} tone="bg-brand-50 text-brand" />
        <KpiCard label="Thèmes à valider" value={String(aValider.length)} icon={IconClipboardCheck} tone="bg-gold/15 text-gold-dark" />
        <KpiCard label="Bons à Soutenir délivrés" value={String(bons.length)} icon={IconCheck} tone="bg-emerald-50 text-emerald-700" />
        <KpiCard label="Assiduité moyenne" value={`${avgPresence} %`} icon={IconActivity} tone="bg-brand-50 text-brand" />
      </div>

      {payload.stages.length === 0 ? (
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <IconBooks size={26} className="text-brand" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">Aucun mémoire sous votre encadrement</p>
            <p className="mt-1 max-w-sm text-xs text-body">
              Le Chef de Département vous affectera les étudiants depuis « Étudiants de ma filière ». Ils apparaîtront
              ici avec leur problématique et leur suivi hebdomadaire.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {payload.stages.map((s) => {
            const meta = THESIS_STATUS_META[s.thesisStatus];
            return (
              <Card key={s.internId} className="border-slate-200/80 shadow-sm">
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{s.studentName}</p>
                      <p className="truncate text-xs text-body">
                        {s.matricule} · {s.level ?? "Niveau —"} {s.specialty ? `· ${s.specialty}` : ""}
                      </p>
                    </div>
                    <Badge
                      className={
                        s.status === "ACTIF"
                          ? "shrink-0 rounded-lg bg-emerald-600 text-[10px] font-bold text-white hover:bg-emerald-700"
                          : "shrink-0 rounded-lg bg-slate-500 text-[10px] font-bold text-white hover:bg-slate-600"
                      }
                    >
                      {s.status === "ACTIF" ? "En cours" : "Terminé"}
                    </Badge>
                  </div>

                  {/* Intitulé + statut mémoire */}
                  <div className="rounded-xl border border-gold/25 bg-gold/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gold-dark">
                        <IconBook2 size={13} />
                        Mémoire
                      </p>
                      <Badge variant="outline" className={cn("text-[9px] font-bold", meta.cls)}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold leading-snug text-ink">
                      {s.thesisTitle ?? "Intitulé à confirmer avec l'étudiant"}
                    </p>
                    {s.thesisStatus === "REVISION_REQUESTED" && s.supervisorFeedback ? (
                      <p className="mt-1.5 rounded-lg bg-white/70 p-2 text-[11px] leading-relaxed text-body">
                        <IconAlertTriangle size={11} className="mr-1 inline text-orange-600" />
                        {s.supervisorFeedback}
                      </p>
                    ) : null}
                    {s.thesisStatus === "READY_TO_DEFEND" && s.approvedToDefendAt ? (
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-800">
                        Bon à Soutenir délivré le {formatDateFr(s.approvedToDefendAt)}
                      </p>
                    ) : null}
                  </div>

                  <p className="flex items-center gap-1.5 text-[11px] text-body">
                    <IconActivity size={13} className="text-slate-400" />
                    {s.position} · <strong className="text-ink">{s.companyName}</strong>
                    {s.departmentCode ? ` · Dépt. ${s.departmentCode}` : ""}
                  </p>

                  {/* Contact du tuteur entreprise */}
                  {s.tutor ? (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        <IconUserCircle size={12} />
                        Tuteur entreprise
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-ink">
                        {s.tutor.name}
                        {s.tutor.position ? ` — ${s.tutor.position}` : ""}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-body">
                        <span className="inline-flex items-center gap-1">
                          <IconMail size={11} className="text-slate-400" />
                          {s.tutor.email}
                        </span>
                        {s.tutor.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <IconPhone size={11} className="text-slate-400" />
                            {s.tutor.phone}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] italic text-slate-400">Tuteur entreprise non identifié.</p>
                  )}

                  {s.status === "ACTIF" ? (
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 font-semibold text-ink">
                          <IconProgress size={13} className="text-brand" />
                          Semaine {s.currentWeek} / {s.totalWeeks}
                        </span>
                        <span className="text-slate-400">
                          {formatDateFr(s.startDate)} → {formatDateFr(s.endDate)}
                        </span>
                      </div>
                      <Progress
                        value={(s.currentWeek / s.totalWeeks) * 100}
                        className="mt-1.5 h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-brand"
                      />
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 text-[11px] text-body">
                      <IconCalendarMonth size={13} className="text-slate-400" />
                      {formatDateFr(s.startDate)} → {formatDateFr(s.endDate)}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className={`text-sm font-bold ${presenceTone(s.presenceRate)}`}>{s.presenceRate} %</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Présence</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-sm font-bold text-ink">
                        {s.tasksDone}/{s.tasksTotal || "—"}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tâches terminées</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-sm font-bold text-ink">{s.journals.length}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Journaux</p>
                    </div>
                  </div>

                  <Separator />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {s.evaluation ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEvaluationTarget(s)}
                        className="h-8 gap-1 rounded-lg border-gold/40 bg-gold/10 px-2.5 text-[11px] font-semibold text-gold-dark hover:bg-gold/20"
                      >
                        <IconStar size={14} />
                        Évaluation {s.evaluation.average.toFixed(1)}/5
                      </Button>
                    ) : (
                      <p className="text-[11px] text-slate-400">Évaluation finale à venir</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setJournalTarget(s)}
                        className="h-8 gap-1 rounded-lg border-brand/30 px-2.5 text-[11px] font-semibold text-brand hover:bg-brand-50"
                      >
                        <IconBook2 size={14} />
                        Journaux ({s.journals.length})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDrawerTarget(s)}
                        className="h-8 gap-1 rounded-lg bg-brand px-2.5 text-[11px] font-semibold text-white hover:bg-brand-dark"
                      >
                        <IconClipboardCheck size={14} />
                        Valider le mémoire
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------------- Tiroir de validation du mémoire ---------------- */}
      <Sheet open={drawerTarget !== null} onOpenChange={(open) => !open && setDrawerTarget(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {drawerTarget ? <ThesisDrawer target={drawerTarget} onClose={() => setDrawerTarget(null)} act={act} pending={pending} /> : null}
        </SheetContent>
      </Sheet>

      {/* Modale journaux hebdomadaires */}
      <Dialog open={journalTarget !== null} onOpenChange={(open) => !open && setJournalTarget(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl border-slate-200/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <IconBook2 size={18} className="text-brand" />
              Journaux hebdomadaires — {journalTarget?.studentName}
            </DialogTitle>
            <DialogDescription>
              Suivi hebdomadaire de « {journalTarget?.thesisTitle ?? journalTarget?.position} » chez{" "}
              {journalTarget?.companyName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {journalTarget?.journals.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-body">
                Aucun journal hebdomadaire saisi pour le moment.
              </p>
            ) : (
              journalTarget?.journals.map((j) => (
                <div key={j.week} className="rounded-xl border border-slate-200/80 bg-white p-3">
                  <p className="text-xs font-bold text-brand">Semaine {j.week}</p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-body">{j.content}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modale évaluation finale */}
      <Dialog open={evaluationTarget !== null} onOpenChange={(open) => !open && setEvaluationTarget(null)}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-200/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <IconStar size={18} className="text-gold" />
              Évaluation entreprise — {evaluationTarget?.studentName}
            </DialogTitle>
            <DialogDescription>
              Notes attribuées par {evaluationTarget?.companyName} en fin de stage.
            </DialogDescription>
          </DialogHeader>
          {evaluationTarget?.evaluation ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ["Technique", evaluationTarget.evaluation.technique],
                    ["Ponctualité", evaluationTarget.evaluation.ponctualite],
                    ["Autonomie", evaluationTarget.evaluation.autonomie],
                    ["Esprit d'équipe", evaluationTarget.evaluation.espritEquipe],
                  ] as const
                ).map(([label, note]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-2">
                    <p className="text-base font-bold text-brand">{note}/5</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-white">
                <span className="text-sm font-semibold">Moyenne générale</span>
                <span className="text-lg font-extrabold text-gold">
                  {evaluationTarget.evaluation.average.toFixed(1)}/5
                </span>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <IconCheck size={13} />
                  Appréciation du tuteur
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-body">
                  {evaluationTarget.evaluation.appreciation || "—"}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================== TIROIR DE VALIDATION ============================== */

function ThesisDrawer({
  target,
  onClose,
  act,
  pending,
}: {
  target: EncadrementRow;
  onClose: () => void;
  act: (fn: () => Promise<{ ok: boolean; error?: string }>, title: string, desc: string) => void;
  pending: boolean;
}) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/etablissement/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "thesis",
          payload: {
            studentName: target.studentName,
            level: target.level ?? "Master",
            specialty: target.specialty ?? "Spécialité non renseignée",
            companyName: target.companyName,
            position: target.position,
            thesisTitle: target.thesisTitle ?? target.position,
            thesisTopic: target.thesisTopic ?? target.thesisTitle ?? target.position,
            thesisPlan: target.thesisPlan ?? "",
          },
        }),
      });
      const data = (await res.json()) as ThesisAnalysis & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok || !data.avis) {
        toast({ title: "Analyse impossible", description: data.error ?? "Erreur du service IA.", variant: "destructive" });
        return;
      }
      setAnalysis(data);
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de contacter l'API IA.", variant: "destructive" });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const meta = THESIS_STATUS_META[target.thesisStatus];
  const canDeliver = target.thesisStatus === "TOPIC_APPROVED";

  return (
    <div>
      <SheetHeader className="border-b border-slate-200/80 bg-brand px-5 py-5 text-white">
        <SheetTitle className="text-left text-base font-bold text-white">
          Validation du mémoire — {target.studentName}
        </SheetTitle>
        <SheetDescription className="text-left text-xs text-white/70">
          {target.matricule} · {target.level ?? "—"} · {target.companyName}
        </SheetDescription>
        <div className="mt-2">
          <Badge variant="outline" className={cn("text-[10px] font-bold", meta.cls)}>
            {meta.label}
          </Badge>
        </div>
      </SheetHeader>

      <div className="space-y-4 px-5 py-4">
        {/* Intitulé */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Intitulé du mémoire</p>
          <p className="mt-1 rounded-xl border border-gold/25 bg-gold/5 p-3 text-sm font-semibold leading-snug text-ink">
            {target.thesisTitle ?? "—"}
          </p>
        </section>

        {/* Problématique */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Problématique soumise</p>
          <p className="mt-1 whitespace-pre-line rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[13px] leading-relaxed text-body">
            {target.thesisTopic ?? "Non renseignée par l'étudiant."}
          </p>
        </section>

        {/* Plan provisoire */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Plan provisoire</p>
          {target.thesisPlan ? (
            <ul className="mt-1 space-y-1">
              {target.thesisPlan.split("\n").filter(Boolean).map((line, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-white px-2 py-1 text-[13px] text-body">
                  <IconCheck size={13} className="mt-0.5 shrink-0 text-brand" />
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm italic text-body">Plan non déposé.</p>
          )}
        </section>

        {/* Fichier du mémoire */}
        {target.thesisFileUrl ? (
          <a
            href={target.thesisFileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-2 hover:underline"
          >
            <IconExternalLink size={14} /> Consulter le document du mémoire
          </a>
        ) : (
          <p className="flex items-center gap-1.5 text-xs italic text-body">
            <IconLink size={13} className="text-slate-400" />
            Aucun fichier déposé pour le moment.
          </p>
        )}

        <Separator />

        {/* Analyse Groq */}
        <section>
          <Button
            onClick={() => void runAnalysis()}
            disabled={analysisLoading}
            className="h-9 gap-2 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark"
          >
            {analysisLoading ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
            Analyser le sujet (Groq IA)
          </Button>
          {analysis ? (
            <div className="mt-3 space-y-2.5">
              <div
                className={cn(
                  "rounded-xl border p-3 text-[13px] leading-relaxed",
                  analysis.valable
                    ? "border-emerald-700/25 bg-emerald-700/5 text-emerald-900"
                    : "border-gold/30 bg-gold/5 text-gold-dark",
                )}
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">
                  Avis IA {analysis.fallback ? "(mode dégradé local)" : `(${analysis.model ?? "Groq"})`}
                </p>
                {analysis.avis}
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Questions pour la séance de validation
                </p>
                <ul className="mt-1.5 space-y-1">
                  {analysis.questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-body">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[9px] font-bold text-brand">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
              {analysis.reco.length > 0 ? (
                <div className="rounded-xl border border-slate-200/80 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recommandations</p>
                  <ul className="mt-1.5 space-y-1">
                    {analysis.reco.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-body">
                        <IconCheck size={12} className="mt-0.5 shrink-0 text-brand" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <Separator />

        {/* Retour au student */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Retour au mémorant {target.supervisorFeedback ? "(actuel)" : ""}
          </p>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder={
              target.thesisStatus === "REVISION_REQUESTED"
                ? "Précisez les corrections attendues (obligatoire pour la demande de corrections)…"
                : "Commentaire facultatif transmis à l'étudiant avec votre validation…"
            }
            className="mt-1.5 text-sm"
          />
        </section>

        {/* Actions */}
        <div className="space-y-2">
          {target.thesisStatus !== "READY_TO_DEFEND" ? (
            <Button
              onClick={() =>
                act(
                  () => approveThesisTopic(target.internId, feedback),
                  "Thème validé",
                  `Le mémoire de ${target.studentName} passe au statut « Thème validé ».`,
                )
              }
              disabled={pending || target.thesisStatus === "TOPIC_APPROVED"}
              className="h-10 w-full gap-2 rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <IconCheck size={15} />
              {target.thesisStatus === "TOPIC_APPROVED" ? "Thème déjà validé" : "Valider le thème (TOPIC_APPROVED)"}
            </Button>
          ) : null}

          {target.thesisStatus !== "READY_TO_DEFEND" ? (
            <Button
              onClick={() =>
                act(
                  () => requestThesisCorrections(target.internId, feedback),
                  "Corrections demandées",
                  `Votre retour a été transmis à ${target.studentName}.`,
                )
              }
              disabled={pending || feedback.trim().length < 15}
              className="h-10 w-full gap-2 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark"
            >
              <IconX size={15} />
              Demander des corrections (REVISION_REQUESTED)
            </Button>
          ) : null}

          <Button
            onClick={() =>
              act(
                () => deliverReadyToDefend(target.internId),
                "Bon à Soutenir délivré",
                `${target.studentName} est autorisé(e) à soutenir son mémoire devant le jury.`,
              )
            }
            disabled={pending || !canDeliver}
            className="h-10 w-full gap-2 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-dark"
          >
            <IconClipboardCheck size={15} />
            {canDeliver
              ? "Délivrer le Bon à Soutenir (READY_TO_DEFEND)"
              : target.thesisStatus === "READY_TO_DEFEND"
                ? "Bon à Soutenir déjà délivré"
                : "Validez d'abord le thème pour délivrer le Bon à Soutenir"}
          </Button>
        </div>

        <Button variant="outline" onClick={onClose} className="h-9 w-full gap-1.5 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50">
          Fermer
        </Button>
      </div>
    </div>
  );
}
