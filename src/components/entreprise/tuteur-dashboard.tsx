"use client";

/**
 * Tableau de bord du Tuteur / Maître de Stage :
 *  - 4 KPI personnels : stagiaires encadrés, feuilles à valider, journaux sans
 *    retour, évaluations à finaliser ;
 *  - actions urgentes : validation en un clic des présences, journaux à lire,
 *    missions en revue, évaluations à compléter.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  IconArrowRight,
  IconCalendarCheck,
  IconCheck,
  IconClipboardCheck,
  IconClipboardList,
  IconNotebook,
  IconReportAnalytics,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { validatePresenceSheet } from "@/app/entreprise/actions";
import { cn } from "@/lib/utils";

export interface TuteurKpis {
  internsActifs: number;
  presencesToValidate: number;
  journalsWithoutFeedback: number;
  evaluationsToFinalize: number;
}

export interface TuteurIntern {
  id: string;
  name: string;
  position: string;
  currentWeek: number;
  totalWeeks: number;
}

export interface TuteurPresence {
  id: string;
  internName: string;
  periodLabel: string;
  daysPresent: number;
  totalDays: number;
}

export interface TuteurJournal {
  id: string;
  internId: string;
  internName: string;
  week: number;
}

export interface TuteurTask {
  id: string;
  internId: string;
  internName: string;
  title: string;
  status: string;
  week: number;
}

export interface TuteurEvaluation {
  internId: string;
  internName: string;
  position: string;
}

export function TuteurDashboard({
  tutorName,
  kpis,
  interns,
  presences,
  journals,
  tasks,
  evaluations,
}: {
  tutorName: string;
  kpis: TuteurKpis;
  interns: TuteurIntern[];
  presences: TuteurPresence[];
  journals: TuteurJournal[];
  tasks: TuteurTask[];
  evaluations: TuteurEvaluation[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [validated, setValidated] = useState<string[]>([]);

  const kpiCards = [
    {
      label: "Mes stagiaires actifs",
      value: kpis.internsActifs,
      icon: IconUsersGroup,
      href: "/entreprise/stagiaires",
      hint: "encadrés par vous cette semaine",
      highlight: true,
    },
    {
      label: "Feuilles à valider",
      value: kpis.presencesToValidate,
      icon: IconCalendarCheck,
      href: "/entreprise/suivi",
      hint: "feuilles de présence soumises",
      alert: kpis.presencesToValidate > 0,
    },
    {
      label: "Journaux sans retour",
      value: kpis.journalsWithoutFeedback,
      icon: IconNotebook,
      href: "/entreprise/suivi",
      hint: "vos stagiaires attendent un avis",
      alert: kpis.journalsWithoutFeedback > 0,
    },
    {
      label: "Évaluations à finaliser",
      value: kpis.evaluationsToFinalize,
      icon: IconReportAnalytics,
      href: "/entreprise/evaluations",
      hint: "grilles /5 à compléter",
      alert: kpis.evaluationsToFinalize > 0,
    },
  ];

  const validate = (sheetId: string, internName: string, periodLabel: string) => {
    startTransition(async () => {
      const result = await validatePresenceSheet(sheetId, true);
      if (result.ok) {
        setValidated((prev) => [...prev, sheetId]);
        toast({ title: "Feuille validée", description: `${internName} — ${periodLabel}.` });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  const urgentCount = presences.length + journals.length + evaluations.length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Tableau de bord Tuteur</h1>
            <Badge className="rounded-lg bg-gold px-2 py-0.5 text-[10px] font-bold text-white hover:bg-gold-dark">
              Tuteur / Maître de Stage
            </Badge>
          </div>
          <p className="mt-1 text-sm text-body">
            Bonjour {tutorName} ! Voici l&apos;état de votre encadrement — {kpis.internsActifs} stagiaire(s) sous votre
            responsabilité.
          </p>
        </div>
        <Button asChild className="h-10 gap-2 rounded-xl bg-brand px-4 text-sm font-semibold hover:bg-brand-dark">
          <Link href="/entreprise/stagiaires">
            <IconUsersGroup size={17} />
            Voir mes stagiaires
          </Link>
        </Button>
      </div>

      {/* KPI personnels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card
              className={cn(
                "border-slate-200/80 rounded-xl bg-white transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
                kpi.alert && "border-gold/50 ring-1 ring-gold/30",
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      kpi.highlight ? "bg-brand text-gold" : "bg-brand-50 text-brand",
                    )}
                  >
                    <kpi.icon size={22} />
                  </span>
                  <IconArrowRight
                    size={16}
                    className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </div>
                <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">{kpi.value}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{kpi.label}</p>
                <p className={cn("mt-1 text-xs", kpi.alert ? "font-medium text-gold-dark" : "text-body")}>{kpi.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Stagiaires en cours */}
        <Card className="border-slate-200/80 rounded-xl bg-white lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <IconUsersGroup size={16} className="text-brand" />
                Progression de mes stagiaires
              </h2>
              <Link href="/entreprise/stagiaires" className="text-xs font-semibold text-brand hover:underline">
                Fiches 360° →
              </Link>
            </div>
            <div className="mt-4 space-y-3.5">
              {interns.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-body">
                  Aucun stagiaire actif ne vous est actuellement assigné.
                </p>
              ) : (
                interns.map((intern) => {
                  const pct = Math.min(100, Math.round((intern.currentWeek / intern.totalWeeks) * 100));
                  return (
                    <div key={intern.id} className="rounded-xl border border-slate-200/80 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{intern.name}</p>
                          <p className="truncate text-[11px] text-body">{intern.position}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                          Semaine {intern.currentWeek}/{intern.totalWeeks}
                        </Badge>
                      </div>
                      <Progress value={pct} className="mt-2 h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-brand" />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions urgentes */}
        <Card className={cn("rounded-xl bg-white", urgentCount > 0 ? "border-gold/50 ring-1 ring-gold/30" : "border-slate-200/80")}>
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <IconClipboardCheck size={16} className="text-gold-dark" />
                Actions urgentes
              </h2>
              <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                {urgentCount}
              </Badge>
            </div>

            <div className="mt-4 flex-1 space-y-3">
              {/* Présences — validation en un clic */}
              {presences.slice(0, 3).map((p) => (
                <div key={p.id} className="rounded-xl border border-gold/30 bg-gold/5 px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink">
                    {p.internName} — {p.periodLabel}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-body">
                      {p.daysPresent}/{p.totalDays} jours présents
                    </span>
                    <Button
                      size="sm"
                      onClick={() => validate(p.id, p.internName, p.periodLabel)}
                      disabled={pending || validated.includes(p.id)}
                      className="h-7 gap-1 rounded-lg bg-emerald-700 px-2.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                    >
                      {validated.includes(p.id) ? <IconCheck size={12} /> : <IconCheck size={12} />}
                      {validated.includes(p.id) ? "Validée" : "Valider"}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Journaux sans retour */}
              {journals.slice(0, 2).map((j) => (
                <Link
                  key={j.id}
                  href="/entreprise/suivi"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-brand-50"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <IconNotebook size={13} className="shrink-0 text-brand" />
                      Journal {j.internName}
                    </span>
                    <span className="block text-[11px] text-body">Semaine {j.week} — rédiger votre retour</span>
                  </span>
                  <IconArrowRight size={14} className="shrink-0 text-slate-300" />
                </Link>
              ))}

              {/* Évaluations à finaliser */}
              {evaluations.slice(0, 2).map((e) => (
                <Link
                  key={e.internId}
                  href="/entreprise/evaluations"
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-brand-50"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <IconReportAnalytics size={13} className="shrink-0 text-brand" />
                      Évaluer {e.internName}
                    </span>
                    <span className="block truncate text-[11px] text-body">{e.position}</span>
                  </span>
                  <IconArrowRight size={14} className="shrink-0 text-slate-300" />
                </Link>
              ))}

              {urgentCount === 0 ? (
                <div className="flex h-full min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-body">
                  Tout est à jour — aucune action urgente. Excellent travail&nbsp;!
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missions en attente de validation */}
      <Card className="border-slate-200/80 rounded-xl bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <IconClipboardList size={16} className="text-brand" />
              Missions en cours / en revue
              <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                {tasks.length}
              </Badge>
            </h2>
            <Link href="/entreprise/suivi" className="text-xs font-semibold text-brand hover:underline">
              Gérer les missions →
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="mt-3 text-xs text-body">Aucune mission active — créez-en depuis « Missions & Présences ».</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {tasks.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                    <p className="truncate text-[11px] text-body">
                      {t.internName} · semaine {t.week}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px] font-bold",
                      t.status === "IN_REVIEW"
                        ? "border-gold/40 bg-gold-50 text-gold-dark"
                        : "border-slate-300 bg-slate-100 text-slate-600",
                    )}
                  >
                    {t.status === "IN_REVIEW" ? "En revue" : "À faire"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
