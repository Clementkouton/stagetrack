"use client";

/**
 * Mes stagiaires — répertoire des stagiaires actifs / terminés avec fiches 360°,
 * barre de progression du stage, tuteur assigné, checklist d'onboarding et tag vivier.
 */
import { useMemo, useState, useTransition } from "react";
import {
  IconAward,
  IconBook,
  IconCalendarStats,
  IconCircleCheck,
  IconCircleX,
  IconFlag,
  IconSchool,
  IconSparkles,
  IconUserCircle,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { terminateIntern, toggleOnboardingItem, toggleVivierTag } from "@/app/entreprise/actions";
import { colorFor, formatDateFr, initialsOf } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface InternCard {
  id: string;
  name: string;
  matricule: string;
  university: string;
  email: string;
  position: string;
  tutorName: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  currentWeek: number;
  status: string;
  vivierTag: boolean;
  onboarding: Array<{ label: string; done: boolean }>;
}

export function InternsClient({ interns }: { interns: InternCard[] }) {
  const [filter, setFilter] = useState<"ACTIF" | "TERMINE" | "TOUS">("ACTIF");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const filtered = useMemo(
    () => (filter === "TOUS" ? interns : interns.filter((i) => i.status === filter)),
    [interns, filter],
  );

  const selected = interns.find((i) => i.id === selectedId) ?? null;
  const actifs = interns.filter((i) => i.status === "ACTIF").length;
  const termines = interns.filter((i) => i.status === "TERMINE").length;

  const toggleItem = (intern: InternCard, index: number, done: boolean) => {
    startTransition(async () => {
      const result = await toggleOnboardingItem(intern.id, index, done);
      if (!result.ok) toast({ title: "Erreur", description: result.error, variant: "destructive" });
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Mes stagiaires</h1>
          <p className="mt-1 text-sm text-body">
            {actifs} stagiaire(s) en poste · {termines} au vivier de talents
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1">
          {(
            [
              { key: "ACTIF", label: "En poste" },
              { key: "TERMINE", label: "Terminés" },
              { key: "TOUS", label: "Tous" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant="ghost"
              onClick={() => setFilter(tab.key)}
              className={cn(
                "h-7 px-3 text-xs",
                filter === tab.key ? "bg-brand-50 text-brand hover:bg-brand-50" : "text-body",
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="col-span-full border-dashed border-slate-300 bg-white">
            <CardContent className="py-12 text-center text-sm text-body">
              Aucun stagiaire dans cette catégorie pour le moment.
            </CardContent>
          </Card>
        ) : (
          filtered.map((intern) => {
            const progressPct = Math.min(100, Math.round((intern.currentWeek / intern.totalWeeks) * 100));
            const doneCount = intern.onboarding.filter((i) => i.done).length;
            const daysLeft = Math.ceil((new Date(intern.endDate).getTime() - Date.now()) / 86400000);
            return (
              <Card
                key={intern.id}
                className={cn(
                  "border-slate-200/80 rounded-xl bg-white transition-shadow hover:shadow-md",
                  intern.status === "ACTIF" && daysLeft <= 14 && daysLeft > 0 && "border-gold/50 ring-1 ring-gold/30",
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white", colorFor(intern.name))}>
                        {initialsOf(intern.name)}
                      </span>
                      <div>
                        <p className="font-bold text-ink">{intern.name}</p>
                        <p className="text-xs text-body">{intern.matricule} · {intern.university}</p>
                      </div>
                    </div>
                    {intern.status === "ACTIF" ? (
                      <Badge variant="outline" className="shrink-0 border-emerald-700/30 bg-emerald-700/10 text-[10px] font-bold text-emerald-800">
                        En poste
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 border-slate-300 bg-slate-100 text-[10px] font-bold text-slate-600">
                        Terminé
                      </Badge>
                    )}
                  </div>

                  <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-ink">
                    <IconBook size={15} className="mt-0.5 shrink-0 text-brand" />
                    {intern.position}
                  </p>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">
                        Semaine {intern.currentWeek} / {intern.totalWeeks}
                      </span>
                      <span className="text-body">{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="mt-1.5 h-2 bg-brand-50" />
                    {intern.status === "ACTIF" ? (
                      <p className={cn("mt-1.5 text-[11px]", daysLeft <= 14 ? "font-semibold text-gold-dark" : "text-body")}>
                        {daysLeft > 0
                          ? `Fin du stage dans ${daysLeft} jour(s) — ${formatDateFr(intern.endDate)}`
                          : "Stage à clôturer"}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-body">
                        Stage terminé le {formatDateFr(intern.endDate)}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="border-brand/20 bg-brand-50 text-[10px] font-medium text-brand">
                      <IconUserCircle size={11} className="mr-1" />
                      Tuteur : {intern.tutorName}
                    </Badge>
                    {intern.vivierTag ? (
                      <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                        <IconSparkles size={11} className="mr-1" />
                        Vivier de talents
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-body">
                      Onboarding : {doneCount}/{intern.onboarding.length}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => setSelectedId(intern.id)}
                    >
                      Fiche 360°
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Fiche 360° */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected ? (
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-ink">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", colorFor(selected.name))}>
                  {initialsOf(selected.name)}
                </span>
                <span>
                  {selected.name}
                  <span className="block text-xs font-medium text-body">{selected.position}</span>
                </span>
              </DialogTitle>
              <DialogDescription>
                {selected.matricule} · {selected.university} · {selected.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="rounded-xl border border-slate-200/80 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <IconCalendarStats size={12} className="text-brand" />
                    Début du stage
                  </p>
                  <p className="mt-1 font-semibold text-ink">{formatDateFr(selected.startDate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <IconFlag size={12} className="text-brand" />
                    Fin prévue
                  </p>
                  <p className="mt-1 font-semibold text-ink">{formatDateFr(selected.endDate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <IconUserCircle size={12} className="text-brand" />
                    Tuteur
                  </p>
                  <p className="mt-1 font-semibold text-ink">{selected.tutorName}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <IconSchool size={12} className="text-brand" />
                    École d&apos;origine
                  </p>
                  <p className="mt-1 font-semibold text-ink">{selected.university}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Checklist d&apos;onboarding</p>
                  <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                    {selected.onboarding.filter((i) => i.done).length}/{selected.onboarding.length}
                  </Badge>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {selected.onboarding.map((item, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => toggleItem(selected, i, !item.done)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
                      >
                        {item.done ? (
                          <IconCircleCheck size={17} className="shrink-0 text-emerald-700" />
                        ) : (
                          <IconCircleX size={17} className="shrink-0 text-slate-300" />
                        )}
                        <span className={cn(item.done ? "text-body line-through decoration-slate-300" : "font-medium text-ink")}>
                          {item.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  startTransition(async () => {
                    const result = await toggleVivierTag(selected.id, !selected.vivierTag);
                    toast(
                      result.ok
                        ? {
                            title: selected.vivierTag ? "Retiré du vivier" : "Ajouté au vivier",
                            description: selected.vivierTag
                              ? `${selected.name} n'est plus marqué(e) comme vivier de talents.`
                              : `${selected.name} est ajouté(e) au vivier de talents.`,
                          }
                        : { title: "Erreur", description: result.error, variant: "destructive" },
                    );
                  });
                }}
                className="gap-1.5 rounded-xl border-gold/40 text-gold-dark hover:bg-gold-50"
              >
                <IconAward size={15} />
                {selected.vivierTag ? "Retirer du vivier" : "Marquer vivier"}
              </Button>
              {selected.status === "ACTIF" ? (
                <Button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await terminateIntern(selected.id);
                      toast(
                        result.ok
                          ? { title: "Stage clôturé", description: `${selected.name} est passé(e) au statut « Terminé ».` }
                          : { title: "Erreur", description: result.error, variant: "destructive" },
                      );
                      if (result.ok) setSelectedId(null);
                    });
                  }}
                  className="gap-1.5 rounded-xl bg-brand hover:bg-brand-dark"
                >
                  <IconUsersGroup size={15} />
                  Clôturer le stage
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
