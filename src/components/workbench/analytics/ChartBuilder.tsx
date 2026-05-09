"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Columns3,
  Copy,
  Gauge,
  Info,
  Rows3,
  Sigma,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  CheckSelect,
  type CheckSelectOption,
} from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import { ChartView } from "@/components/workbench/analytics/ChartView";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ColumnType } from "@/types/dataset";
import type { DatasetProfile } from "@/types/profile";

export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "scatter"
  | "pie"
  | "histogram";

export type Aggregation = "count" | "sum" | "average" | "min" | "max" | "median";

export type ChartConfig = {
  chartType: ChartType;
  xColumn: string;
  yColumn: string;
  aggregation: Aggregation;
  topN: number;
  title: string;
};

const CHART_TYPES: ChartType[] = [
  "bar",
  "line",
  "area",
  "scatter",
  "pie",
  "histogram",
];

const AGGREGATIONS: Aggregation[] = [
  "count",
  "sum",
  "average",
  "min",
  "max",
  "median",
];

const CHART_TYPE_OPTIONS: CheckSelectOption<ChartType>[] = CHART_TYPES.map(
  (type) => ({
    value: type,
    label: formatChartTypeLabel(type),
  }),
);

const AGGREGATION_OPTIONS: CheckSelectOption<Aggregation>[] = AGGREGATIONS.map(
  (aggregation) => ({
    value: aggregation,
    label: formatAggregationLabel(aggregation),
  }),
);

const NUMERIC_CHART_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "currency",
  "percentage",
  "latitude",
  "longitude",
];

const GROUPABLE_CHART_TYPES: ColumnType[] = [
  "category",
  "text",
  "boolean",
  "date",
  "datetime",
  "time",
  "id",
  "uuid",
  "email",
  "phone",
  "url",
  "postal_code",
  "country_code",
  "json",
];

function first(values: string[]) {
  return values[0] ?? "";
}

function isGroupedChart(chartType: ChartType) {
  return ["bar", "line", "area", "pie"].includes(chartType);
}

function chartNeedsNumericY(config: ChartConfig) {
  if (config.chartType === "scatter") return true;
  if (config.chartType === "histogram") return true;

  return isGroupedChart(config.chartType) && config.aggregation !== "count";
}

function formatChartTypeLabel(type: ChartType): string {
  const labels: Record<ChartType, string> = {
    bar: "Bar",
    line: "Line",
    area: "Area",
    scatter: "Scatter",
    pie: "Pie",
    histogram: "Histogram",
  };

  return labels[type];
}

function formatAggregationLabel(aggregation: Aggregation): string {
  const labels: Record<Aggregation, string> = {
    count: "Count",
    sum: "Sum",
    average: "Average",
    min: "Minimum",
    max: "Maximum",
    median: "Median",
  };

  return labels[aggregation];
}

function getDefaultTitle(chartType: ChartType, aggregation: Aggregation) {
  if (chartType === "histogram") return "Distribution";
  if (chartType === "scatter") return "Scatter Plot";
  if (aggregation === "count") return "Count by Category";

  return `${formatAggregationLabel(aggregation)} by Category`;
}

function getChartDescription(config: ChartConfig) {
  if (config.chartType === "histogram") {
    return "Show the distribution of one numeric column.";
  }

  if (config.chartType === "scatter") {
    return "Compare two numeric columns as points.";
  }

  if (config.aggregation === "count") {
    return "Count rows grouped by a selected column.";
  }

  return "Aggregate a numeric column by a selected group column.";
}

function toOptions(values: string[]): CheckSelectOption<string>[] {
  return values.map((value) => ({
    value,
    label: value,
  }));
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Review";
  return "Risk";
}

function getQualityBadgeVariant(score: number) {
  return score >= 75 ? "secondary" : "destructive";
}

function MetricChip({
  icon: Icon,
  label,
  value,
  intent = "default",
}: {
  icon: ElementType;
  label: string;
  value: string;
  intent?: "default" | "warning" | "danger";
}) {
  const valueClassName =
    intent === "danger"
      ? "text-rose-700 dark:text-rose-300"
      : intent === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";

  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 shadow-sm">
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function HeaderMetrics({
  profile,
  numericColumnCount,
  columnsWithMissingCount,
}: {
  profile: DatasetProfile;
  numericColumnCount: number;
  columnsWithMissingCount: number;
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      <MetricChip
        icon={Rows3}
        label="Rows"
        value={formatCount(profile.rowCount)}
      />
      <MetricChip
        icon={Columns3}
        label="Columns"
        value={formatCount(profile.columnCount)}
      />
      <MetricChip
        icon={Sigma}
        label="Numeric"
        value={formatCount(numericColumnCount)}
      />
      <MetricChip
        icon={TriangleAlert}
        label="With missing"
        value={formatCount(columnsWithMissingCount)}
        intent={columnsWithMissingCount > 0 ? "warning" : "default"}
      />
      <MetricChip
        icon={Copy}
        label="Duplicates"
        value={formatCount(profile.duplicateRowCount)}
        intent={profile.duplicateRowCount > 0 ? "warning" : "default"}
      />
      <MetricChip
        icon={AlertTriangle}
        label="Warnings"
        value={formatCount(profile.parseErrors.length)}
        intent={profile.parseErrors.length > 0 ? "danger" : "default"}
      />

      <div className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 shadow-sm">
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
          <Gauge className="size-3.5" />
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Quality
        </span>
        <span className="text-sm font-bold text-foreground">
          {profile.qualityScore}/100
        </span>
        <Badge variant={getQualityBadgeVariant(profile.qualityScore)}>
          {getQualityLabel(profile.qualityScore)}
        </Badge>
      </div>
    </div>
  );
}

function ToolChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <span className="inline-flex h-8 items-center rounded-2xl border border-border/70 bg-background px-3 text-xs text-muted-foreground shadow-sm">
      {label}:{" "}
      <span className="ml-1 font-semibold text-foreground">{value}</span>
    </span>
  );
}

export function ChartBuilder() {
  const workspace = useWorkspaceStore((state) => state.workspace);

  const fields = workspace?.fields ?? [];
  const columns = workspace?.profile.columns ?? [];
  const rows = workspace?.workingRows ?? [];

  const numericColumns = useMemo(() => {
    return columns
      .filter((column) => NUMERIC_CHART_TYPES.includes(column.type))
      .map((column) => column.name);
  }, [columns]);

  const groupableColumns = useMemo(() => {
    return columns
      .filter((column) => GROUPABLE_CHART_TYPES.includes(column.type))
      .map((column) => column.name);
  }, [columns]);

  const safeGroupableColumns = groupableColumns.length > 0 ? groupableColumns : fields;

  const [config, setConfig] = useState<ChartConfig>({
    chartType: "bar",
    xColumn: first(safeGroupableColumns),
    yColumn: first(numericColumns),
    aggregation: "count",
    topN: 10,
    title: "Count by Category",
  });

  useEffect(() => {
    setConfig((current) => {
      let nextXColumn = current.xColumn;
      let nextYColumn = current.yColumn;

      if (current.chartType === "scatter") {
        if (!numericColumns.includes(nextXColumn)) {
          nextXColumn = first(numericColumns);
        }

        if (!numericColumns.includes(nextYColumn)) {
          nextYColumn = first(numericColumns);
        }
      }

      if (current.chartType === "histogram") {
        if (!numericColumns.includes(nextYColumn)) {
          nextYColumn = first(numericColumns);
        }
      }

      if (isGroupedChart(current.chartType)) {
        if (!safeGroupableColumns.includes(nextXColumn)) {
          nextXColumn = first(safeGroupableColumns);
        }

        if (
          current.aggregation !== "count" &&
          !numericColumns.includes(nextYColumn)
        ) {
          nextYColumn = first(numericColumns);
        }
      }

      return {
        ...current,
        xColumn: nextXColumn,
        yColumn: nextYColumn,
      };
    });
  }, [fields, numericColumns, safeGroupableColumns]);

  function updateConfig<K extends keyof ChartConfig>(
    key: K,
    value: ChartConfig[K],
  ) {
    setConfig((current) => {
      const nextConfig = {
        ...current,
        [key]: value,
      };

      if (key === "chartType") {
        const chartType = value as ChartType;

        if (chartType === "scatter") {
          return {
            ...nextConfig,
            xColumn: numericColumns.includes(current.xColumn)
              ? current.xColumn
              : first(numericColumns),
            yColumn: numericColumns.includes(current.yColumn)
              ? current.yColumn
              : first(numericColumns),
            title: getDefaultTitle(chartType, current.aggregation),
          };
        }

        if (chartType === "histogram") {
          return {
            ...nextConfig,
            yColumn: numericColumns.includes(current.yColumn)
              ? current.yColumn
              : first(numericColumns),
            title: getDefaultTitle(chartType, current.aggregation),
          };
        }

        return {
          ...nextConfig,
          xColumn: safeGroupableColumns.includes(current.xColumn)
            ? current.xColumn
            : first(safeGroupableColumns),
          yColumn: numericColumns.includes(current.yColumn)
            ? current.yColumn
            : first(numericColumns),
          title: getDefaultTitle(chartType, current.aggregation),
        };
      }

      if (key === "aggregation") {
        const aggregation = value as Aggregation;

        return {
          ...nextConfig,
          yColumn:
            aggregation === "count"
              ? current.yColumn
              : numericColumns.includes(current.yColumn)
                ? current.yColumn
                : first(numericColumns),
          title: getDefaultTitle(current.chartType, aggregation),
        };
      }

      return nextConfig;
    });
  }

  const xColumnOptions = useMemo(() => {
    if (config.chartType === "scatter") return numericColumns;
    if (config.chartType === "histogram") return [];

    return safeGroupableColumns;
  }, [config.chartType, numericColumns, safeGroupableColumns]);

  const yColumnOptions = useMemo(() => {
    if (chartNeedsNumericY(config)) return numericColumns;

    return fields;
  }, [config, fields, numericColumns]);

  const needsNumericY = chartNeedsNumericY(config);
  const groupedCountChart =
    isGroupedChart(config.chartType) && config.aggregation === "count";

  const compatibilityMessage = useMemo(() => {
    if (!workspace) return "";

    if (config.chartType === "scatter" && numericColumns.length < 2) {
      return "Scatter charts need at least two numeric columns.";
    }

    if (config.chartType === "histogram" && numericColumns.length === 0) {
      return "Histogram charts need one numeric column.";
    }

    if (needsNumericY && numericColumns.length === 0) {
      return "This aggregation requires a numeric Y column.";
    }

    return "";
  }, [workspace, config.chartType, numericColumns.length, needsNumericY]);

  const columnsWithMissingCount = useMemo(
    () => columns.filter((column) => column.missingCount > 0).length,
    [columns],
  );

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-sm">
      <div className="shrink-0 border-b border-border/70 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground">
              <BarChart3 className="size-5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
                Charts
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Build exportable visuals from schema-aware columns.
              </p>
            </div>
          </div>

          <HeaderMetrics
            profile={workspace.profile}
            numericColumnCount={numericColumns.length}
            columnsWithMissingCount={columnsWithMissingCount}
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-border/70 bg-muted/[0.18] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolChip label="Chart type" value={formatChartTypeLabel(config.chartType)} />
          <ToolChip label="Rows" value={workspace.workingRows.length.toLocaleString()} />
          <ToolChip label="Numeric columns" value={numericColumns.length} />
          <ToolChip label="Groupable columns" value={safeGroupableColumns.length} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-muted/[0.08] p-4 xl:border-b-0 xl:border-r">
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">
                Chart settings
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {getChartDescription(config)}
              </p>

              <div className="mt-4 space-y-4">
                <InputWithLabel
                  label="Chart title"
                  value={config.title}
                  inputClassName="h-10 text-xs"
                  onChange={(event) =>
                    updateConfig("title", event.target.value)
                  }
                />

                <CheckSelect
                  label="Chart type"
                  value={config.chartType}
                  options={CHART_TYPE_OPTIONS}
                  onChange={(value) => updateConfig("chartType", value)}
                  triggerClassName="h-10 text-xs"
                />

                {isGroupedChart(config.chartType) ? (
                  <CheckSelect
                    label="Aggregation"
                    value={config.aggregation}
                    options={AGGREGATION_OPTIONS}
                    onChange={(value) => updateConfig("aggregation", value)}
                    triggerClassName="h-10 text-xs"
                  />
                ) : null}

                {config.chartType !== "histogram" ? (
                  <CheckSelect
                    label={
                      config.chartType === "scatter"
                        ? "X numeric column"
                        : "Group by column"
                    }
                    value={config.xColumn}
                    options={toOptions(xColumnOptions)}
                    onChange={(value) => updateConfig("xColumn", value)}
                    disabled={xColumnOptions.length === 0}
                    triggerClassName="h-10 text-xs"
                  />
                ) : null}

                {groupedCountChart ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/[0.18] p-3 text-xs leading-5 text-muted-foreground">
                    <div className="font-semibold text-foreground">Y value</div>
                    <div className="mt-1">Row count</div>
                    <div className="mt-1">
                      Count aggregation does not need a numeric Y column.
                    </div>
                  </div>
                ) : (
                  <CheckSelect
                    label={
                      config.chartType === "histogram"
                        ? "Numeric column"
                        : "Y numeric column"
                    }
                    value={config.yColumn}
                    options={toOptions(yColumnOptions)}
                    onChange={(value) => updateConfig("yColumn", value)}
                    disabled={yColumnOptions.length === 0}
                    triggerClassName="h-10 text-xs"
                  />
                )}

                {isGroupedChart(config.chartType) ? (
                  <InputWithLabel
                    label="Top groups"
                    value={String(config.topN)}
                    type="number"
                    min={3}
                    max={50}
                    inputClassName="h-10 text-xs"
                    onChange={(event) =>
                      updateConfig("topN", Number(event.target.value))
                    }
                  />
                ) : null}

                {compatibilityMessage ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 size-4 shrink-0" />
                      <span>{compatibilityMessage}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="min-h-0 overflow-auto p-4">
            <ChartView
              rows={rows}
              config={config}
              numericColumns={numericColumns}
              groupableColumns={safeGroupableColumns}
            />
          </div>
        </div>
      </div>
    </section>
  );
}