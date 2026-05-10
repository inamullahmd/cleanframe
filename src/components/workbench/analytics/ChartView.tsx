"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
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

type ReactEChartsRef = {
  getEchartsInstance: () => {
    getDataURL: (options: {
      type: "png";
      pixelRatio: number;
      backgroundColor: string;
    }) => string;
  };
};

type ChartThemeTokens = {
  background: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  gridLine: string;
  tooltipBackground: string;
  tooltipBorder: string;
  labelColor: string;
  colors: string[];
};

type CartesianLabelPosition = "top" | "inside";
type PieLabelPosition = "center" | "inside" | "outer";

function hslVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  if (!value) return fallback;

  return `hsl(${value})`;
}

function getChartThemeTokens(): ChartThemeTokens {
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return {
    background: hslVar("--background", isDark ? "#111827" : "#ffffff"),
    foreground: hslVar("--foreground", isDark ? "#dbe4ee" : "#0f172a"),
    mutedForeground: hslVar(
      "--muted-foreground",
      isDark ? "#94a3b8" : "#64748b",
    ),
    border: hslVar("--border", isDark ? "#334155" : "#e2e8f0"),
    gridLine: isDark
      ? "rgba(148, 163, 184, 0.18)"
      : "rgba(100, 116, 139, 0.22)",
    tooltipBackground: isDark ? "#182233" : "#ffffff",
    tooltipBorder: isDark
      ? "rgba(148, 163, 184, 0.28)"
      : "rgba(15, 23, 42, 0.12)",
    labelColor: isDark ? "#cbd5e1" : "#334155",
    colors: [
      hslVar("--chart-1", isDark ? "#5eead4" : "#0f766e"),
      hslVar("--chart-2", isDark ? "#60a5fa" : "#2563eb"),
      hslVar("--chart-3", isDark ? "#fb923c" : "#c2410c"),
      hslVar("--chart-4", isDark ? "#a3e635" : "#65a30d"),
      hslVar("--chart-5", isDark ? "#f472b6" : "#be185d"),
      "#0891b2",
      "#7c3aed",
      "#ca8a04",
    ],
  };
}

function useChartThemeTokens() {
  const [tokens, setTokens] = useState<ChartThemeTokens>(() =>
    getChartThemeTokens(),
  );

  useEffect(() => {
    function refreshTokens() {
      setTokens(getChartThemeTokens());
    }

    refreshTokens();

    window.addEventListener("cleanframe-theme-change", refreshTokens);

    const observer = new MutationObserver(refreshTokens);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("cleanframe-theme-change", refreshTokens);
      observer.disconnect();
    };
  }, []);

  return tokens;
}

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
  if (displayOptions.labelMode === "name") return "{b}";
  if (displayOptions.labelMode === "percent") return "{d}%";
  if (displayOptions.labelMode === "name_percent") return "{b} {d}%";

  return "{c}";
}

function getCartesianLabelFormatter(displayOptions: ChartDisplayOptions): string {
  if (displayOptions.labelMode === "name") return "{b}";

  return "{c}";
}

function getLegendConfig(
  displayOptions: ChartDisplayOptions,
  chartTheme: ChartThemeTokens,
): EChartsOption["legend"] {
  if (!displayOptions.showLegend) return undefined;

  const baseLegend = {
    type: "scroll" as const,
    textStyle: {
      color: chartTheme.mutedForeground,
      fontSize: 11,
      fontWeight: 500,
    },
    pageIconColor: chartTheme.mutedForeground,
    pageIconInactiveColor: chartTheme.border,
    pageTextStyle: {
      color: chartTheme.mutedForeground,
    },
  };

  if (displayOptions.legendPosition === "top") {
    return {
      ...baseLegend,
      top: 0,
      left: "center",
    };
  }

  if (displayOptions.legendPosition === "right") {
    return {
      ...baseLegend,
      top: "middle",
      right: 0,
      orient: "vertical",
    };
  }

  if (displayOptions.legendPosition === "bottom") {
    return {
      ...baseLegend,
      bottom: 0,
      left: "center",
    };
  }

  return undefined;
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
  chartTheme: ChartThemeTokens,
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
      borderColor: chartTheme.border,
      backgroundColor: "transparent",
      fillerColor: "rgba(45, 212, 191, 0.18)",
      handleStyle: {
        color: chartTheme.mutedForeground,
        borderColor: chartTheme.border,
      },
      textStyle: {
        color: chartTheme.mutedForeground,
        fontSize: 11,
      },
    },
  ];
}

function getTooltipTrigger(chartType: ChartConfig["chartType"]) {
  if (chartType === "line" || chartType === "area") return "axis";

  return "item";
}

function getTooltipConfig({
  config,
  displayOptions,
  chartTheme,
}: {
  config: ChartConfig;
  displayOptions: ChartDisplayOptions;
  chartTheme: ChartThemeTokens;
}): EChartsOption["tooltip"] {
  if (!displayOptions.showTooltip) return undefined;

  if (config.chartType === "pie") {
    return {
      trigger: "item",
      backgroundColor: chartTheme.tooltipBackground,
      borderColor: chartTheme.tooltipBorder,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: {
        color: chartTheme.foreground,
        fontSize: 12,
        fontWeight: 500,
      },
      extraCssText:
        "border-radius: 12px; box-shadow: 0 12px 28px rgba(0,0,0,0.22);",
      formatter: "{b}<br />{c} ({d}%)",
    };
  }

  return {
    trigger: getTooltipTrigger(config.chartType),
    axisPointer:
      config.chartType === "line" || config.chartType === "area"
        ? {
            type: "line",
            lineStyle: {
              color: chartTheme.gridLine,
              width: 1,
              type: "dashed",
            },
            z: 0,
          }
        : undefined,
    backgroundColor: chartTheme.tooltipBackground,
    borderColor: chartTheme.tooltipBorder,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: {
      color: chartTheme.foreground,
      fontSize: 12,
      fontWeight: 500,
    },
    extraCssText:
      "border-radius: 12px; box-shadow: 0 12px 28px rgba(0,0,0,0.22);",
    valueFormatter: (value) => formatNumber(Number(value)),
  };
}

function getAxisLabelStyle(
  displayOptions: ChartDisplayOptions,
  chartTheme: ChartThemeTokens,
) {
  return {
    color: chartTheme.mutedForeground,
    fontSize: displayOptions.axisFontSize,
    fontWeight: 500,
  };
}

function getValueAxisStyle(
  displayOptions: ChartDisplayOptions,
  chartTheme: ChartThemeTokens,
) {
  return {
    axisLabel: getAxisLabelStyle(displayOptions, chartTheme),
    axisLine: {
      lineStyle: {
        color: chartTheme.border,
      },
    },
    axisTick: {
      lineStyle: {
        color: chartTheme.border,
      },
    },
    axisPointer: {
      show: false,
    },
    splitLine: {
      show: displayOptions.showGrid,
      lineStyle: {
        color: chartTheme.gridLine,
        type: "dashed" as const,
      },
    },
  };
}

function getCartesianSeriesLabelStyle({
  displayOptions,
  chartTheme,
  formatter,
  position = "top",
}: {
  displayOptions: ChartDisplayOptions;
  chartTheme: ChartThemeTokens;
  formatter: string;
  position?: CartesianLabelPosition;
}) {
  return {
    show: displayOptions.showLabels,
    position,
    color: chartTheme.labelColor,
    fontSize: Math.max(10, displayOptions.axisFontSize),
    fontWeight: 700,
    textBorderWidth: 0,
    textShadowBlur: 0,
    textShadowColor: "transparent",
    formatter,
  };
}

function getPieSeriesLabelStyle({
  displayOptions,
  chartTheme,
  formatter,
  position,
}: {
  displayOptions: ChartDisplayOptions;
  chartTheme: ChartThemeTokens;
  formatter: string;
  position: PieLabelPosition;
}) {
  return {
    show: displayOptions.showLabels,
    position,
    color: chartTheme.labelColor,
    fontSize: Math.max(10, displayOptions.axisFontSize),
    fontWeight: 700,
    textBorderWidth: 0,
    textShadowBlur: 0,
    textShadowColor: "transparent",
    formatter,
  };
}

function buildBarLikeData({
  chartData,
  chartTheme,
  borderRadius,
}: {
  chartData: ChartDatum[];
  chartTheme: ChartThemeTokens;
  borderRadius: number;
}) {
  const barColor = chartTheme.colors[0] ?? "#5eead4";

  return chartData.map((item) => ({
    name: item.name,
    value: item.value,
    itemStyle: {
      color: barColor,
      opacity: 1,
      borderRadius: [borderRadius, borderRadius, 0, 0],
    },
    emphasis: {
      disabled: true,
      itemStyle: {
        color: barColor,
        opacity: 1,
        borderRadius: [borderRadius, borderRadius, 0, 0],
      },
    },
  }));
}

function buildChartOption({
  config,
  chartData,
  chartTheme,
}: {
  config: ChartConfig;
  chartData: ChartDatum[];
  chartTheme: ChartThemeTokens;
}): EChartsOption {
  const displayOptions = config.displayOptions;
  const legend = getLegendConfig(displayOptions, chartTheme);
  const labelFormatter = getLabelFormatter(displayOptions);
  const cartesianLabelFormatter = getCartesianLabelFormatter(displayOptions);

  const baseOption: EChartsOption = {
    color: chartTheme.colors,
    animation: displayOptions.enableAnimation,
    animationDuration: displayOptions.enableAnimation ? 500 : 0,
    stateAnimation: {
      duration: 0,
    },
    backgroundColor: "transparent",
    axisPointer: {
      show: false,
    },
    tooltip: getTooltipConfig({
      config,
      displayOptions,
      chartTheme,
    }),
    legend,
  };

  if (config.chartType === "pie") {
    const labelPosition: PieLabelPosition =
      displayOptions.pieLabelPosition === "outside"
        ? "outer"
        : displayOptions.pieLabelPosition;

    return {
      ...baseOption,
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
            scale: false,
            disabled: true,
          },
          label: {
            ...getPieSeriesLabelStyle({
              displayOptions,
              chartTheme,
              formatter:
                displayOptions.labelMode === "value" ? "{c}" : labelFormatter,
              position: labelPosition,
            }),
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
            lineStyle: {
              color: chartTheme.border,
            },
          },
          data: chartData.map((item) => ({
            name: item.name,
            value: item.value,
          })),
        },
      ],
    } as EChartsOption;
  }

  if (config.chartType === "scatter") {
    return {
      ...baseOption,
      grid: getGridConfig(displayOptions),
      dataZoom: getDataZoomConfig(displayOptions, chartTheme),
      xAxis: {
        type: "value",
        name: config.xColumn,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          color: chartTheme.mutedForeground,
          fontSize: 11,
          fontWeight: 600,
        },
        ...getValueAxisStyle(displayOptions, chartTheme),
        axisLabel: {
          ...getAxisLabelStyle(displayOptions, chartTheme),
          rotate: displayOptions.axisLabelRotation,
        },
      },
      yAxis: {
        type: "value",
        name: config.yColumn,
        nameGap: 40,
        nameTextStyle: {
          color: chartTheme.mutedForeground,
          fontSize: 11,
          fontWeight: 600,
        },
        ...getValueAxisStyle(displayOptions, chartTheme),
      },
      series: [
        {
          name: config.title,
          type: "scatter",
          symbolSize: displayOptions.pointSize,
          data: chartData
            .filter(
              (item): item is ChartDatum & { x: number; y: number } =>
                typeof item.x === "number" && typeof item.y === "number",
            )
            .map((item) => [item.x, item.y]),
          emphasis: {
            disabled: true,
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          label: getCartesianSeriesLabelStyle({
            displayOptions,
            chartTheme,
            formatter: "{@[1]}",
            position: "top",
          }),
        },
      ],
    } as EChartsOption;
  }

  const xAxisData = chartData.map((item) => item.name);
  const yAxisData = chartData.map((item) => item.value);

  const commonCartesianOption: EChartsOption = {
    ...baseOption,
    grid: getGridConfig(displayOptions),
    dataZoom: getDataZoomConfig(displayOptions, chartTheme),
    xAxis: {
      type: "category",
      data: xAxisData,
      axisPointer: {
        show: false,
      },
      axisLabel: {
        ...getAxisLabelStyle(displayOptions, chartTheme),
        interval: 0,
        rotate: displayOptions.axisLabelRotation,
        hideOverlap: true,
        overflow: displayOptions.truncateAxisLabels ? "truncate" : "break",
        width: displayOptions.truncateAxisLabels ? 90 : undefined,
      },
      axisLine: {
        lineStyle: {
          color: chartTheme.border,
        },
      },
      axisTick: {
        lineStyle: {
          color: chartTheme.border,
        },
      },
    },
    yAxis: {
      type: "value",
      ...getValueAxisStyle(displayOptions, chartTheme),
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
          emphasis: {
            focus: "series",
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          label: getCartesianSeriesLabelStyle({
            displayOptions,
            chartTheme,
            formatter: cartesianLabelFormatter,
            position: "top",
          }),
        },
      ],
    } as EChartsOption;
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
          emphasis: {
            focus: "series",
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          label: getCartesianSeriesLabelStyle({
            displayOptions,
            chartTheme,
            formatter: cartesianLabelFormatter,
            position: "top",
          }),
        },
      ],
    } as EChartsOption;
  }

  const barData = buildBarLikeData({
    chartData,
    chartTheme,
    borderRadius: displayOptions.barRadius,
  });

  return {
    ...commonCartesianOption,
    tooltip: {
      ...getTooltipConfig({
        config,
        displayOptions,
        chartTheme,
      }),
      trigger: "item",
      axisPointer: undefined,
    },
    series: [
      {
        name: config.title,
        type: "bar",
        data: barData,
        barMaxWidth: displayOptions.barWidth,
        itemStyle: {
          color: chartTheme.colors[0] ?? "#5eead4",
          opacity: 1,
          borderRadius: [
            displayOptions.barRadius,
            displayOptions.barRadius,
            0,
            0,
          ],
        },
        emphasis: {
          disabled: true,
        },
        blur: {
          itemStyle: {
            opacity: 1,
          },
        },
        select: {
          disabled: true,
          itemStyle: {
            opacity: 1,
          },
        },
        selectedMode: false,
        labelLayout: {
          hideOverlap: true,
          moveOverlap: "shiftY",
        },
        label: getCartesianSeriesLabelStyle({
          displayOptions,
          chartTheme,
          formatter: cartesianLabelFormatter,
          position: "top",
        }),
      },
    ],
  } as EChartsOption;
}

export function ChartView({
  rows,
  config,
  numericColumns,
  groupableColumns,
}: Props) {
  const chartInstanceRef = useRef<ReactEChartsRef | null>(null);
  const chartTheme = useChartThemeTokens();

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
      chartTheme,
    });
  }, [config, chartData, chartTheme]);

  function downloadPng() {
    const chart = chartInstanceRef.current?.getEchartsInstance();

    if (!chart || chartData.length === 0) return;

    const dataUrl = chart.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: chartTheme.background,
    });

    const link = document.createElement("a");
    link.download = `${config.title || "cleanframe-chart"}.png`;
    link.href = dataUrl;
    link.click();
  }

  function renderChart() {
    if (compatibilityMessage) {
      return (
        <ChartEmptyState
          title="Chart setup needs attention"
          description={compatibilityMessage}
        />
      );
    }

    if (chartData.length === 0) {
      return (
        <ChartEmptyState
          title="No chart data available"
          description="Try another chart type, column, aggregation, or column pool."
        />
      );
    }

    return (
      <ReactECharts
        ref={chartInstanceRef as never}
        option={chartOption}
        notMerge
        lazyUpdate={false}
        opts={{ renderer: "canvas" }}
        style={{ width: "100%", height: "100%" }}
        className="h-full w-full"
      />
    );
  }

  return (
    <section className="flex h-full min-h-[520px] min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-1 pb-3">
        <div className="min-w-0">
          <h3 className="truncate !text-[13px] font-bold leading-5 text-foreground">
            {config.title || "Chart"}
          </h3>
          <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">
            {config.chartType} · {chartData.length.toLocaleString()} plotted
            items
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={downloadPng}
          disabled={Boolean(compatibilityMessage) || chartData.length === 0}
          className="h-8 rounded-xl px-3 !text-[13px]"
        >
          <Download className="mr-1.5 size-3.5" />
          PNG
        </Button>
      </div>

      <div className="min-h-0 flex-1 rounded-2xl bg-muted/[0.12] p-3">
        <div className="h-full min-h-[420px]">{renderChart()}</div>
      </div>
    </section>
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
    <div className="flex h-full min-h-[380px] items-center justify-center rounded-2xl bg-background/60 p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-muted/45 text-muted-foreground">
          <Info className="size-5" />
        </span>

        <h3 className="mt-3 !text-[13px] font-bold text-foreground">
          {title}
        </h3>

        <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}