"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  Archive,
  BarChart3,
  Check,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  GitBranch,
  Loader2,
  PackageCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useExportPackageStore,
  type SavedChartArtifact,
} from "@/store/exportPackageStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

type ExportOptions = {
  includeCleanedCsv: boolean;
  includeCleanedJson: boolean;
  includeSchemaProfile: boolean;
  includeColumnSummary: boolean;
  includeHistory: boolean;
  includeSavedCharts: boolean;
};

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeCleanedCsv: true,
  includeCleanedJson: true,
  includeSchemaProfile: true,
  includeColumnSummary: true,
  includeHistory: true,
  includeSavedCharts: true,
};

function sanitizeFileName(value: string) {
  const cleanName = value
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return cleanName || "cleanframe-export";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) return "";

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes("\r") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function rowsToCsv({
  rows,
  fields,
}: {
  rows: Record<string, unknown>[];
  fields: string[];
}) {
  const header = fields.map(escapeCsvCell).join(",");

  const body = rows
    .map((row) => fields.map((field) => escapeCsvCell(row[field])).join(","))
    .join("\n");

  return `${header}\n${body}`;
}

function columnSummaryToCsv(columns: unknown[]) {
  const fields = [
    "name",
    "type",
    "missingCount",
    "missingRate",
    "uniqueCount",
    "uniqueRate",
    "outlierCount",
    "sampleValues",
  ];

  const rows = columns.map((column) => {
    const record = column as Record<string, unknown>;
    const outliers = record.outliers as Record<string, unknown> | undefined;

    return {
      name: record.name,
      type: record.type,
      missingCount: record.missingCount,
      missingRate: record.missingRate,
      uniqueCount: record.uniqueCount,
      uniqueRate: record.uniqueRate,
      outlierCount:
        record.outlierCount ??
        outliers?.count ??
        (Array.isArray(outliers?.values) ? outliers.values.length : ""),
      sampleValues: Array.isArray(record.sampleValues)
        ? record.sampleValues.join(" | ")
        : "",
    };
  });

  return rowsToCsv({
    rows,
    fields,
  });
}

function dataUrlToBase64(dataUrl: string) {
  return dataUrl.split(",")[1] ?? "";
}

function getPackageFileName(datasetName: string) {
  const timestamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replace(/\.\d{3}Z$/, "");

  return `${sanitizeFileName(datasetName)}-cleanframe-export-${timestamp}.zip`;
}

function getReadme({
  datasetName,
  rowCount,
  columnCount,
  includedCharts,
}: {
  datasetName: string;
  rowCount: number;
  columnCount: number;
  includedCharts: SavedChartArtifact[];
}) {
  return [
    "Cleanframe Export Package",
    "=========================",
    "",
    `Dataset: ${datasetName}`,
    `Rows: ${rowCount.toLocaleString()}`,
    `Columns: ${columnCount.toLocaleString()}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Package contents may include:",
    "- data/cleaned-data.csv",
    "- data/cleaned-data.json",
    "- schema/schema-profile.json",
    "- schema/column-summary.csv",
    "- history/workspace-history.json",
    "- charts/*.png",
    "- charts/chart-configs.json",
    "",
    `Saved charts included: ${includedCharts.length}`,
    ...includedCharts.map(
      (chart, index) =>
        `${index + 1}. ${chart.title} (${chart.chartType}) - saved ${formatDateTime(
          chart.savedAt,
        )}`,
    ),
    "",
    "Notes:",
    "- Chart images are exported as PNG files.",
    "- Chart configs are included as JSON so the analysis decisions are traceable.",
    "- No PDF export is included.",
  ].join("\n");
}

function ExportToggle({
  checked,
  title,
  description,
  icon: Icon,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  icon: typeof Database;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl p-3 text-left transition",
        checked ? "bg-primary/10" : "bg-muted/[0.18] hover:bg-muted/35",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-transparent",
        )}
      >
        <Check className="size-3.5" />
      </span>

      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background/75 text-muted-foreground">
        <Icon className="size-4" />
      </span>

      <span className="min-w-0">
        <span className="block !text-[13px] font-bold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block !text-[13px] leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

export function ExportPackagePanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const savedCharts = useExportPackageStore((state) => state.savedCharts);
  const removeSavedChart = useExportPackageStore(
    (state) => state.removeSavedChart,
  );
  const clearSavedCharts = useExportPackageStore(
    (state) => state.clearSavedCharts,
  );

  const [options, setOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS,
  );
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSelectedChartIds((current) => {
      const currentSet = new Set(current);
      const nextIds = savedCharts.map((chart) => chart.id);

      for (const id of nextIds) {
        if (!currentSet.has(id)) {
          currentSet.add(id);
        }
      }

      return [...currentSet].filter((id) => nextIds.includes(id));
    });
  }, [savedCharts]);

  const selectedCharts = useMemo(() => {
    const selectedSet = new Set(selectedChartIds);

    return savedCharts.filter((chart) => selectedSet.has(chart.id));
  }, [savedCharts, selectedChartIds]);

  const hasAnyContent =
    options.includeCleanedCsv ||
    options.includeCleanedJson ||
    options.includeSchemaProfile ||
    options.includeColumnSummary ||
    options.includeHistory ||
    (options.includeSavedCharts && selectedCharts.length > 0);

  function updateOption<K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K],
  ) {
    setOptions((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleChart(chartId: string) {
    setSelectedChartIds((current) => {
      if (current.includes(chartId)) {
        return current.filter((id) => id !== chartId);
      }

      return [...current, chartId];
    });
  }

  async function downloadPackage() {
    if (!workspace || !hasAnyContent) return;

    setIsExporting(true);

    try {
      const zip = new JSZip();
      const datasetName = workspace.file.name;
      const rows = workspace.workingRows as Record<string, unknown>[];
      const fields = workspace.fields;

      if (options.includeCleanedCsv) {
        zip.file(
          "data/cleaned-data.csv",
          rowsToCsv({
            rows,
            fields,
          }),
        );
      }

      if (options.includeCleanedJson) {
        zip.file("data/cleaned-data.json", JSON.stringify(rows, null, 2));
      }

      if (options.includeSchemaProfile) {
        zip.file(
          "schema/schema-profile.json",
          JSON.stringify(workspace.profile, null, 2),
        );
      }

      if (options.includeColumnSummary) {
        zip.file(
          "schema/column-summary.csv",
          columnSummaryToCsv(workspace.profile.columns),
        );
      }

      if (options.includeHistory) {
        zip.file(
          "history/workspace-history.json",
          JSON.stringify(workspace.history ?? [], null, 2),
        );
      }

      if (options.includeSavedCharts && selectedCharts.length > 0) {
        const chartConfigs = selectedCharts.map((chart, index) => {
          const chartFileName = `${String(index + 1).padStart(
            2,
            "0",
          )}-${sanitizeFileName(chart.title)}.png`;

          zip.file(
            `charts/${chartFileName}`,
            dataUrlToBase64(chart.imageDataUrl),
            {
              base64: true,
            },
          );

          return {
            id: chart.id,
            title: chart.title,
            chartType: chart.chartType,
            savedAt: chart.savedAt,
            fileName: chartFileName,
            config: chart.config,
          };
        });

        zip.file(
          "charts/chart-configs.json",
          JSON.stringify(chartConfigs, null, 2),
        );
      }

      zip.file(
        "README.txt",
        getReadme({
          datasetName,
          rowCount: workspace.profile.rowCount,
          columnCount: workspace.profile.columnCount,
          includedCharts: options.includeSavedCharts ? selectedCharts : [],
        }),
      );

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = getPackageFileName(datasetName);
      link.click();

      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="shrink-0 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/45 text-foreground">
              <Archive className="size-4" />
            </span>

            <div className="min-w-0">
              <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">
                Export package
              </h2>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Create a ZIP package with the current dataset, schema, history,
                and charts saved from the Charts module.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={downloadPackage}
            disabled={!hasAnyContent || isExporting}
            className="h-8 rounded-xl px-3 !text-[13px]"
          >
            {isExporting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 size-3.5" />
            )}
            Download ZIP
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
            <section className="rounded-2xl bg-background/75 p-4 shadow-sm">
              <h3 className="!text-[13px] font-bold text-foreground">
                Package contents
              </h3>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Choose what should be included in the final ZIP.
              </p>

              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                <ExportToggle
                  checked={options.includeCleanedCsv}
                  title="Current data grid CSV"
                  description="Export the current working dataset as cleaned-data.csv."
                  icon={FileSpreadsheet}
                  onChange={(checked) =>
                    updateOption("includeCleanedCsv", checked)
                  }
                />

                <ExportToggle
                  checked={options.includeCleanedJson}
                  title="Current data grid JSON"
                  description="Export the current working dataset as cleaned-data.json."
                  icon={FileJson}
                  onChange={(checked) =>
                    updateOption("includeCleanedJson", checked)
                  }
                />

                <ExportToggle
                  checked={options.includeSchemaProfile}
                  title="Schema profile"
                  description="Include column types, quality score, missing values, and profile metadata."
                  icon={Database}
                  onChange={(checked) =>
                    updateOption("includeSchemaProfile", checked)
                  }
                />

                <ExportToggle
                  checked={options.includeColumnSummary}
                  title="Column summary CSV"
                  description="Include a compact CSV summary of the column profile."
                  icon={FileSpreadsheet}
                  onChange={(checked) =>
                    updateOption("includeColumnSummary", checked)
                  }
                />

                <ExportToggle
                  checked={options.includeHistory}
                  title="Workspace history"
                  description="Include restore points and change history as JSON."
                  icon={GitBranch}
                  onChange={(checked) =>
                    updateOption("includeHistory", checked)
                  }
                />

                <ExportToggle
                  checked={options.includeSavedCharts}
                  title="Saved charts"
                  description="Include selected chart PNGs and their chart configurations."
                  icon={BarChart3}
                  onChange={(checked) =>
                    updateOption("includeSavedCharts", checked)
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl bg-background/75 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="!text-[13px] font-bold text-foreground">
                    Saved charts
                  </h3>
                  <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                    Charts appear here after you click Save to package in the
                    Charts module.
                  </p>
                </div>

                {savedCharts.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearSavedCharts}
                    className="h-8 rounded-xl px-3 !text-[13px]"
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Clear charts
                  </Button>
                ) : null}
              </div>

              {savedCharts.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-muted/[0.18] p-6 text-center">
                  <BarChart3 className="mx-auto size-7 text-muted-foreground" />
                  <p className="mt-3 !text-[13px] font-bold text-foreground">
                    No charts saved yet
                  </p>
                  <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                    Go to Charts, configure a useful visual, then click Save to
                    package.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {savedCharts.map((chart) => {
                    const selected = selectedChartIds.includes(chart.id);

                    return (
                      <div
                        key={chart.id}
                        className={cn(
                          "grid gap-3 rounded-2xl p-3 transition md:grid-cols-[minmax(0,1fr)_220px_auto]",
                          selected
                            ? "bg-primary/10"
                            : "bg-muted/[0.18] hover:bg-muted/35",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleChart(chart.id)}
                          className="flex min-w-0 items-start gap-3 text-left"
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-transparent",
                            )}
                          >
                            <Check className="size-3.5" />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate !text-[13px] font-bold text-foreground">
                              {chart.title}
                            </span>
                            <span className="mt-0.5 block !text-[13px] text-muted-foreground">
                              {chart.chartType} · saved{" "}
                              {formatDateTime(chart.savedAt)}
                            </span>
                          </span>
                        </button>

                        <div className="overflow-hidden rounded-xl bg-background/70">
                          <img
                            src={chart.imageDataUrl}
                            alt={chart.title}
                            className="h-28 w-full object-contain"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeSavedChart(chart.id)}
                          className="h-8 rounded-xl px-3 !text-[13px]"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-2xl bg-background/75 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PackageCheck className="size-4" />
                </span>

                <div>
                  <h3 className="!text-[13px] font-bold text-foreground">
                    Package summary
                  </h3>
                  <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                    Review what will be included before downloading.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <SummaryRow
                  label="Dataset"
                  value={workspace.file.name}
                />
                <SummaryRow
                  label="Rows"
                  value={workspace.profile.rowCount.toLocaleString()}
                />
                <SummaryRow
                  label="Columns"
                  value={workspace.profile.columnCount.toLocaleString()}
                />
                <SummaryRow
                  label="Selected charts"
                  value={String(
                    options.includeSavedCharts ? selectedCharts.length : 0,
                  )}
                />
                <SummaryRow
                  label="History points"
                  value={String(workspace.history?.length ?? 0)}
                />
              </div>
            </section>

            <section className="rounded-2xl bg-background/75 p-4 shadow-sm">
              <h3 className="!text-[13px] font-bold text-foreground">
                ZIP structure
              </h3>

              <pre className="mt-3 overflow-auto rounded-2xl bg-muted/[0.2] p-3 !text-[12px] leading-5 text-muted-foreground">
{`cleanframe-export/
├── data/
├── schema/
├── history/
├── charts/
└── README.txt`}
              </pre>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-muted/[0.18] px-3 py-2">
      <span className="shrink-0 !text-[13px] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 truncate text-right !text-[13px] font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}