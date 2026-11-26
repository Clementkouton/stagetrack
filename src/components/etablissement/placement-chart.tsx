"use client";

/**
 * Graphique du dashboard établissement : répartition Placés vs En recherche.
 * Vue Admin : par département (GEI, GC, GMP, GL…). Vue Chef : par niveau (L1 → M2).
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlacementRow } from "@/lib/etablissement-data";

export function PlacementChart({ rows }: { rows: PlacementRow[] }) {
  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(11, 57, 60, 0.06)" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="placed" name="Placés en stage" fill="#0B393C" radius={[6, 6, 0, 0]} maxBarSize={42} />
          <Bar dataKey="searching" name="En recherche" fill="#B8A02E" radius={[6, 6, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
