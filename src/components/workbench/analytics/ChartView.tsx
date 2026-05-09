"use client";

import { useMemo, useRef } from "react";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { Download, Info } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import type { DatasetRow } from "@/types/dataset";
import type {
  Aggregation,
  ChartConfig,
} from "@/components/workbench/analytics/ChartBuilder";

type Props = {
  rows: DatasetRow[];
  config: ChartConfig;
  numericColumns: string[];
  groupableColumns: string[];
};

type ChartDatum = {
  name: string;
  value: number;
  x?: number;
  y?: number;
};

const COLORS = [
  "#0f766e",
  "#2563eb",
  "#c2410c",
  "#65a30d",
  "#be185d",
  "#0891b2",
  "#7c3aed",
  "#ca8a04",
];

function parseNumber(value: unknown): number | null {
  const normalized = String(value ?? "")
    .trim()
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) return 0;

  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }

  return sorted[middle] ?? 0;
}

function aggregate(values: number[], aggregation: Aggregation) {
  if (aggregation === "count") return values.length;
  if (values.length === 0) return 0;

  if (aggregation === "sum") {
    return values.reduce((sum, value) => sum + value, 0);
  }

  if (aggregation === "average") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  if (aggregation === "min") return Math.min(...values);
  if (aggregation === "max") return Math.max(...values);
  if (aggregation === "median") return median(values);

  return values.length;
}

function buildGroupedData(rows: DatasetRow[], config: ChartConfig): ChartDatum[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupName = String(row[config.xColumn] ?? "").trim() || "Missing";
    const values = groups.get(groupName) ?? [];

    if (config.aggregation === "count") {
      values.push(1);
    } else {
      const numberValue = parseNumber(row[config.yColumn]);

      if (numberValue !== null) {
        values.push(numberValue);
      }
    }

    groups.set(groupName, values);
  }

  return [...groups.entries()]
    .map(([name, values]) => ({
      name,
      value: aggregate(values, config.aggregation),
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(3, config.topN));
}

function buildScatterData(
  rows: DatasetRow[],
  config: ChartConfig,
): ChartDatum[] {
  return rows
    .map((row): ChartDatum | null => {
      const x = parseNumber(row[config.xColumn]);
      const y = parseNumber(row[config.yColumn]);

      if (x === null || y === null) return null;

      return {
        name: `${x}, ${y}`,
        value: y,
        x,
        y,
      };
    })
    .filter((item): item is ChartDatum => item !== null);
}

function buildHistogramData(
  rows: DatasetRow[],
  config: ChartConfig,
): ChartDatum[] {
  const values = rows
    .map((row) => parseNumber(row[config.yColumn]))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (values.length === 0) return [];

  const min = values[0] ?? 0;
  const max = values[values.length - 1] ?? 0;
  const binCount = 10;
  const binSize = max === min ? 1 : (max - min) / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = min + index * binSize;
    const end = start + binSize;

    return {
      name: `${start.toFixed(0)}–${end.toFixed(0)}`,
      value: 0,
    };
  });

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / binSize);
    const index = Math.min(Math.max(rawIndex, 0), binCount - 1);

    bins[index]!.value += 1;
  }

  return bins;
}

function getCompatibilityMessage({
  config,
  numericColumns,
  groupableColumns,
}: {
  config: ChartConfig;
  numericColumns: string[];
  groupableColumns: string[];
}) {
  if (config.chartType === "scatter") {
    if (!numericColumns.includes(config.xColumn)) {
      return "Select a numeric X column for the scatter chart.";
    }

    if (!numericColumns.includes(config.yColumn)) {
      return "Select a numeric Y column for the scatter chart.";
    }
  }

  if (config.chartType === "histogram") {
    if (!numericColumns.includes(config.yColumn)) {
      return "Select a numeric column for the histogram.";
    }
  }

  if (["bar", "line", "area", "pie"].includes(config.chartType)) {
    if (!groupableColumns.includes(config.xColumn)) {
      return "Select a groupable column.";
    }

    if (
      config.aggregation !== "count" &&
      !numericColumns.includes(config.yColumn)
    ) {
      return "This aggregation requires a numeric Y column.";
    }
  }

  return "";
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function ChartView({
  rows,
  config,
  numericColumns,
  groupableColumns,
}: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const compatibilityMessage = getCompatibilityMessage({
    config,
    numericColumns,
    groupableColumns,
  });

  const chartData = useMemo(() => {
    if (compatibilityMessage) return [];

    if (config.chartType === "scatter") {
      return buildScatterData(rows, config);
    }

    if (config.chartType === "histogram") {
      return buildHistogramData(rows, config);
    }

    return buildGroupedData(rows, config);
  }, [rows, config, compatibilityMessage]);

  async function downloadPng() {
    if (!chartRef.current || chartData.length === 0) return;

    const dataUrl = await htmlToImage.toPng(chartRef.current, {
      pixelRatio: 2,
      backgroundColor: "white",
    });

    const link = document.createElement("a");
    link.download = `${config.title || "cleanframe-chart"}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function downloadPdf() {
    if (!chartRef.current || chartData.length === 0) return;

    const dataUrl = await htmlToImage.toPng(chartRef.current, {
      pixelRatio: 2,
      backgroundColor: "white",
    });

    const pdf = new jsPDF("landscape", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(dataUrl, "PNG", 32, 32, pageWidth - 64, pageHeight - 64);
    pdf.save(`${config.title || "cleanframe-chart"}.pdf`);
  }

  function renderChart() {
    if (compatibilityMessage) {
      return (
        <ChartEmptyState
          title="Chart cannot be rendered"
          description={compatibilityMessage}
        />
      );
    }

    if (chartData.length === 0) {
      return (
        <ChartEmptyState
          title="No chart data"
          description="Try a different chart type, column, or aggregation."
        />
      );
    }

    if (config.chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              label
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0f766e"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatNumber(Number(value))} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0f766e"
              fill="#0f766e"
              fillOpacity={0.18}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === "scatter") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="y" type="number" tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Scatter data={chartData} fill="#0f766e" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {config.title || "Chart"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {config.chartType} · {chartData.length.toLocaleString()} plotted
            items
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-xl px-3 text-xs"
            disabled={chartData.length === 0}
            onClick={downloadPng}
          >
            <Download className="mr-1.5 size-3.5" />
            PNG
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-xl px-3 text-xs"
            disabled={chartData.length === 0}
            onClick={downloadPdf}
          >
            <Download className="mr-1.5 size-3.5" />
            PDF
          </Button>
        </div>
      </div>

      <div
        ref={chartRef}
        className="min-h-[430px] flex-1 rounded-2xl border border-border bg-background p-4"
      >
        {renderChart()}
      </div>
    </div>
  );
}

function ChartEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/[0.12]">
      <div className="max-w-md text-center">
        <Info className="mx-auto size-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}