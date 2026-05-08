"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Info } from "lucide-react";
import { ChartView } from "@/components/workbench/analytics/ChartView";
import {
  CheckSelect,
  type CheckSelectOption,
} from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import type { ColumnType } from "@/types/dataset";
import { useWorkspaceStore } from "@/store/workspaceStore";

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
    label: type,
  }),
);

const AGGREGATION_OPTIONS: CheckSelectOption<Aggregation>[] = AGGREGATIONS.map(
  (aggregation) => ({
    value: aggregation,
    label: aggregation,
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

function getDefaultTitle(chartType: ChartType, aggregation: Aggregation) {
  if (chartType === "histogram") return "Distribution";
  if (chartType === "scatter") return "Scatter plot";
  if (aggregation === "count") return "Count by category";

  return `${aggregation} by category`;
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

  const safeGroupableColumns =
    groupableColumns.length > 0 ? groupableColumns : fields;

  const [config, setConfig] = useState<ChartConfig>({
    chartType: "bar",
    xColumn: first(safeGroupableColumns),
    yColumn: first(numericColumns),
    aggregation: "count",
    topN: 10,
    title: "Count by category",
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

  if (!workspace) return null;

  return (
    <section className="grid h-full min-h-0 overflow-hidden rounded-3xl border bg-background lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-b bg-muted/10 p-4 lg:border-b-0 lg:border-r">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/30">
              <BarChart3 className="size-5 text-foreground" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Chart builder
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Build charts from compatible schema-aware columns.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <InputWithLabel
            label="Title"
            value={config.title}
            onChange={(event) => updateConfig("title", event.target.value)}
          />

          <CheckSelect<ChartType>
            label="Chart type"
            value={config.chartType}
            options={CHART_TYPE_OPTIONS}
            onChange={(value) => updateConfig("chartType", value)}
          />

          <div className="rounded-2xl border bg-muted/20 p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-5 text-muted-foreground">
                {getChartDescription(config)}
              </p>
            </div>
          </div>

          {isGroupedChart(config.chartType) && (
            <CheckSelect<Aggregation>
              label="Aggregation"
              value={config.aggregation}
              options={AGGREGATION_OPTIONS}
              onChange={(value) => updateConfig("aggregation", value)}
            />
          )}

          {config.chartType !== "histogram" && (
            <CheckSelect<string>
              label={
                config.chartType === "scatter"
                  ? "X numeric column"
                  : "Group by column"
              }
              value={config.xColumn}
              options={toOptions(xColumnOptions)}
              onChange={(value) => updateConfig("xColumn", value)}
              disabled={xColumnOptions.length === 0}
            />
          )}

          {groupedCountChart ? (
            <div className="rounded-2xl border bg-muted/25 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Y value
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                Row count
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Count aggregation does not need a numeric Y column.
              </p>
            </div>
          ) : (
            <CheckSelect<string>
              label={
                config.chartType === "histogram"
                  ? "Numeric column"
                  : "Y numeric column"
              }
              value={config.yColumn}
              options={toOptions(yColumnOptions)}
              onChange={(value) => updateConfig("yColumn", value)}
              disabled={yColumnOptions.length === 0}
            />
          )}

          {isGroupedChart(config.chartType) && (
            <InputWithLabel
              label="Top N groups"
              type="number"
              min={3}
              max={50}
              value={config.topN}
              onChange={(event) =>
                updateConfig("topN", Number(event.target.value))
              }
            />
          )}

          {compatibilityMessage && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {compatibilityMessage}
            </div>
          )}

          <div className="rounded-2xl border bg-muted/25 p-4 text-xs leading-5 text-muted-foreground shadow-sm">
            <p>
              Total columns:{" "}
              <span className="font-semibold text-foreground">
                {columns.length}
              </span>
            </p>
            <p>
              Numeric columns:{" "}
              <span className="font-semibold text-foreground">
                {numericColumns.length}
              </span>
            </p>
            <p>
              Groupable columns:{" "}
              <span className="font-semibold text-foreground">
                {safeGroupableColumns.length}
              </span>
            </p>
          </div>
        </div>
      </aside>

      <ChartView
        rows={rows}
        config={config}
        numericColumns={numericColumns}
        groupableColumns={safeGroupableColumns}
      />
    </section>
  );
}