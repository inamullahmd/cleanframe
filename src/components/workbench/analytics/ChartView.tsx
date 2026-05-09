"use client";

import { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import { Download, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DatasetRow } from "@/types/dataset";
import type {
  Aggregation,
  ChartConfig,
  ChartDisplayOptions,
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

function buildGroupedData(
  rows: DatasetRow[],
  config: ChartConfig,
): ChartDatum[] {
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
      return "Select a valid group column.";
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

function getLabelFormatter(displayOptions: ChartDisplayOptions): string {
  if (displayOptions.labelMode === "name") {
    return "{b}";
  }

  if (displayOptions.labelMode === "percent") {
    return "{d}%";
  }

  if (displayOptions.labelMode === "name_percent") {
    return "{b} {d}%";
  }

  return "{c}";
}

function getCartesianLabelFormatter(
  displayOptions: ChartDisplayOptions,
): string {
  if (displayOptions.labelMode === "name") return "{b}";

  return "{c}";
}

function getLegendConfig(
  displayOptions: ChartDisplayOptions,
): EChartsOption["legend"] {
  if (!displayOptions.showLegend) return undefined;

  if (displayOptions.legendPosition === "top") {
    return {
      top: 0,
      left: "center",
      type: "scroll",
    };
  }

  if (displayOptions.legendPosition === "right") {
    return {
      top: "middle",
      right: 0,
      orient: "vertical",
      type: "scroll",
    };
  }

  return {
    bottom: 0,
    left: "center",
    type: "scroll",
  };
}

function getGridConfig(
  displayOptions: ChartDisplayOptions,
): EChartsOption["grid"] {
  const padding = displayOptions.chartPadding;

  return {
    left: padding + 24,
    right:
      displayOptions.showLegend && displayOptions.legendPosition === "right"
        ? 140
        : padding,
    top:
      displayOptions.showLegend && displayOptions.legendPosition === "top"
        ? 56
        : padding,
    bottom:
      displayOptions.showLegend && displayOptions.legendPosition === "bottom"
        ? 76
        : padding + 28,
    containLabel: true,
  };
}

function getDataZoomConfig(
  displayOptions: ChartDisplayOptions,
): EChartsOption["dataZoom"] {
  if (!displayOptions.showDataZoom) return undefined;

  return [
    {
      type: "inside",
      start: 0,
      end: 100,
    },
    {
      type: "slider",
      height: 20,
      bottom: 12,
      start: 0,
      end: 100,
    },
  ];
}

function buildChartOption({
  config,
  chartData,
}: {
  config: ChartConfig;
  chartData: ChartDatum[];
}): EChartsOption {
  const displayOptions = config.displayOptions;
  const legend = getLegendConfig(displayOptions);
  const labelFormatter = getLabelFormatter(displayOptions);
  const cartesianLabelFormatter = getCartesianLabelFormatter(displayOptions);

  const baseOption: EChartsOption = {
    color: COLORS,
    animation: displayOptions.enableAnimation,
    animationDuration: displayOptions.enableAnimation ? 500 : 0,
    backgroundColor: "transparent",
    tooltip: displayOptions.showTooltip
      ? {
          trigger: config.chartType === "scatter" ? "item" : "axis",
          valueFormatter: (value) => formatNumber(Number(value)),
        }
      : undefined,
    legend,
  };

  if (config.chartType === "pie") {
    const labelPosition =
      displayOptions.pieLabelPosition === "outside"
        ? "outer"
        : displayOptions.pieLabelPosition;

    return {
      ...baseOption,
      tooltip: displayOptions.showTooltip
        ? {
            trigger: "item",
            formatter: "{b}<br />{c} ({d}%)",
          }
        : undefined,
      series: [
        {
          name: config.title,
          type: "pie",
          radius: [
            `${displayOptions.pieInnerRadius}%`,
            `${displayOptions.pieOuterRadius}%`,
          ],
          center: ["50%", "52%"],
          roseType: displayOptions.pieRoseType ? "radius" : undefined,
          avoidLabelOverlap: true,
          minAngle: displayOptions.pieMinAngle,
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
          },
          label: {
            show: displayOptions.showLabels,
            formatter:
              displayOptions.labelMode === "value" ? "{c}" : labelFormatter,
            position: labelPosition,
            overflow: "truncate",
            width: 120,
          },
          labelLine: {
            show:
              displayOptions.showLabels &&
              displayOptions.pieLabelPosition === "outside",
            length: 14,
            length2: 10,
            smooth: true,
          },
          data: chartData.map((item) => ({
            name: item.name,
            value: item.value,
          })),
        },
      ],
    };
  }

  if (config.chartType === "scatter") {
    return {
      ...baseOption,
      grid: getGridConfig(displayOptions),
      dataZoom: getDataZoomConfig(displayOptions),
      xAxis: {
        type: "value",
        name: config.xColumn,
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: {
          fontSize: displayOptions.axisFontSize,
          rotate: displayOptions.axisLabelRotation,
        },
        splitLine: {
          show: displayOptions.showGrid,
          lineStyle: {
            type: "dashed",
            color: "#d8dee8",
          },
        },
      },
      yAxis: {
        type: "value",
        name: config.yColumn,
        nameGap: 40,
        axisLabel: {
          fontSize: displayOptions.axisFontSize,
        },
        splitLine: {
          show: displayOptions.showGrid,
          lineStyle: {
            type: "dashed",
            color: "#d8dee8",
          },
        },
      },
      series: [
        {
          name: config.title,
          type: "scatter",
          symbolSize: displayOptions.pointSize,
          data: chartData.map((item) => [item.x, item.y]),
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          label: {
            show: displayOptions.showLabels,
            position: "top",
            formatter: "{@[1]}",
            fontSize: displayOptions.axisFontSize,
          },
        },
      ],
    };
  }

  const xAxisData = chartData.map((item) => item.name);
  const yAxisData = chartData.map((item) => item.value);

  const commonCartesianOption: EChartsOption = {
    ...baseOption,
    grid: getGridConfig(displayOptions),
    dataZoom: getDataZoomConfig(displayOptions),
    xAxis: {
      type: "category",
      data: xAxisData,
      axisLabel: {
        fontSize: displayOptions.axisFontSize,
        interval: 0,
        rotate: displayOptions.axisLabelRotation,
        hideOverlap: true,
        overflow: displayOptions.truncateAxisLabels ? "truncate" : "break",
        width: displayOptions.truncateAxisLabels ? 90 : undefined,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        fontSize: displayOptions.axisFontSize,
      },
      splitLine: {
        show: displayOptions.showGrid,
        lineStyle: {
          type: "dashed",
          color: "#d8dee8",
        },
      },
    },
  };

  if (config.chartType === "line") {
    return {
      ...commonCartesianOption,
      series: [
        {
          name: config.title,
          type: "line",
          data: yAxisData,
          smooth: displayOptions.smoothLines,
          symbolSize: displayOptions.pointSize,
          lineStyle: {
            width: displayOptions.lineWidth,
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          label: {
            show: displayOptions.showLabels,
            position: "top",
            formatter: cartesianLabelFormatter,
            fontSize: displayOptions.axisFontSize,
          },
        },
      ],
    };
  }

  if (config.chartType === "area") {
    return {
      ...commonCartesianOption,
      series: [
        {
          name: config.title,
          type: "line",
          data: yAxisData,
          smooth: displayOptions.smoothLines,
          symbolSize: displayOptions.pointSize,
          lineStyle: {
            width: displayOptions.lineWidth,
          },
          areaStyle: {
            opacity: displayOptions.areaOpacity,
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          label: {
            show: displayOptions.showLabels,
            position: "top",
            formatter: cartesianLabelFormatter,
            fontSize: displayOptions.axisFontSize,
          },
        },
      ],
    };
  }

  return {
    ...commonCartesianOption,
    series: [
      {
        name: config.title,
        type: "bar",
        data: yAxisData,
        barMaxWidth: displayOptions.barWidth,
        itemStyle: {
          borderRadius: [
            displayOptions.barRadius,
            displayOptions.barRadius,
            0,
            0,
          ],
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: "shiftY",
        },
        label: {
          show: displayOptions.showLabels,
          position: "top",
          formatter: cartesianLabelFormatter,
          fontSize: displayOptions.axisFontSize,
        },
      },
    ],
  };
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

  const chartOption = useMemo(() => {
    return buildChartOption({
      config,
      chartData,
    });
  }, [config, chartData]);

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

    return (
      <ReactECharts
        option={chartOption}
        notMerge
        lazyUpdate
        style={{
          width: "100%",
          height: "100%",
          minHeight: 430,
        }}
      />
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