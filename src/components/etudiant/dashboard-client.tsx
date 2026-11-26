"use client";

/**
 * Vue client du Tableau de bord étudiant : 4 cartes KPI, AreaChart
 * Recharts (candidatures envoyées vs réponses — vert sapin & or),
 * alertes & actions rapides.
 */
import Link from "next/link";
import type { ComponentType } from "react";
import {
  IconBriefcase,
  IconCalendarCheck,
  IconClipboardList,
  IconClock,
  IconExternalLink,
  IconFlag,
  IconMapPin,
  IconSearch,
  IconSend,
  IconSparkles,
  IconTarget,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatDateTimeFr } from "@/lib/entreprise-format";
import type { StudentAlert } from "@/lib/etudiant-data";
import { cn } from "@/lib/utils";

export interface ChartPoint {
  week: string;
  envoyees: number;
  reponses: number;
}

export interface DashboardData {
  kpis: {
    candidaturesEnvoyees: number;
    envoyeesCetteSemaine: number;
    entretiens: number;
    prochainEntretienISO: string | null;
    currentWeek: number;
    totalWeeks: number;
    hasIntern: boolean;
    internPosition: string | null;
    internCompany: string | null;
    tachesEnAttente: number;
  };
  chart: ChartPoint[];
  alerts: StudentAlert[];
  recentOffers: Array<{
    id: string;
    title: string;
    company: string;
    city: string;
    duration: string;
    workMode: string;
  }>;
}

const chartConfig = {
  envoyees: { label: "Candidatures envoyées", color: "#0B393C" },
  reponses: { label: "Réponses reçues", color: "#B8A02E" },
} satisfies ChartConfig;

const WORK_MODE_LABELS: Record<string, string> = {
  SUR_SITE: "Sur site",
  HYBRIDE: "Hybride",
  TELETRAVAIL: "Télétravail",
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ComponentIcon;
  tone: "brand" | "gold" | "slate";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand",
    gold: "bg-gold-50 text-gold-dark",
    slate: "bg-slate-100 text-slate-600",
  } as const;
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold leading-tight text-ink">{value}</p>
          <p className="mt-0.5 truncate text-xs text-body">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type ComponentIcon = ComponentType<{ size?: number | string; className?: string }>;

export function DashboardClient({ data }: { data: DashboardData }) {
  const { kpis, chart, alerts, recentOffers } = data;
  const progression = kpis.hasIntern && kpis.totalWeeks > 0 ? Math.round((kpis.currentWeek / kpis.totalWeeks) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Tableau de bord</h1>
          <p className="text-sm text-body">Vue d&apos;ensemble de votre recherche et de votre stage.</p>
        </div>
        <Button asChild className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark">
          <Link href="/etudiant/offres">
            <IconSearch size={15} />
            Explorer les offres
          </Link>
        </Button>
      </div>

      {/* ------------------------------ KPI ------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Candidatures envoyées"
          value={String(kpis.candidaturesEnvoyees)}
          sub={kpis.envoyeesCetteSemaine > 0 ? `+${kpis.envoyeesCetteSemaine} cette semaine` : "Rien cette semaine"}
          icon={IconSend}
          tone="brand"
        />
        <KpiCard
          label="Entretiens décrochés"
          value={String(kpis.entretiens)}
          sub={
            kpis.prochainEntretienISO
              ? `Prochain : ${formatDateTimeFr(kpis.prochainEntretienISO)}`
              : "Aucun entretien planifié"
          }
          icon={IconCalendarCheck}
          tone="gold"
        />
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <IconTarget size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                Avancement du stage actif
              </p>
              <p className="mt-0.5 text-2xl font-bold leading-tight text-ink">
                {kpis.hasIntern ? `Semaine ${kpis.currentWeek} / ${kpis.totalWeeks}` : "—"}
              </p>
              {kpis.hasIntern ? (
                <>
                  <Progress value={progression} className="mt-2 h-2" aria-label={`Avancement ${progression}%`} />
                  <p className="mt-1.5 truncate text-xs text-body">
                    {kpis.internPosition} · {kpis.internCompany} ({progression} %)
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-body">Pas encore de stage actif</p>
              )}
            </div>
          </CardContent>
        </Card>
        <KpiCard
          label="Tâches en attente"
          value={String(kpis.tachesEnAttente)}
          sub={kpis.hasIntern ? "Missions à avancer cette semaine" : "Sera actif avec un stage"}
          icon={IconClipboardList}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* --------------------------- Graphique --------------------------- */}
        <Card className="border-slate-200/80 shadow-sm lg:col-span-3">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink sm:text-base">Évolution de vos candidatures</h2>
                <p className="text-xs text-body">Envois et réponses sur les 8 dernières semaines</p>
              </div>
              <Badge variant="outline" className="shrink-0 border-brand/20 bg-brand-50 text-[11px] text-brand">
                Temps réel
              </Badge>
            </div>
            <ChartContainer config={chartConfig} className="h-[260px] w-full sm:h-[300px]">
              <AreaChart data={chart} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillEnvoyees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B393C" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#0B393C" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="fillReponses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B8A02E" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#B8A02E" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="envoyees"
                  stroke="#0B393C"
                  strokeWidth={2}
                  fill="url(#fillEnvoyees)"
                />
                <Area
                  type="monotone"
                  dataKey="reponses"
                  stroke="#B8A02E"
                  strokeWidth={2}
                  fill="url(#fillReponses)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ------------------------ Alertes & rappels ------------------------ */}
        <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-sm font-bold text-ink sm:text-base">Alertes &amp; rappels</h2>
            <p className="text-xs text-body">Actions requises pour rester dans les temps</p>
            <div className="mt-4 space-y-2.5">
              {alerts.length === 0 ? (
                <p className="rounded-xl border border-brand/15 bg-brand-50 p-3 text-sm text-brand">
                  Tout est à jour — continuez à explorer les offres !
                </p>
              ) : (
                alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3 transition-colors hover:shadow-sm",
                      alert.severity === "urgent"
                        ? "border-red-200 bg-red-50 hover:bg-red-100/60"
                        : "border-gold/30 bg-gold-50 hover:bg-gold-100/60",
                    )}
                  >
                    <IconClock
                      size={16}
                      className={cn("mt-0.5 shrink-0", alert.severity === "urgent" ? "text-red-500" : "text-gold-dark")}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{alert.label}</span>
                      <span className="block text-xs leading-snug text-body">{alert.description}</span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------- Actions rapides ----------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink sm:text-base">Offres récentes pour vous</h2>
              <Link href="/etudiant/offres" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                Tout voir <IconExternalLink size={13} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {recentOffers.length === 0 ? (
                <p className="text-sm text-body">Aucune offre publiée pour le moment.</p>
              ) : (
                recentOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{offer.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
                        <span className="flex items-center gap-1">
                          <IconBriefcase size={13} /> {offer.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconMapPin size={13} /> {offer.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconFlag size={13} /> {offer.duration}
                        </span>
                        <span>{WORK_MODE_LABELS[offer.workMode] ?? offer.workMode}</span>
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 rounded-lg border-brand/25 text-xs text-brand hover:bg-brand-50"
                    >
                      <Link href={`/etudiant/offres?offre=${offer.id}`}>Voir l&apos;offre</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-brand shadow-sm">
          <CardContent className="flex h-full flex-col justify-between p-5 sm:p-6">
            <div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <IconSparkles size={20} className="text-gold" />
              </span>
              <h2 className="mt-3 text-base font-bold text-white">Studio Carrière IA</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Optimisez votre CV, générez votre lettre de motivation et simulez votre entretien avec le Coach Groq.
              </p>
            </div>
            <Button asChild className="mt-4 h-9 w-fit gap-1.5 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark hover:text-brand">
              <Link href="/etudiant/studio-ia">Ouvrir le Studio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
