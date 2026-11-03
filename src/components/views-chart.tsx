"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyMetric } from "@/lib/reporting/types";
const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const full = new Intl.NumberFormat("fr-FR");
const month = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });

export function ViewsChart({ data, label }: { data: MonthlyMetric[]; label: string }) {
  const values = data.map((item) => ({
    ...item,
    label: `${month.format(new Date(`${item.month}-01T00:00:00Z`)).replace(".", "")}${item.status === "partial" ? " …" : ""}`,
  }));
  return (
    <div className="h-[310px] w-full sm:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={values} margin={{ top: 12, right: 12, left: -14 }}>
          <CartesianGrid vertical={false} stroke="#e5e9ef" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            interval={0}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(v) => compact.format(v)}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value) => [
              typeof value === "number" ? full.format(value) : "Indisponible",
            label,
            ]}
          labelFormatter={(monthLabel, payload) => {
            const status = payload?.[0]?.payload?.status;
            const suffix = status === "partial" ? " · mois en cours" : "";
            return `${monthLabel}${suffix}`;
          }}
            contentStyle={{ border: "1px solid #dfe3e8", borderRadius: 6 }}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="#45a7ee"
            strokeWidth={3}
            dot={{ r: 4, fill: "#45a7ee", stroke: "white", strokeWidth: 2 }}
            activeDot={{
              r: 5,
              fill: "#208ddc",
              stroke: "white",
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
