"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Gauge,
  Info,
  Rows3,
  Settings2,
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

export type Aggregation =
  | "count"
  | "sum"
  | "average"
  | "min"
  | "max"
  | "median";

export type ChartLabelMode = "value" | "name" | "percent" | "name_percent";
export type ChartLegendPosition = "none" | "top" | "right" | "bottom";
export type PieLabelPosition = "outside" | "inside" | "center";

export type ChartColumnFilter =
  | "recommended"
  | "categorical"
  | "boolean"
  | "numeric"
  | "date_time"
  | "all_columns";

export type ChartDisplayOptions = {
  showGrid: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  showLabels: boolean;
  enableAnimation: boolean;
  showDataZoom: boolean;

  legendPosition: ChartLegendPosition;
  labelMode: ChartLabelMode;

  axisLabelRotation: number;
  axisFontSize: number;
  truncateAxisLabels: boolean;
  chartPadding: number;

  smoothLines: boolean;
  lineWidth: number;
  pointSize: number;
  areaOpacity: number;

  barWidth: number;
  barRadius: number;

  pieInnerRadius: number;
  pieOuterRadius: number;
  pieMinAngle: number;
  pieRoseType: boolean;
  pieLabelPosition: PieLabelPosition;
};

export type ChartConfig = {
  chartType: ChartType;
  xColumn: string;
  yColumn: string;
  aggregation: Aggregation;
  topN: number;
  title: string;
  displayOptions: ChartDisplayOptions;
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

const NUMERIC_CHART_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "currency",
  "percentage",
  "latitude",
  "longitude",
];

const DATE_TIME_CHART_TYPES: ColumnType[] = ["date", "datetime", "time"];

const RECOMMENDED_GROUP_TYPES: ColumnType[] = [
  "category",
  "boolean",
  "date",
  "datetime",
  "time",
  ...NUMERIC_CHART_TYPES,
];

const DEFAULT_DISPLAY_OPTIONS: ChartDisplayOptions = {
  showGrid: true,
  showTooltip: true,
  showLegend: false,
  showLabels: true,
  enableAnimation: true,
  showDataZoom: false,

  legendPosition: "bottom",
  labelMode: "value",

  axisLabelRotation: 0,
  axisFontSize: 11,
  truncateAxisLabels: true,
  chartPadding: 24,

  smoothLines: true,
  lineWidth: 3,
  pointSize: 14,
  areaOpacity: 0.18,

  barWidth: 72,
  barRadius: 8,

  pieInnerRadius: 38,
  pieOuterRadius: 68,
  pieMinAngle: 3,
  pieRoseType: false,
  pieLabelPosition: "outside",
};

const COLUMN_FILTER_OPTIONS: CheckSelectOption<ChartColumnFilter>[] = [
  {
    value: "recommended",
    label: "Recommended",
    description: "Category, boolean, numeric, date, and time columns.",
  },
  {
    value: "categorical",
    label: "Categorical",
    description: "Only category columns.",
  },
  {
    value: "boolean",
    label: "Boolean",
    description: "Only true/false columns.",
  },
  {
    value: "numeric",
    label: "Numeric",
    description: "Integer, decimal, currency, percentage, latitude, longitude.",
  },
  {
    value: "date_time",
    label: "Date / Time",
    description: "Date, date-time, and time columns.",
  },
  {
    value: "all_columns",
    label: "All Columns",
    description: "Allow IDs, text fields, and any other detected column.",
  },
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

function first(values: string[]) {
  return values[0] ?? "";
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

function formatColumnFilterLabel(filter: ChartColumnFilter): string {
  return (
    COLUMN_FILTER_OPTIONS.find((option) => option.value === filter)?.label ??
    "Recommended"
  );
}

function getDynamicChartTitle(config: ChartConfig): string {
  if (config.chartType === "histogram") {
    return `Distribution of ${config.yColumn || "Numeric Column"}`;
  }

  if (config.chartType === "scatter") {
    return `${config.yColumn || "Y Column"} vs ${
      config.xColumn || "X Column"
    }`;
  }

  if (config.aggregation === "count") {
    return `Count by ${config.xColumn || "Category"}`;
  }

  return `${formatAggregationLabel(config.aggregation)} of ${
    config.yColumn || "Value"
  } by ${config.xColumn || "Category"}`;
}

function isGroupedChart(chartType: ChartType) {
  return ["bar", "line", "area", "pie"].includes(chartType);
}

function chartNeedsNumericY(config: ChartConfig) {
  if (config.chartType === "scatter") return true;
  if (config.chartType === "histogram") return true;

  return isGroupedChart(config.chartType) && config.aggregation !== "count";
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

function CheckboxRow({
  checked,
  label,
  description,
  onClick,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition ${
        checked ? "bg-primary/10" : "hover:bg-muted"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        }`}
      >
        {checked ? <Check className="size-3" /> : null}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function OptionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-xl border px-3 text-xs font-semibold leading-none shadow-sm transition ${
        checked
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <span
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        }`}
      >
        {checked ? <Check className="size-3" /> : null}
      </span>
      <span className="text-xs font-semibold leading-none">{label}</span>
    </button>
  );
}

function NumberOption({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 !text-xs !font-semibold leading-none text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </label>
  );
}

function SelectOption<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 !text-xs !font-semibold leading-none text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-xs font-semibold"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColumnPoolDropdown({
  value,
  onChange,
}: {
  value: ChartColumnFilter;
  onChange: (value: ChartColumnFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (!open) return;

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 text-xs text-muted-foreground shadow-sm transition hover:bg-muted/50"
      >
        <span>Column pool:</span>
        <span className="text-xs font-semibold text-foreground">
          {formatColumnFilterLabel(value)}
        </span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-border bg-background p-2 shadow-xl">
          <div className="px-2 py-1.5">
            <div className="text-xs font-bold text-foreground">
              Column filter
            </div>
            <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Controls which columns appear in chart selectors.
            </div>
          </div>

          <div className="mt-1 max-h-[280px] space-y-1 overflow-auto">
            {COLUMN_FILTER_OPTIONS.map((option) => (
              <CheckboxRow
                key={option.value}
                checked={value === option.value}
                label={option.label}
                description={option.description}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DisplayOptionsDropdown({
  chartType,
  displayOptions,
  updateDisplayOptions,
}: {
  chartType: ChartType;
  displayOptions: ChartDisplayOptions;
  updateDisplayOptions: (nextOptions: Partial<ChartDisplayOptions>) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isCartesian = chartType !== "pie";
  const isLineLike = chartType === "line" || chartType === "area";
  const isBarLike = chartType === "bar" || chartType === "histogram";
  const isPie = chartType === "pie";
  const isScatter = chartType === "scatter";

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (!open) return;

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 text-xs text-muted-foreground shadow-sm transition hover:bg-muted/50"
      >
        <Settings2 className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Display options</span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[360px] rounded-2xl border border-border bg-background p-3 shadow-xl">
          <div className="text-xs font-bold text-foreground">
            Display options
          </div>
          <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            Options below change based on the selected chart type.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {isCartesian ? (
              <OptionToggle
                label="Grid"
                checked={displayOptions.showGrid}
                onChange={(checked) =>
                  updateDisplayOptions({ showGrid: checked })
                }
              />
            ) : null}

            <OptionToggle
              label="Tooltip"
              checked={displayOptions.showTooltip}
              onChange={(checked) =>
                updateDisplayOptions({ showTooltip: checked })
              }
            />

            <OptionToggle
              label="Legend"
              checked={displayOptions.showLegend}
              onChange={(checked) =>
                updateDisplayOptions({ showLegend: checked })
              }
            />

            <OptionToggle
              label="Labels"
              checked={displayOptions.showLabels}
              onChange={(checked) =>
                updateDisplayOptions({ showLabels: checked })
              }
            />

            <OptionToggle
              label="Animation"
              checked={displayOptions.enableAnimation}
              onChange={(checked) =>
                updateDisplayOptions({ enableAnimation: checked })
              }
            />

            {isCartesian ? (
              <OptionToggle
                label="Zoom"
                checked={displayOptions.showDataZoom}
                onChange={(checked) =>
                  updateDisplayOptions({ showDataZoom: checked })
                }
              />
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SelectOption
                label="Legend position"
                value={
                  displayOptions.showLegend
                    ? displayOptions.legendPosition
                    : "none"
                }
                options={[
                  { value: "none", label: "None" },
                  { value: "top", label: "Top" },
                  { value: "bottom", label: "Bottom" },
                  { value: "right", label: "Right" },
                ]}
                onChange={(value) =>
                  updateDisplayOptions({
                    showLegend: value !== "none",
                    legendPosition: value === "none" ? "bottom" : value,
                  })
                }
              />

              <SelectOption
                label="Label content"
                value={displayOptions.labelMode}
                options={[
                  { value: "value", label: "Value" },
                  { value: "name", label: "Name" },
                  { value: "percent", label: "Percent" },
                  { value: "name_percent", label: "Name + Percent" },
                ]}
                onChange={(value) => updateDisplayOptions({ labelMode: value })}
              />
            </div>

            {isCartesian ? (
              <div className="rounded-2xl border border-border/70 bg-muted/[0.12] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Axis & layout
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberOption
                    label="Axis rotation"
                    value={displayOptions.axisLabelRotation}
                    min={-90}
                    max={90}
                    onChange={(value) =>
                      updateDisplayOptions({ axisLabelRotation: value })
                    }
                  />

                  <NumberOption
                    label="Axis font size"
                    value={displayOptions.axisFontSize}
                    min={8}
                    max={18}
                    onChange={(value) =>
                      updateDisplayOptions({ axisFontSize: value })
                    }
                  />

                  <NumberOption
                    label="Chart padding"
                    value={displayOptions.chartPadding}
                    min={8}
                    max={80}
                    onChange={(value) =>
                      updateDisplayOptions({ chartPadding: value })
                    }
                  />

                  <div className="flex items-end">
                    <OptionToggle
                      label="Truncate labels"
                      checked={displayOptions.truncateAxisLabels}
                      onChange={(checked) =>
                        updateDisplayOptions({ truncateAxisLabels: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {isLineLike ? (
              <div className="rounded-2xl border border-border/70 bg-muted/[0.12] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Line / Area
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberOption
                    label="Line width"
                    value={displayOptions.lineWidth}
                    min={1}
                    max={10}
                    onChange={(value) =>
                      updateDisplayOptions({ lineWidth: value })
                    }
                  />

                  <NumberOption
                    label="Point size"
                    value={displayOptions.pointSize}
                    min={4}
                    max={40}
                    onChange={(value) =>
                      updateDisplayOptions({ pointSize: value })
                    }
                  />

                  {chartType === "area" ? (
                    <NumberOption
                      label="Area opacity"
                      value={displayOptions.areaOpacity}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(value) =>
                        updateDisplayOptions({ areaOpacity: value })
                      }
                    />
                  ) : null}

                  <div className="flex items-end">
                    <OptionToggle
                      label="Smooth"
                      checked={displayOptions.smoothLines}
                      onChange={(checked) =>
                        updateDisplayOptions({ smoothLines: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {isBarLike ? (
              <div className="rounded-2xl border border-border/70 bg-muted/[0.12] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Bars
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberOption
                    label="Bar width"
                    value={displayOptions.barWidth}
                    min={12}
                    max={120}
                    onChange={(value) =>
                      updateDisplayOptions({ barWidth: value })
                    }
                  />

                  <NumberOption
                    label="Bar radius"
                    value={displayOptions.barRadius}
                    min={0}
                    max={24}
                    onChange={(value) =>
                      updateDisplayOptions({ barRadius: value })
                    }
                  />
                </div>
              </div>
            ) : null}

            {isScatter ? (
              <div className="rounded-2xl border border-border/70 bg-muted/[0.12] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Scatter
                </div>

                <NumberOption
                  label="Point size"
                  value={displayOptions.pointSize}
                  min={4}
                  max={80}
                  onChange={(value) =>
                    updateDisplayOptions({ pointSize: value })
                  }
                />
              </div>
            ) : null}

            {isPie ? (
              <div className="rounded-2xl border border-border/70 bg-muted/[0.12] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Pie / Donut
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumberOption
                    label="Inner radius"
                    value={displayOptions.pieInnerRadius}
                    min={0}
                    max={90}
                    onChange={(value) =>
                      updateDisplayOptions({ pieInnerRadius: value })
                    }
                  />

                  <NumberOption
                    label="Outer radius"
                    value={displayOptions.pieOuterRadius}
                    min={30}
                    max={90}
                    onChange={(value) =>
                      updateDisplayOptions({ pieOuterRadius: value })
                    }
                  />

                  <NumberOption
                    label="Minimum angle"
                    value={displayOptions.pieMinAngle}
                    min={0}
                    max={20}
                    onChange={(value) =>
                      updateDisplayOptions({ pieMinAngle: value })
                    }
                  />

                  <SelectOption
                    label="Label position"
                    value={displayOptions.pieLabelPosition}
                    options={[
                      { value: "outside", label: "Outside" },
                      { value: "inside", label: "Inside" },
                      { value: "center", label: "Center" },
                    ]}
                    onChange={(value) =>
                      updateDisplayOptions({ pieLabelPosition: value })
                    }
                  />

                  <div className="flex items-end">
                    <OptionToggle
                      label="Rose chart"
                      checked={displayOptions.pieRoseType}
                      onChange={(checked) =>
                        updateDisplayOptions({ pieRoseType: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getColumnNamesByFilter({
  columns,
  filter,
}: {
  columns: { name: string; type: ColumnType }[];
  filter: ChartColumnFilter;
}) {
  return columns
    .filter((column) => {
      if (filter === "all_columns") return true;
      if (filter === "recommended") {
        return RECOMMENDED_GROUP_TYPES.includes(column.type);
      }
      if (filter === "categorical") return column.type === "category";
      if (filter === "boolean") return column.type === "boolean";
      if (filter === "numeric") return NUMERIC_CHART_TYPES.includes(column.type);
      if (filter === "date_time") {
        return DATE_TIME_CHART_TYPES.includes(column.type);
      }

      return false;
    })
    .map((column) => column.name);
}

export function ChartBuilder() {
  const workspace = useWorkspaceStore((state) => state.workspace);

  const fields = workspace?.fields ?? [];
  const columns = workspace?.profile.columns ?? [];
  const rows = workspace?.workingRows ?? [];

  const [columnFilter, setColumnFilter] =
    useState<ChartColumnFilter>("recommended");

  const numericColumns = useMemo(() => {
    return columns
      .filter((column) => NUMERIC_CHART_TYPES.includes(column.type))
      .map((column) => column.name);
  }, [columns]);

  const selectedGroupColumns = useMemo(() => {
    return getColumnNamesByFilter({
      columns,
      filter: columnFilter,
    });
  }, [columns, columnFilter]);

  const recommendedGroupColumns = useMemo(() => {
    return getColumnNamesByFilter({
      columns,
      filter: "recommended",
    });
  }, [columns]);

  const safeGroupableColumns =
    selectedGroupColumns.length > 0
      ? selectedGroupColumns
      : recommendedGroupColumns.length > 0
        ? recommendedGroupColumns
        : fields;

  const [config, setConfig] = useState<ChartConfig>({
    chartType: "bar",
    xColumn: first(safeGroupableColumns),
    yColumn: first(numericColumns),
    aggregation: "count",
    topN: 10,
    title: "Count by Category",
    displayOptions: DEFAULT_DISPLAY_OPTIONS,
  });

  useEffect(() => {
    setConfig((current) => {
      let nextConfig = { ...current };

      if (current.chartType === "scatter") {
        if (!numericColumns.includes(nextConfig.xColumn)) {
          nextConfig.xColumn = first(numericColumns);
        }

        if (!numericColumns.includes(nextConfig.yColumn)) {
          nextConfig.yColumn = first(numericColumns);
        }
      }

      if (current.chartType === "histogram") {
        if (!numericColumns.includes(nextConfig.yColumn)) {
          nextConfig.yColumn = first(numericColumns);
        }
      }

      if (isGroupedChart(current.chartType)) {
        if (!safeGroupableColumns.includes(nextConfig.xColumn)) {
          nextConfig.xColumn = first(safeGroupableColumns);
        }

        if (
          current.aggregation !== "count" &&
          !numericColumns.includes(nextConfig.yColumn)
        ) {
          nextConfig.yColumn = first(numericColumns);
        }
      }

      return {
        ...nextConfig,
        title: getDynamicChartTitle(nextConfig),
      };
    });
  }, [fields, numericColumns, safeGroupableColumns]);

  function updateConfig<K extends keyof ChartConfig>(
    key: K,
    value: ChartConfig[K],
  ) {
    setConfig((current) => {
      let nextConfig: ChartConfig = {
        ...current,
        [key]: value,
      };

      if (key === "chartType") {
        const chartType = value as ChartType;

        if (chartType === "scatter") {
          nextConfig = {
            ...nextConfig,
            xColumn: numericColumns.includes(current.xColumn)
              ? current.xColumn
              : first(numericColumns),
            yColumn: numericColumns.includes(current.yColumn)
              ? current.yColumn
              : first(numericColumns),
          };
        } else if (chartType === "histogram") {
          nextConfig = {
            ...nextConfig,
            yColumn: numericColumns.includes(current.yColumn)
              ? current.yColumn
              : first(numericColumns),
          };
        } else {
          nextConfig = {
            ...nextConfig,
            xColumn: safeGroupableColumns.includes(current.xColumn)
              ? current.xColumn
              : first(safeGroupableColumns),
            yColumn: numericColumns.includes(current.yColumn)
              ? current.yColumn
              : first(numericColumns),
          };
        }
      }

      if (key === "aggregation") {
        const aggregation = value as Aggregation;

        nextConfig = {
          ...nextConfig,
          yColumn:
            aggregation === "count"
              ? nextConfig.yColumn
              : numericColumns.includes(nextConfig.yColumn)
                ? nextConfig.yColumn
                : first(numericColumns),
        };
      }

      return {
        ...nextConfig,
        title: getDynamicChartTitle(nextConfig),
      };
    });
  }

  function updateColumnFilter(nextFilter: ChartColumnFilter) {
    setColumnFilter(nextFilter);

    const nextColumns = getColumnNamesByFilter({
      columns,
      filter: nextFilter,
    });

    const fallbackColumns =
      nextColumns.length > 0
        ? nextColumns
        : recommendedGroupColumns.length > 0
          ? recommendedGroupColumns
          : fields;

    setConfig((current) => {
      if (!isGroupedChart(current.chartType)) return current;

      const nextConfig = {
        ...current,
        xColumn: fallbackColumns.includes(current.xColumn)
          ? current.xColumn
          : first(fallbackColumns),
      };

      return {
        ...nextConfig,
        title: getDynamicChartTitle(nextConfig),
      };
    });
  }

  function updateDisplayOptions(nextOptions: Partial<ChartDisplayOptions>) {
    setConfig((current) => ({
      ...current,
      displayOptions: {
        ...current.displayOptions,
        ...nextOptions,
      },
    }));
  }

  const xColumnOptions = useMemo(() => {
    if (config.chartType === "scatter") return numericColumns;
    if (config.chartType === "histogram") return [];

    return safeGroupableColumns;
  }, [config.chartType, numericColumns, safeGroupableColumns]);

  const yColumnOptions = useMemo(() => {
    if (chartNeedsNumericY(config)) return numericColumns;

    return numericColumns;
  }, [config, numericColumns]);

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

    if (isGroupedChart(config.chartType) && safeGroupableColumns.length === 0) {
      return "No columns are available for the selected column pool.";
    }

    if (needsNumericY && numericColumns.length === 0) {
      return "This aggregation requires a numeric Y column.";
    }

    return "";
  }, [
    workspace,
    config.chartType,
    numericColumns.length,
    safeGroupableColumns.length,
    needsNumericY,
  ]);

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
          <ToolChip
            label="Chart type"
            value={formatChartTypeLabel(config.chartType)}
          />

          <ToolChip
            label="Rows"
            value={workspace.workingRows.length.toLocaleString()}
          />

          <ToolChip label="Shown columns" value={safeGroupableColumns.length} />

          <ToolChip label="Numeric columns" value={numericColumns.length} />

          <ColumnPoolDropdown
            value={columnFilter}
            onChange={updateColumnFilter}
          />

          <DisplayOptionsDropdown
            chartType={config.chartType}
            displayOptions={config.displayOptions}
            updateDisplayOptions={updateDisplayOptions}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-4 overflow-auto border-b border-border/70 bg-muted/[0.08] p-4 xl:border-b-0 xl:border-r">
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