import Link from "next/link";
import {
  IconArrowRight,
  IconBellRinging,
  IconBriefcase,
  IconCalendarCheck,
  IconClipboardList,
  IconSignature,
  IconPlus,
  IconTrendingUp,
  IconUsersGroup,
} from "@tabler/icons-react";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardChart, type MonthlyPoint } from "@/components/entreprise/dashboard-chart";
import { formatDateFr } from "@/lib/entreprise-format";

export const dynamic = "force-dynamic";

const MONTH_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function buildMonthlySeries(
  candidatureDates: Date[],
  internStartDates: Date[],
): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: MONTH_FR[d.getMonth()], candidatures: 0, stages: 0 });
  }
  for (const date of candidatureDates) {
    const diff =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diff >= 0 && diff <= 5) buckets[5 - diff].candidatures += 1;
  }
  for (const date of internStartDates) {
    const diff =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (diff >= 0 && diff <= 5) buckets[5 - diff].stages += 1;
  }
  return buckets;
}

export default async function EntrepriseDashboardPage() {
  const [offersPUBLIEE, candidaturesTotal, internsACTIF, conventionsEN_ATTENTE] = await Promise.all([
    db.offer.count({ where: { status: "PUBLIEE" } }),
    db.candidature.count(),
    db.intern.count({ where: { status: "ACTIF" } }),
    db.convention.count({ where: { status: "EN_ATTENTE" } }),
  ]);

  const candidatureRows = await db.candidature.findMany({ select: { createdAt: true } });
  const internRows = await db.intern.findMany({
    select: { id: true, name: true, position: true, startDate: true, endDate: true, status: true, university: true },
  });

  const now = new Date();
  const series = buildMonthlySeries(candidatureRows.map((r) => r.createdAt), internRows.map((i) => i.startDate));

  const thisMonth = series[5].candidatures;
  const lastMonth = series[4].candidatures;
  const delta =
    lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  const presencesToValidate = await db.presenceSheet.findMany({
    where: { status: "A_VALIDER" },
    include: { intern: { select: { name: true, position: true } } },
    orderBy: { submittedAt: "asc" },
  });

  const endingSoon = internRows
    .filter((i) => i.status === "ACTIF" && i.endDate.getTime() - now.getTime() < 14 * 86400000 && i.endDate.getTime() > now.getTime())
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

  const kpis = [
    {
      label: "Offres actives",
      value: offersPUBLIEE,
      icon: IconBriefcase,
      href: "/entreprise/offres",
      note: "Offres publiées sur la plateforme",
    },
    {
      label: "Candidatures reçues",
      value: candidaturesTotal,
      icon: IconClipboardList,
      href: "/entreprise/candidatures",
      note: delta >= 0 ? `+${delta} % vs mois dernier` : `${delta} % vs mois dernier`,
      highlight: true,
    },
    {
      label: "Stagiaires en poste",
      value: internsACTIF,
      icon: IconUsersGroup,
      href: "/entreprise/stagiaires",
      note: `${endingSoon.length} fin(s) de stage proche(s)`,
    },
    {
      label: "Conventions en attente",
      value: conventionsEN_ATTENTE,
      icon: IconSignature,
      href: "/entreprise/documents",
      note: "Signatures tripartites en cours",
      alert: conventionsEN_ATTENTE > 0,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Tableau de bord</h1>
          <p className="mt-1 text-sm text-body">
            Bonjour Marcelle ! Voici l&apos;activité de recrutement et de suivi de vos stagiaires.
          </p>
        </div>
        <Button asChild className="h-10 gap-2 rounded-xl bg-brand px-4 text-sm font-semibold hover:bg-brand-dark">
          <Link href="/entreprise/offres?create=1">
            <IconPlus size={17} />
            Publier une offre de stage
          </Link>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group">
            <Card
              className={`border-slate-200/80 rounded-xl bg-white transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md ${
                kpi.alert ? "border-gold/50 ring-1 ring-gold/30" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      kpi.highlight ? "bg-brand text-gold" : "bg-brand-50 text-brand"
                    }`}
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
                <p className={`mt-1 text-xs ${kpi.alert ? "font-medium text-gold-dark" : "text-body"}`}>{kpi.note}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Chart + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200/80 rounded-xl bg-white lg:col-span-2">
          <CardContent className="p-5">
            <DashboardChart data={series} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200/80 rounded-xl bg-white">
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <IconTrendingUp size={16} className="text-gold" />
                Actions rapides
              </h2>
              <div className="mt-3 space-y-2">
                {[
                  { href: "/entreprise/offres?create=1", label: "Publier une offre de stage", icon: IconPlus },
                  { href: "/entreprise/candidatures", label: "Traiter les nouvelles candidatures", icon: IconClipboardList },
                  { href: "/entreprise/suivi", label: "Valider les feuilles de présence", icon: IconCalendarCheck },
                  { href: "/entreprise/evaluations", label: "Évaluer un stagiaire", icon: IconUsersGroup },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand/40 hover:bg-brand-50"
                  >
                    <span className="flex items-center gap-2">
                      <action.icon size={15} className="text-brand" />
                      {action.label}
                    </span>
                    <IconArrowRight size={14} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`rounded-xl bg-white ${endingSoon.length > 0 ? "border-gold/50 ring-1 ring-gold/30" : "border-slate-200/80"}`}>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <IconBellRinging size={16} className="text-gold-dark" />
                Fins de stage proches
                <Badge variant="outline" className="ml-auto border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                  {endingSoon.length}
                </Badge>
              </h2>
              <div className="mt-3 space-y-2.5">
                {endingSoon.length === 0 ? (
                  <p className="text-xs text-body">Aucune fin de stage dans les 14 prochains jours.</p>
                ) : (
                  endingSoon.slice(0, 4).map((intern) => (
                    <div key={intern.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{intern.name}</p>
                        <p className="truncate text-[11px] text-body">{intern.position}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                        fin le {formatDateFr(intern.endDate)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Presences to validate */}
      <Card className="border-slate-200/80 rounded-xl bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <IconCalendarCheck size={16} className="text-brand" />
              Feuilles de présence à valider
              <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                {presencesToValidate.length}
              </Badge>
            </h2>
            <Link href="/entreprise/suivi" className="text-xs font-semibold text-brand hover:underline">
              Ouvrir le module →
            </Link>
          </div>
          {presencesToValidate.length === 0 ? (
            <p className="mt-3 text-xs text-body">Tout est à jour : aucune feuille en attente de validation.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {presencesToValidate.slice(0, 6).map((sheet) => (
                <div key={sheet.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{sheet.intern.name}</p>
                    <p className="truncate text-[11px] text-body">{sheet.periodLabel}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                    {sheet.daysPresent}/{sheet.totalDays} j
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
