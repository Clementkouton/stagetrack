"use client";

/**
 * Suivi des Stages (client) — barres de progression, taux de présence,
 * modale de lecture des journaux hebdomadaires + répartition des tâches.
 */
import { useState } from "react";
import {
  IconActivity,
  IconBook2,
  IconBrandAsana,
  IconCalendarMonth,
  IconChecklist,
  IconProgress,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { SuiviRow } from "@/lib/etablissement-data";
import { formatDateFr, formatDateTimeFr } from "@/lib/entreprise-format";

export interface SuiviPayload {
  isChef: boolean;
  departmentCode: string | null;
  universityAcronym: string;
  stages: SuiviRow[];
}

export function SuiviClient({ payload }: { payload: SuiviPayload }) {
  const [journalTarget, setJournalTarget] = useState<SuiviRow | null>(null);

  const presenceTone = (rate: number): string =>
    rate >= 80 ? "text-emerald-700" : rate >= 60 ? "text-gold-dark" : "text-red-600";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Suivi des Stages</h1>
        <p className="text-sm text-body">
          {payload.stages.length} stage(s) actif(s) {payload.isChef ? `dans le département ${payload.departmentCode}` : `à ${payload.universityAcronym}`} —
          progression, présences et journaux de bord.
        </p>
      </div>

      {payload.stages.length === 0 ? (
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <IconActivity size={26} className="text-brand" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">Aucun stage actif dans votre périmètre</p>
            <p className="mt-1 max-w-sm text-xs text-body">
              Les stages démarreront dès que les conventions seront signées et les étudiants accueillis par les
              entreprises partenaires.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {payload.stages.map((s) => (
            <Card key={s.internId} className="border-slate-200/80 shadow-sm">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{s.studentName}</p>
                    <p className="truncate text-xs text-body">
                      {s.matricule} · {s.position} · {s.companyName}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-lg border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                    {s.departmentCode ?? "—"}
                  </Badge>
                </div>

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
                  <Progress value={(s.currentWeek / s.totalWeeks) * 100} className="mt-1.5 h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-brand" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className={`text-sm font-bold ${presenceTone(s.presenceRate)}`}>{s.presenceRate} %</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Présence</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-sm font-bold text-ink">
                      {s.tasksDone}/{s.tasksTotal || "—"}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tâches validées</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-sm font-bold text-ink">{s.journals.length}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Journaux</p>
                  </div>
                </div>

                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-body">
                    <IconUsersGroup size={13} className="text-slate-400" />
                    Tuteur : <strong className="text-ink">{s.tutorName ?? "à assigner"}</strong>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setJournalTarget(s)}
                    className="h-8 gap-1 rounded-lg border-brand/30 px-2.5 text-[11px] font-semibold text-brand hover:bg-brand-50"
                  >
                    <IconBook2 size={12} />
                    Journaux hebdo ({s.journals.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ------------------- Modale journaux ------------------- */}
      <Dialog
        open={journalTarget !== null}
        onOpenChange={(open) => {
          if (!open) setJournalTarget(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-ink">
              <IconBook2 size={17} className="text-brand" />
              Journaux hebdomadaires — {journalTarget?.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-body">
              {journalTarget
                ? `${journalTarget.position} chez ${journalTarget.companyName} · tuteur ${journalTarget.tutorName ?? "—"} · ${journalTarget.journals.length} bilan(x) soumis`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {journalTarget && journalTarget.journals.length > 0 ? (
              journalTarget.journals.map((j) => (
                <div key={j.week} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <IconCalendarMonth size={13} className="text-gold" />
                      Semaine {j.week}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDateTimeFr(j.createdAt)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-body">{j.content}</p>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm italic text-body">
                Aucun journal de bord soumis pour le moment.
              </p>
            )}
            {journalTarget ? (
              <p className="flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <IconChecklist size={12} /> Tâches validées par le tuteur : {journalTarget.tasksDone}/{journalTarget.tasksTotal}
                <IconBrandAsana size={12} className="ml-2" /> Présence moyenne : {journalTarget.presenceRate} %
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
