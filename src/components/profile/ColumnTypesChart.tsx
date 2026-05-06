"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ColumnType } from "@/types/dataset";

type Props = {
  data: Record<ColumnType, number>;
};

export function ColumnTypesChart({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
    }));

  return (
    <div className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6 shadow-xl shadow-slate-950/5 backdrop-blur">
      <h2 className="text-xl font-black text-[var(--text)]">
        Column Type Distribution
      </h2>

      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="type"
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={{ stroke: "var(--border)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-strong)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                color: "var(--text)",
              }}
            />
            <Bar dataKey="count" fill="var(--chart-secondary)" radius={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}