/**
 * Vue 1 — Tableau de bord établissement : 4 KPI, graphique placés/en recherche,
 * file d'actions prioritaires (visas Chef ou signatures Direction).
 */
import Link from "next/link";
import {
  IconArrowRight,
  IconClipboardCheck,
  IconSchool,
  IconSparkles,
  IconTrendingUp,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEtablissementContext, getDashboardData } from "@/lib/etablissement-data";
import { PlacementChart } from "@/components/etablissement/placement-chart";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

const KPIS = [
  { key: "students", label: "Étudiants inscrits", icon: IconSchool, hint: "rattachés à l'établissement" },
  { key: "placement", label: "Taux de placement", icon: IconTrendingUp, hint: "en stage actuellement" },
  { key: "pending", label: "Conventions en attente", icon: IconClipboardCheck, hint: "visa ou signature finale" },
  { key: "active", label: "Stages actifs", icon: IconUsersGroup, hint: "en cours cette semaine" },
] as const;

export default async function EtablissementDashboardPage() {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;
  const { kpis, chartRows, actions } = await getDashboardData(ctx);

  const values: Record<string, string> = {
    students: String(kpis.students),
    placement: `${kpis.placementRate} %`,
    pending: String(kpis.pendingConventions),
    active: String(kpis.activeInterns),
  };

  const scopeLabel = ctx.isChef
    ? `Département ${ctx.departmentName}`
    : "Toute l'université";

  return (
    <div className="mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Tableau de bord</h1>
          <p className="text-sm text-body">
            {ctx.universityAcronym} — {scopeLabel} · connecté en tant que {ctx.memberTitle ?? ctx.memberName}
          </p>
        </div>
        <Badge variant="outline" className="border-brand/20 bg-brand-50 text-[11px] text-brand">
          {ctx.isChef ? "Vue Chef de Département" : "Vue Direction des Stages"}
        </Badge>
      </div>

      {/* --------------------------- KPI --------------------------- */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.key} className="border-slate-200/80 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                  <kpi.icon size={18} className="text-brand" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{values[kpi.key]}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink">{kpi.label}</p>
              <p className="text-[11px] text-body">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --------------------- Graphique + actions --------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="border-slate-200/80 shadow-sm xl:col-span-3">
          <CardContent className="p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-bold text-ink">
                {ctx.isChef ? "Placement par niveau d'études" : "Placement par département"}
              </h2>
              <p className="text-xs text-body">Étudiants placés en stage vs en recherche de stage.</p>
            </div>
            <div className="mt-3">
              <PlacementChart rows={chartRows} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm xl:col-span-2">
          <CardContent className="flex h-full flex-col p-4 sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <IconSparkles size={16} className="text-gold" />
                File d&apos;actions prioritaires
              </h2>
              <p className="text-xs text-body">
                {ctx.isChef
                  ? "Conventions signées (étudiant + entreprise) qui attendent votre visa pédagogique."
                  : "Conventions visées par le département qui attendent la signature officielle."}
              </p>
            </div>
            <div className="mt-4 flex-1 space-y-2">
              {actions.length === 0 ? (
                <div className="flex h-full min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-body">
                  Aucune action en attente — le circuit de validation est à jour.
                </div>
              ) : (
                actions.map((action) => (
                  <Link
                    key={action.conventionId}
                    href="/etablissement/conventions"
                    className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-gold/40 hover:bg-gold-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                      <IconClipboardCheck size={15} className="text-gold-dark" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">{action.label}</span>
                      <span className="block truncate text-[11px] text-body">
                        {action.reference} · {action.position} · {action.departmentCode ?? "—"}
                      </span>
                    </span>
                    <IconArrowRight size={14} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
                  </Link>
                ))
              )}
            </div>
            <Button asChild variant="outline" className="mt-4 h-9 w-full gap-1.5 rounded-xl border-brand/25 text-xs font-semibold text-brand hover:bg-brand-50">
              <Link href="/etablissement/conventions">
                Ouvrir Conventions &amp; Visas
                <IconArrowRight size={14} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
