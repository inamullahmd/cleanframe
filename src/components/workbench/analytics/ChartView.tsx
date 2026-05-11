"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { Archive, Check, Download, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExportPackageStore } from "@/store/exportPackageStore";
import { cn } from "@/lib/utils";
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

type EChartsInstanceLike = {
  getDataURL: (options: {
    type: "png";
    pixelRatio: number;
    backgroundColor: string;
  }) => string;
};

type ReactEChartsRef = {
  getEchartsInstance: () => EChartsInstanceLike;
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
type TitlePosition = NonNullable<ChartDisplayOptions["titlePosition"]>;

function getSafeTitlePosition(
  value: ChartDisplayOptions["titlePosition"],
): TitlePosition {
  if (value === "center" || value === "right") return value;

  return "left";
}

function getTitleAlignmentClass(position: TitlePosition) {
  if (position === "center") return "text-center";
  if (position === "right") return "text-right";

  return "text-left";
}

function getSafeDecimalPlaces(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;

  return Math.min(6, Math.max(0, Number(value)));
}

function getSafePercentDecimalPlaces(
  value: number | undefined,
  fallback: number,
) {
  if (!Number.isFinite(value)) return fallback;

  return Math.min(4, Math.max(0, Number(value)));
}

function formatChartValue(value: unknown, decimalPlaces: number) {
  const numericValue =
    typeof value === "number" ? value : Number(String(value ?? ""));

  if (!Number.isFinite(numericValue)) {
    return String(value ?? "");
  }

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  });
}

function formatChartPercent(value: unknown, decimalPlaces: number) {
  const numericValue =
    typeof value === "number" ? value : Number(String(value ?? ""));

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return `${numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  })}%`;
}

function getFormatterValue(params: unknown) {
  const item = params as {
    value?: unknown;
    data?: unknown;
  };

  if (Array.isArray(item.value)) {
    return item.value[item.value.length - 1];
  }

  return item.value;
}

function getFormatterName(params: unknown) {
  const item = params as {
    name?: unknown;
  };

  return String(item.name ?? "");
}

function getFormatterPercent(params: unknown) {
  const item = params as {
    percent?: unknown;
  };

  return item.percent;
}

function getPieLabelFormatter(displayOptions: ChartDisplayOptions) {
  const valueDecimals = getSafeDecimalPlaces(
    displayOptions.valueDecimalPlaces,
    2,
  );
  const percentDecimals = getSafePercentDecimalPlaces(
    displayOptions.percentDecimalPlaces,
    1,
  );

  return (params: unknown) => {
    const name = getFormatterName(params);
    const value = formatChartValue(getFormatterValue(params), valueDecimals);
    const percent = formatChartPercent(
      getFormatterPercent(params),
      percentDecimals,
    );

    if (displayOptions.labelMode === "name") return name;
    if (displayOptions.labelMode === "percent") return percent;
    if (displayOptions.labelMode === "name_percent") return `${name} ${percent}`;
    if (displayOptions.labelMode === "name_value") return `${name}: ${value}`;

    return value;
  };
}

function getCartesianLabelFormatter(displayOptions: ChartDisplayOptions) {
  const valueDecimals = getSafeDecimalPlaces(
    displayOptions.valueDecimalPlaces,
    2,
  );

  return (params: unknown) => {
    const name = getFormatterName(params);
    const value = formatChartValue(getFormatterValue(params), valueDecimals);

    if (displayOptions.labelMode === "name") return name;
    if (displayOptions.labelMode === "name_value") return `${name}: ${value}`;

    return value;
  };
}

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

function getStableSeriesName(config: ChartConfig) {
  if (config.chartType === "histogram") {
    return `Distribution of ${config.yColumn || "value"}`;
  }

  if (config.chartType === "scatter") {
    return `${config.yColumn || "Y"} vs ${config.xColumn || "X"}`;
  }

  if (config.aggregation === "count") {
    return `Count by ${config.xColumn || "group"}`;
  }

  return `${config.aggregation} of ${config.yColumn || "value"}`;
}

function getChartImageDataUrl({
  chart,
  backgroundColor,
  pixelRatio = 2,
}: {
  chart: EChartsInstanceLike;
  backgroundColor: string;
  pixelRatio?: number;
}) {
  return chart.getDataURL({
    type: "png",
    pixelRatio,
    backgroundColor,
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load chart image."));
    image.src = src;
  });
}

function trimCanvasText({
  context,
  text,
  maxWidth,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
}) {
  if (context.measureText(text).width <= maxWidth) return text;

  let trimmed = text;

  while (
    trimmed.length > 0 &&
    context.measureText(`${trimmed}…`).width > maxWidth
  ) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}…`;
}

function wrapCanvasText({
  context,
  text,
  maxWidth,
  maxLines,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
  maxLines: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(trimCanvasText({ context, text: word, maxWidth }));
      currentLine = "";
    }

    if (lines.length === maxLines) break;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  const originalText = words.join(" ");
  const joinedLines = lines.join(" ");

  if (lines.length === maxLines && joinedLines.length < originalText.length) {
    const lastIndex = lines.length - 1;

    lines[lastIndex] = trimCanvasText({
      context,
      text: `${lines[lastIndex]}…`,
      maxWidth,
    });
  }

  return lines.slice(0, maxLines);
}

async function composeChartImageWithTitle({
  chartDataUrl,
  title,
  titlePosition,
  chartTheme,
}: {
  chartDataUrl: string;
  title: string;
  titlePosition: TitlePosition;
  chartTheme: ChartThemeTokens;
}) {
  const chartImage = await loadImage(chartDataUrl);
  const chartWidth = chartImage.naturalWidth || chartImage.width;
  const chartHeight = chartImage.naturalHeight || chartImage.height;

  const cleanTitle = title.trim();
  const headerHeight = cleanTitle ? 112 : 0;

  const canvas = document.createElement("canvas");

  canvas.width = chartWidth;
  canvas.height = chartHeight + headerHeight;

  const context = canvas.getContext("2d");

  if (!context) return chartDataUrl;

  context.fillStyle = chartTheme.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (headerHeight > 0) {
    const horizontalPadding = 44;
    const maxTextWidth = chartWidth - horizontalPadding * 2;
    const x =
      titlePosition === "center"
        ? chartWidth / 2
        : titlePosition === "right"
          ? chartWidth - horizontalPadding
          : horizontalPadding;

    context.fillStyle = chartTheme.foreground;
    context.font = "700 30px Inter, ui-sans-serif, system-ui, sans-serif";
    context.textBaseline = "top";
    context.textAlign = titlePosition;

    const titleLines = wrapCanvasText({
      context,
      text: cleanTitle,
      maxWidth: maxTextWidth,
      maxLines: 2,
    });

    const startY = titleLines.length > 1 ? 24 : 40;

    titleLines.forEach((line, index) => {
      context.fillText(line, x, startY + index * 34);
    });
  }

  context.drawImage(chartImage, 0, headerHeight);

  return canvas.toDataURL("image/png", 1);
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

  const valueDecimals = getSafeDecimalPlaces(
    displayOptions.valueDecimalPlaces,
    2,
  );
  const percentDecimals = getSafePercentDecimalPlaces(
    displayOptions.percentDecimalPlaces,
    1,
  );

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
      formatter: (params: unknown) => {
        const name = getFormatterName(params);
        const value = formatChartValue(
          getFormatterValue(params),
          valueDecimals,
        );
        const percent = formatChartPercent(
          getFormatterPercent(params),
          percentDecimals,
        );

        return `${name}<br />${value}${percent ? ` (${percent})` : ""}`;
      },
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
    valueFormatter: (value) => formatChartValue(value, valueDecimals),
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
    axisLabel: {
      ...getAxisLabelStyle(displayOptions, chartTheme),
      formatter: (value: unknown) =>
        formatChartValue(
          value,
          getSafeDecimalPlaces(displayOptions.valueDecimalPlaces, 2),
        ),
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
  formatter: (params: unknown) => string;
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
  formatter: (params: unknown) => string;
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
  const pieLabelFormatter = getPieLabelFormatter(displayOptions);
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
              formatter: pieLabelFormatter,
              position: labelPosition,
            }),
            overflow: "truncate",
            width: 140,
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
          formatter: (value: unknown) =>
            formatChartValue(
              value,
              getSafeDecimalPlaces(displayOptions.valueDecimalPlaces, 2),
            ),
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
            formatter: cartesianLabelFormatter,
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
  const saveChartToPackage = useExportPackageStore(
    (state) => state.saveChartToPackage,
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const titlePosition = getSafeTitlePosition(config.displayOptions.titlePosition);

  const echartsDisplayOptions = useMemo<ChartDisplayOptions>(() => {
    return {
      ...config.displayOptions,
      titlePosition: "left",
    };
  }, [
    config.displayOptions.showGrid,
    config.displayOptions.showTooltip,
    config.displayOptions.showLegend,
    config.displayOptions.showLabels,
    config.displayOptions.enableAnimation,
    config.displayOptions.showDataZoom,
    config.displayOptions.legendPosition,
    config.displayOptions.labelMode,
    config.displayOptions.valueDecimalPlaces,
    config.displayOptions.percentDecimalPlaces,
    config.displayOptions.axisLabelRotation,
    config.displayOptions.axisFontSize,
    config.displayOptions.truncateAxisLabels,
    config.displayOptions.chartPadding,
    config.displayOptions.smoothLines,
    config.displayOptions.lineWidth,
    config.displayOptions.pointSize,
    config.displayOptions.areaOpacity,
    config.displayOptions.barWidth,
    config.displayOptions.barRadius,
    config.displayOptions.pieInnerRadius,
    config.displayOptions.pieOuterRadius,
    config.displayOptions.pieMinAngle,
    config.displayOptions.pieRoseType,
    config.displayOptions.pieLabelPosition,
  ]);

  const chartConfigForOption = useMemo<ChartConfig>(() => {
    return {
      ...config,
      title: getStableSeriesName(config),
      displayOptions: echartsDisplayOptions,
    };
  }, [
    config.chartType,
    config.xColumn,
    config.yColumn,
    config.aggregation,
    config.topN,
    echartsDisplayOptions,
  ]);

  const compatibilityMessage = useMemo(() => {
    return getCompatibilityMessage({
      config: chartConfigForOption,
      numericColumns,
      groupableColumns,
    });
  }, [chartConfigForOption, numericColumns, groupableColumns]);

  const chartData = useMemo(() => {
    if (compatibilityMessage) return [];

    if (chartConfigForOption.chartType === "scatter") {
      return buildScatterData(rows, chartConfigForOption);
    }

    if (chartConfigForOption.chartType === "histogram") {
      return buildHistogramData(rows, chartConfigForOption);
    }

    return buildGroupedData(rows, chartConfigForOption);
  }, [rows, chartConfigForOption, compatibilityMessage]);

  const chartOption = useMemo(() => {
    return buildChartOption({
      config: chartConfigForOption,
      chartData,
      chartTheme,
    });
  }, [chartConfigForOption, chartData, chartTheme]);

  async function getCurrentChartDataUrl() {
    const chart = chartInstanceRef.current?.getEchartsInstance();

    if (!chart || chartData.length === 0) return "";

    const rawChartDataUrl = getChartImageDataUrl({
      chart,
      backgroundColor: chartTheme.background,
      pixelRatio: 2,
    });

    return composeChartImageWithTitle({
      chartDataUrl: rawChartDataUrl,
      title: config.title || "Chart",
      titlePosition,
      chartTheme,
    });
  }

  async function downloadPng() {
    const dataUrl = await getCurrentChartDataUrl();

    if (!dataUrl) return;

    const link = document.createElement("a");
    link.download = `${config.title || "cleanframe-chart"}.png`;
    link.href = dataUrl;
    link.click();
  }

  async function saveToPackage() {
    const dataUrl = await getCurrentChartDataUrl();

    if (!dataUrl) return;

    saveChartToPackage({
      id: crypto.randomUUID(),
      title: config.title || "Untitled chart",
      chartType: config.chartType,
      savedAt: new Date().toISOString(),
      config: structuredClone(config),
      imageDataUrl: dataUrl,
    });

    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1400);
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
      notMerge={false}
      replaceMerge={[
        "series",
        "xAxis",
        "yAxis",
        "grid",
        "dataZoom",
        "legend",
      ]}
      lazyUpdate
      opts={{ renderer: "canvas" }}
      style={{ width: "100%", height: "100%" }}
      className="h-full w-full"
    />
  );
}

  return (
    <section className="flex h-full min-h-[520px] min-w-0 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-1 pb-3">
        <div className={cn("min-w-0", getTitleAlignmentClass(titlePosition))}>
          <h3 className="truncate !text-[13px] font-bold leading-5 text-foreground">
            {config.title || "Chart"}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void saveToPackage()}
            disabled={Boolean(compatibilityMessage) || chartData.length === 0}
            className="h-8 rounded-xl px-3 !text-[13px]"
          >
            {savedFlash ? (
              <Check className="mr-1.5 size-3.5" />
            ) : (
              <Archive className="mr-1.5 size-3.5" />
            )}
            {savedFlash ? "Saved" : "Save to package"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => void downloadPng()}
            disabled={Boolean(compatibilityMessage) || chartData.length === 0}
            className="h-8 rounded-xl px-3 !text-[13px]"
          >
            <Download className="mr-1.5 size-3.5" />
            PNG
          </Button>
        </div>
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