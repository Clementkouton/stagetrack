"use client";

/**
 * Graphique Recharts — évolution des candidatures reçues et stages validés (6 derniers mois).
 */
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { IconChartAreaLine, IconChartBar } from "@tabler/icons-react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

export interface MonthlyPoint {
  label: string;
  candidatures: number;
  stages: number;
}

const chartConfig = {
  candidatures: { label: "Candidatures reçues", color: "#0B393C" },
  stages: { label: "Stages validés", color: "#B8A02E" },
} satisfies ChartConfig;

export function DashboardChart({ data }: { data: MonthlyPoint[] }) {
  const [variant, setVariant] = useState<"area" | "bar">("area");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Évolution des candidatures &amp; stages</h2>
          <p className="text-xs text-body">6 derniers mois — candidatures reçues et stages démarrés</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1">
          <Button
            size="sm"
            variant={variant === "area" ? "secondary" : "ghost"}
            onClick={() => setVariant("area")}
            className={`h-7 gap-1 px-2 text-xs ${variant === "area" ? "bg-brand-50 text-brand hover:bg-brand-50" : "text-body hover:text-ink"}`}
            aria-label="Vue en aires"
          >
            <IconChartAreaLine size={14} />
            Aires
          </Button>
          <Button
            size="sm"
            variant={variant === "bar" ? "secondary" : "ghost"}
            onClick={() => setVariant("bar")}
            className={`h-7 gap-1 px-2 text-xs ${variant === "bar" ? "bg-brand-50 text-brand hover:bg-brand-50" : "text-body hover:text-ink"}`}
            aria-label="Vue en barres"
          >
            <IconChartBar size={14} />
            Barres
          </Button>
        </div>
      </div>

      <ChartContainer id="dashboard-evolution" config={chartConfig} className="h-[280px] w-full">
        {variant === "area" ? (
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="candidatures"
              type="monotone"
              fill="#0B393C"
              fillOpacity={0.18}
              stroke="#0B393C"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="stages"
              type="monotone"
              fill="#B8A02E"
              fillOpacity={0.3}
              stroke="#B8A02E"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="candidatures" fill="#0B393C" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="stages" fill="#B8A02E" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}
