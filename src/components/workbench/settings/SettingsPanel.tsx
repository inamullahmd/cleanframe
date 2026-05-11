"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Database, RotateCcw, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StorageConsentDialog } from "@/components/workbench/settings/StorageConsentDialog";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { clearPersistedWorkspaceSession } from "@/lib/persistence/workspaceSession";
import { DELIMITER_OPTIONS, getDelimiterDisplay } from "@/lib/settings/delimiter";
import { resetCleanframeSettings } from "@/lib/settings/cleanframeSettings";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { DEFAULT_OUTLIER_CONFIG, type OutlierDetectionMethod } from "@/types/outlier";
import { CSV_ENCODINGS, DEFAULT_CSV_ENCODING, type CsvEncoding } from "@/types/settings";
import type {
  CasingCleanup,
  ChartAggregation,
  ChartColumnPool,
  ChartType,
  CleanframeSettings,
  ColumnNameFormat,
  CsvDelimiter,
  DateParsingMode,
  DetectionStrictness,
  DuplicateColumnStrategy,
  DuplicateHandling,
  ExportFormat,
  ExportScale,
  FileNamingPattern,
  LandingModule,
  MaxHistoryPoints,
  NumberParsingMode,
  PageSize,
  ProfileSampleSize,
  RowDensity,
  ValueDisplayMode,
} from "@/types/cleanframeSettings";

const sections = [
  ["import", "CSV & Import", "Encoding and parsing"],
  ["columnNames", "Column Names", "Naming defaults"],
  ["profiling", "Data Profiling", "Types and outliers"],
  ["dataGrid", "Data Grid", "Table defaults"],
  ["cleaning", "Cleaning", "Cleanup behavior"],
  ["charts", "Charts", "Chart defaults"],
  ["history", "History", "Restore behavior"],
  ["export", "Export Package", "Package defaults"],
  ["workspace", "Workspace", "Persistence"],
] as const;

type SettingsSection = (typeof sections)[number][0];

type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

const DATE_MODE_OPTIONS: SelectOption<DateParsingMode>[] = [
  { value: "auto", label: "Auto" },
  { value: "us", label: "US: MM/DD/YYYY" },
  { value: "iso", label: "ISO: YYYY-MM-DD" },
  { value: "eu", label: "EU: DD/MM/YYYY" },
];

const NUMBER_MODE_OPTIONS: SelectOption<NumberParsingMode>[] = [
  { value: "balanced", label: "Balanced" },
  { value: "strict", label: "Strict" },
  { value: "aggressive", label: "Aggressive" },
];

const COLUMN_NAME_OPTIONS: SelectOption<ColumnNameFormat>[] = [
  { value: "original", label: "Keep original" },
  { value: "title_case_spaces", label: "Title Case + Spaces" },
  { value: "snake_case", label: "snake_case" },
  { value: "camel_case", label: "camelCase" },
  { value: "lowercase_spaces", label: "lowercase + spaces" },
];

const DUPLICATE_COLUMN_OPTIONS: SelectOption<DuplicateColumnStrategy>[] = [
  { value: "append_suffix", label: "Append suffix" },
  { value: "keep_first", label: "Keep first" },
  { value: "make_unique", label: "Make unique names" },
];

const SAMPLE_SIZE_OPTIONS: SelectOption<ProfileSampleSize>[] = [
  { value: "full", label: "Full dataset" },
  { value: "5000", label: "First 5,000 rows" },
  { value: "10000", label: "First 10,000 rows" },
  { value: "25000", label: "First 25,000 rows" },
];

const STRICTNESS_OPTIONS: SelectOption<DetectionStrictness>[] = [
  { value: "strict", label: "Strict" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
];

const VALUE_DISPLAY_OPTIONS: SelectOption<ValueDisplayMode>[] = [
  { value: "formatted", label: "Formatted values" },
  { value: "raw", label: "Raw CSV values" },
];

const ROW_DENSITY_OPTIONS: SelectOption<RowDensity>[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

const PAGE_SIZE_OPTIONS: SelectOption<PageSize>[] = [
  { value: "10", label: "10 rows" },
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
];

const CHART_TYPE_OPTIONS: SelectOption<ChartType>[] = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "scatter", label: "Scatter" },
  { value: "histogram", label: "Histogram" },
];

const AGGREGATION_OPTIONS: SelectOption<ChartAggregation>[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "median", label: "Median" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

const COLUMN_POOL_OPTIONS: SelectOption<ChartColumnPool>[] = [
  { value: "recommended", label: "Recommended" },
  { value: "categorical", label: "Category only" },
  { value: "boolean", label: "Boolean only" },
  { value: "numeric", label: "Numeric only" },
  { value: "date_time", label: "Date & Time" },
  { value: "all_columns", label: "All columns" },
];

const EXPORT_SCALE_OPTIONS: SelectOption<ExportScale>[] = [
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "3", label: "3x" },
];

const DUPLICATE_HANDLING_OPTIONS: SelectOption<DuplicateHandling>[] = [
  { value: "keep_first", label: "Keep first" },
  { value: "keep_last", label: "Keep last" },
  { value: "mark_only", label: "Mark only" },
];

const CASING_CLEANUP_OPTIONS: SelectOption<CasingCleanup>[] = [
  { value: "none", label: "None" },
  { value: "title_case", label: "Title Case" },
  { value: "lowercase", label: "lowercase" },
  { value: "uppercase", label: "UPPERCASE" },
];

const HISTORY_LIMIT_OPTIONS: SelectOption<MaxHistoryPoints>[] = [
  { value: "25", label: "25 points" },
  { value: "50", label: "50 points" },
  { value: "100", label: "100 points" },
];

const EXPORT_FORMAT_OPTIONS: SelectOption<ExportFormat>[] = [
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
];

const FILE_NAME_OPTIONS: SelectOption<FileNamingPattern>[] = [
  { value: "dataset_timestamp", label: "Dataset + timestamp" },
  { value: "dataset_only", label: "Dataset name only" },
  { value: "cleanframe_timestamp", label: "Cleanframe + timestamp" },
];

const LANDING_MODULE_OPTIONS: SelectOption<LandingModule>[] = [
  { value: "schema", label: "Schema" },
  { value: "data", label: "Data" },
  { value: "clean", label: "Clean" },
  { value: "history", label: "History" },
  { value: "charts", label: "Charts" },
  { value: "export", label: "Export Package" },
];

const OUTLIER_METHOD_OPTIONS: SelectOption<OutlierDetectionMethod>[] = [
  { value: "iqr", label: "IQR" },
  { value: "z_score", label: "Z-score" },
  { value: "modified_z_score", label: "Modified Z-score" },
  { value: "percentile", label: "Percentile bounds" },
  { value: "std_dev", label: "Standard deviation" },
  { value: "domain_rules", label: "Domain rules" },
  { value: "isolation_forest", label: "Isolation Forest" },
];

function clampGridTextSize(value: number) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(16, Math.max(10, Math.round(value)));
}

export function SettingsPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const updateOutlierConfig = useWorkspaceStore((state) => state.updateOutlierConfig);
  const updateCsvEncoding = useWorkspaceStore((state) => state.updateCsvEncoding);
  const { settings, hydrated, updateSettings, saveSettings } = useCleanframeSettings();

  const [activeSection, setActiveSection] = useState<SettingsSection>("workspace");
  const [showStorageConsent, setShowStorageConsent] = useState(false);
  const [status, setStatus] = useState("");

  const activeMeta = sections.find(([id]) => id === activeSection) ?? sections[0];

  const summary = useMemo(
    () => ({
      rows: workspace?.profile.rowCount ?? 0,
      columns: workspace?.profile.columnCount ?? 0,
      delimiter: getDelimiterDisplay(settings),
      encoding: csvEncoding,
    }),
    [workspace, settings, csvEncoding],
  );

  function flash(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 1800);
  }

  function update(partial: Partial<CleanframeSettings>) {
    updateSettings(partial);
  }

  function handleSessionToggle(nextValue: boolean) {
    if (nextValue) {
      setShowStorageConsent(true);
      return;
    }

    update({ persistWorkspaceLocally: false });
    void clearPersistedWorkspaceSession();
    flash("Saved session cleared");
  }

  function resetAllSettings() {
    const defaults = resetCleanframeSettings();
    saveSettings(defaults);
    updateCsvEncoding(DEFAULT_CSV_ENCODING);
    updateOutlierConfig(DEFAULT_OUTLIER_CONFIG);
    flash("Defaults restored");
  }

  if (!hydrated) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <StorageConsentDialog
        open={showStorageConsent}
        onCancel={() => setShowStorageConsent(false)}
        onAccept={() => {
          update({ persistWorkspaceLocally: true, autoSaveWorkspaceState: true });
          setShowStorageConsent(false);
          flash("Session saving enabled");
        }}
      />

      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/45 text-foreground">
            <Settings className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">Settings</h2>
            <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
              Preferences update immediately and sync with the top bar and workspace modules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status ? (
            <span className="rounded-xl bg-primary/10 px-3 py-1.5 !text-[12px] font-bold text-primary">
              {status}
            </span>
          ) : null}
          <Button type="button" variant="outline" onClick={resetAllSettings} className="h-8 rounded-xl px-3 !text-[13px]">
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset all
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-auto rounded-2xl bg-muted/[0.12] p-2">
            <div className="grid gap-2">
              {sections.map(([id, title, description], index) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "flex items-start gap-2 rounded-xl px-3 py-2 text-left transition",
                    activeSection === id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                  )}
                >
                  <span className="mt-0.5 !text-[11px] font-bold text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate !text-[13px] font-bold">{title}</span>
                    <span className="mt-0.5 block truncate !text-[12px]">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-h-0 overflow-auto rounded-2xl bg-muted/[0.08] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="!text-[13px] font-bold text-foreground">{activeMeta[1]}</h3>
                <p className="mt-1 !text-[13px] text-muted-foreground">{activeMeta[2]}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SummaryPill label="Rows" value={summary.rows} />
                <SummaryPill label="Columns" value={summary.columns} />
                <SummaryPill label="Delimiter" value={summary.delimiter} />
                <SummaryPill label="Encoding" value={summary.encoding} />
              </div>
            </div>

            {activeSection === "import" ? (
              <SettingsCard title="CSV parsing" description="Controls used by the next uploaded CSV file.">
                <SelectRow
                  title="Encoding"
                  description="Used when reading future uploaded CSV files."
                  value={csvEncoding}
                  options={CSV_ENCODINGS.map((item) => ({ value: item.value, label: item.label }))}
                  onChange={(value) => updateCsvEncoding(value as CsvEncoding)}
                />
                <SelectRow
                  title="Delimiter"
                  description="Choose a built-in delimiter or provide your own multi-character delimiter."
                  value={settings.delimiter}
                  options={DELIMITER_OPTIONS.map((item) => ({ value: item.value, label: `${item.label} ${item.value === "auto" || item.value === "custom" ? "" : `(${item.symbol})`}` }))}
                  onChange={(value) => update({ delimiter: value as CsvDelimiter })}
                />
                {settings.delimiter === "custom" ? (
                  <TextSetting
                    label="Custom delimiter"
                    description="Can be one or many characters, for example ::, ||, ~|~, or ###."
                    value={settings.customDelimiter}
                    placeholder="Enter delimiter"
                    onChange={(value) => update({ customDelimiter: value })}
                  />
                ) : null}
                <ToggleRow title="Header row" description="First row contains column names." checked={settings.hasHeaderRow} onChange={(value) => update({ hasHeaderRow: value })} />
                <ToggleRow title="Trim cells" description="Remove surrounding whitespace during import." checked={settings.trimCellsOnImport} onChange={(value) => update({ trimCellsOnImport: value })} />
                <TextSetting label="Empty value tokens" description="Comma-separated tokens treated as missing values." value={settings.emptyValueTokens} onChange={(value) => update({ emptyValueTokens: value })} />
                <SelectRow title="Date parsing" description="Preferred date parsing mode." value={settings.dateParsingMode} options={DATE_MODE_OPTIONS} onChange={(value) => update({ dateParsingMode: value })} />
                <SelectRow title="Number parsing" description="How strict numeric detection should be." value={settings.numberParsingMode} options={NUMBER_MODE_OPTIONS} onChange={(value) => update({ numberParsingMode: value })} />
              </SettingsCard>
            ) : null}

            {activeSection === "columnNames" ? (
              <SettingsCard title="Column name defaults" description="Applies during upload when automatic column cleanup is enabled.">
                <ToggleRow title="Auto-clean column names" description="Normalize imported headers automatically." checked={settings.autoCleanColumnNames} onChange={(value) => update({ autoCleanColumnNames: value })} />
                <SelectRow title="Name format" description="Target format for cleaned names." value={settings.columnNameFormat} options={COLUMN_NAME_OPTIONS} onChange={(value) => update({ columnNameFormat: value })} />
                <ToggleRow title="Replace underscores" description="Convert underscores to spaces before formatting." checked={settings.replaceUnderscores} onChange={(value) => update({ replaceUnderscores: value })} />
                <ToggleRow title="Remove special characters" description="Remove punctuation and symbols from column names." checked={settings.removeSpecialCharacters} onChange={(value) => update({ removeSpecialCharacters: value })} />
                <SelectRow title="Duplicate column names" description="How to handle repeated names after cleanup." value={settings.duplicateColumnStrategy} options={DUPLICATE_COLUMN_OPTIONS} onChange={(value) => update({ duplicateColumnStrategy: value })} />
              </SettingsCard>
            ) : null}

            {activeSection === "profiling" ? (
              <SettingsCard title="Profiling defaults" description="Controls schema inference and outlier detection.">
                <SelectRow title="Profile sample size" description="Rows used for type and quality profiling." value={settings.profileSampleSize} options={SAMPLE_SIZE_OPTIONS} onChange={(value) => update({ profileSampleSize: value })} />
                <ToggleRow title="Detect ID columns" description="Infer ID-like columns instead of treating them as ordinary numeric fields." checked={settings.detectIdColumns} onChange={(value) => update({ detectIdColumns: value })} />
                <SelectRow title="Numeric detection" description="Strictness for numeric type inference." value={settings.numericDetectionStrictness} options={STRICTNESS_OPTIONS} onChange={(value) => update({ numericDetectionStrictness: value })} />
                <SelectRow title="Date detection" description="Strictness for date and time inference." value={settings.dateDetectionStrictness} options={STRICTNESS_OPTIONS} onChange={(value) => update({ dateDetectionStrictness: value })} />
                <SelectRow title="Outlier method" description="Algorithm used for numeric outlier flags." value={outlierConfig.method} options={OUTLIER_METHOD_OPTIONS} onChange={(value) => updateOutlierConfig({ method: value as OutlierDetectionMethod })} />
                {outlierConfig.method === "iqr" ? (
                  <NumberSetting label="IQR multiplier" description="Higher values flag fewer outliers." value={outlierConfig.iqrMultiplier} min={0.5} max={5} step={0.1} onChange={(value) => updateOutlierConfig({ iqrMultiplier: value })} />
                ) : null}
              </SettingsCard>
            ) : null}

            {activeSection === "dataGrid" ? (
              <SettingsCard title="Data grid defaults" description="Controls the table view.">
                <SelectRow title="Value display" description="Default value mode for table cells." value={settings.defaultValueDisplay} options={VALUE_DISPLAY_OPTIONS} onChange={(value) => update({ defaultValueDisplay: value })} />
                <SelectRow title="Row density" description="Default row height and spacing." value={settings.rowDensity} options={ROW_DENSITY_OPTIONS} onChange={(value) => update({ rowDensity: value })} />
                <SelectRow title="Page size" description="Default rows per page." value={settings.defaultPageSize} options={PAGE_SIZE_OPTIONS} onChange={(value) => update({ defaultPageSize: value })} />
                <NumberSetting label="Text size" description="Default table text size." value={settings.defaultGridTextSize} min={10} max={16} step={1} onChange={(value) => update({ defaultGridTextSize: clampGridTextSize(value) })} />
                <NumberSetting label="Number decimals" description="Default decimal places for decimal and number columns." value={settings.numberDecimalPlaces} min={0} max={6} step={1} onChange={(value) => update({ numberDecimalPlaces: Math.min(6, Math.max(0, Math.round(value))) })} />
                <NumberSetting label="Currency decimals" description="Decimal places for currency columns." value={settings.currencyDecimalPlaces} min={0} max={6} step={1} onChange={(value) => update({ currencyDecimalPlaces: Math.min(6, Math.max(0, Math.round(value))) })} />
                <NumberSetting label="Percentage decimals" description="Decimal places for percentage columns." value={settings.percentageDecimalPlaces} min={0} max={6} step={1} onChange={(value) => update({ percentageDecimalPlaces: Math.min(6, Math.max(0, Math.round(value))) })} />
                <NumberSetting label="Coordinate decimals" description="Decimal places for latitude and longitude columns." value={settings.coordinateDecimalPlaces} min={0} max={8} step={1} onChange={(value) => update({ coordinateDecimalPlaces: Math.min(8, Math.max(0, Math.round(value))) })} />
                <TextSetting label="Currency code" description="ISO currency code used for formatted currency columns." value={settings.currencyCode} onChange={(value) => update({ currencyCode: value.trim().toUpperCase() || "USD" })} />
                <TextSetting label="True tokens" description="Comma-separated values treated as boolean true." value={settings.trueValueTokens} onChange={(value) => update({ trueValueTokens: value })} />
                <TextSetting label="False tokens" description="Comma-separated values treated as boolean false." value={settings.falseValueTokens} onChange={(value) => update({ falseValueTokens: value })} />
                <ToggleRow title="Highlight missing values" description="Show missing cells with visual emphasis." checked={settings.highlightMissingValues} onChange={(value) => update({ highlightMissingValues: value })} />
                <ToggleRow title="Highlight outliers" description="Show outlier cells with visual emphasis." checked={settings.highlightOutliers} onChange={(value) => update({ highlightOutliers: value })} />
                <ToggleRow title="Sticky header" description="Keep table headers visible while scrolling." checked={settings.stickyTableHeader} onChange={(value) => update({ stickyTableHeader: value })} />
                <ToggleRow title="Row numbers" description="Show row index column." checked={settings.showRowNumbers} onChange={(value) => update({ showRowNumbers: value })} />
              </SettingsCard>
            ) : null}

            {activeSection === "cleaning" ? (
              <SettingsCard title="Cleaning behavior" description="Controls cleaning tools and confirmation behavior.">
                <SelectRow title="Duplicate handling" description="Default duplicate row behavior." value={settings.duplicateHandling} options={DUPLICATE_HANDLING_OPTIONS} onChange={(value) => update({ duplicateHandling: value })} />
                <ToggleRow title="Whitespace cleanup" description="Trim and normalize repeated whitespace." checked={settings.whitespaceCleanup} onChange={(value) => update({ whitespaceCleanup: value })} />
                <ToggleRow title="Text normalization" description="Normalize common text inconsistencies." checked={settings.textNormalization} onChange={(value) => update({ textNormalization: value })} />
                <SelectRow title="Casing cleanup" description="Default casing action for text cleanup." value={settings.casingCleanup} options={CASING_CLEANUP_OPTIONS} onChange={(value) => update({ casingCleanup: value })} />
                <TextSetting label="Unknown fill value" description="Value used by Fill Unknown in the Clean module." value={settings.defaultUnknownFillValue} onChange={(value) => update({ defaultUnknownFillValue: value })} />
                <ToggleRow title="History before cleaning" description="Create a restore point before applying cleaning changes." checked={settings.autoHistoryBeforeCleaning} onChange={(value) => update({ autoHistoryBeforeCleaning: value })} />
                <ToggleRow title="Confirm destructive actions" description="Ask before changes that rewrite data." checked={settings.confirmDestructiveActions} onChange={(value) => update({ confirmDestructiveActions: value })} />
                <ToggleRow title="Preview cleaning changes" description="Show affected rows before applying a cleaning action." checked={settings.previewCleaningChanges} onChange={(value) => update({ previewCleaningChanges: value })} />
              </SettingsCard>
            ) : null}

            {activeSection === "charts" ? (
              <SettingsCard title="Chart defaults" description="Used when the Charts module initializes a new chart.">
                <SelectRow title="Default chart type" description="Initial chart type." value={settings.defaultChartType} options={CHART_TYPE_OPTIONS} onChange={(value) => update({ defaultChartType: value })} />
                <SelectRow title="Default aggregation" description="Initial aggregation." value={settings.defaultAggregation} options={AGGREGATION_OPTIONS} onChange={(value) => update({ defaultAggregation: value })} />
                <SelectRow title="Default column pool" description="Initial column selector filter." value={settings.defaultColumnPool} options={COLUMN_POOL_OPTIONS} onChange={(value) => update({ defaultColumnPool: value })} />
                <ToggleRow title="Show chart labels" description="Labels visible by default." checked={settings.showChartLabels} onChange={(value) => update({ showChartLabels: value })} />
                <ToggleRow title="Show chart legend" description="Legend visible by default." checked={settings.showChartLegend} onChange={(value) => update({ showChartLegend: value })} />
                <ToggleRow title="Chart animation" description="Animate chart changes by default." checked={settings.chartAnimation} onChange={(value) => update({ chartAnimation: value })} />
                <ToggleRow title="Chart zoom" description="Enable data zoom by default." checked={settings.chartZoom} onChange={(value) => update({ chartZoom: value })} />
                <SelectRow title="PNG export scale" description="Resolution multiplier for chart PNGs." value={settings.pngExportScale} options={EXPORT_SCALE_OPTIONS} onChange={(value) => update({ pngExportScale: value })} />
              </SettingsCard>
            ) : null}

            {activeSection === "history" ? (
              <SettingsCard title="History and restore" description="Controls restore points and history limits.">
                <ToggleRow title="Auto-save history points" description="Create restore points automatically." checked={settings.autoSaveHistoryPoints} onChange={(value) => update({ autoSaveHistoryPoints: value })} />
                <ToggleRow title="Save after every change" description="Track schema and cleaning changes." checked={settings.saveHistoryAfterEveryChange} onChange={(value) => update({ saveHistoryAfterEveryChange: value })} />
                <SelectRow title="Max history points" description="Oldest history points are trimmed beyond this limit." value={settings.maxHistoryPoints} options={HISTORY_LIMIT_OPTIONS} onChange={(value) => update({ maxHistoryPoints: value })} />
                <ToggleRow title="Auto-label history" description="Use generated labels for restore points." checked={settings.autoLabelHistoryPoints} onChange={(value) => update({ autoLabelHistoryPoints: value })} />
                <ToggleRow title="Confirm restore" description="Ask before reverting the workspace." checked={settings.confirmBeforeRestore} onChange={(value) => update({ confirmBeforeRestore: value })} />
                <ToggleRow title="Keep upload snapshot" description="Retain the original upload as a restore point." checked={settings.keepUploadSnapshot} onChange={(value) => update({ keepUploadSnapshot: value })} />
              </SettingsCard>
            ) : null}

            {activeSection === "export" ? (
              <SettingsCard title="Export defaults" description="Defaults used by Export Package.">
                <SelectRow title="Default data format" description="Preferred exported data format." value={settings.defaultExportFormat} options={EXPORT_FORMAT_OPTIONS} onChange={(value) => update({ defaultExportFormat: value })} />
                <ToggleRow title="Include cleaned data" description="Default include current data grid." checked={settings.includeCleanedData} onChange={(value) => update({ includeCleanedData: value })} />
                <ToggleRow title="Include schema profile" description="Default include schema metadata." checked={settings.includeSchemaProfile} onChange={(value) => update({ includeSchemaProfile: value })} />
                <ToggleRow title="Include cleaning history" description="Default include history JSON." checked={settings.includeCleaningHistory} onChange={(value) => update({ includeCleaningHistory: value })} />
                <ToggleRow title="Include chart PNGs" description="Default include saved chart images." checked={settings.includeChartPngs} onChange={(value) => update({ includeChartPngs: value })} />
                <SelectRow title="File naming" description="Default ZIP naming pattern." value={settings.fileNamingPattern} options={FILE_NAME_OPTIONS} onChange={(value) => update({ fileNamingPattern: value })} />
                <SelectRow title="Export CSV encoding" description="Metadata preference for exported CSV files." value={settings.exportCsvEncoding} options={CSV_ENCODINGS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => update({ exportCsvEncoding: value as CsvEncoding })} />
              </SettingsCard>
            ) : null}

            {activeSection === "workspace" ? (
              <SettingsCard title="Workspace persistence" description="Controls browser-local session restore and app defaults.">
                <Notice>
                  Session saving uses browser storage on this device. It is cleared if the user clears site data, browser cache, or disables session saving.
                </Notice>
                <SelectRow title="Default module" description="Module opened when a workspace is loaded." value={settings.defaultLandingModule} options={LANDING_MODULE_OPTIONS} onChange={(value) => update({ defaultLandingModule: value })} />
                <ToggleRow title="Compact mode" description="Keep spacing dense across modules." checked={settings.compactMode} onChange={(value) => update({ compactMode: value })} />
                <ToggleRow title="Onboarding hints" description="Show instructional hints for new users." checked={settings.showOnboardingHints} onChange={(value) => update({ showOnboardingHints: value })} />
                <ToggleRow title="Save session" description="Syncs with the top-bar Save session toggle." checked={settings.persistWorkspaceLocally} onChange={handleSessionToggle} />
                <ToggleRow title="Auto-save workspace" description="Save changes automatically while session saving is enabled." checked={settings.autoSaveWorkspaceState} onChange={(value) => update({ autoSaveWorkspaceState: value })} />
                <Button type="button" variant="outline" onClick={() => { void clearPersistedWorkspaceSession(); flash("Saved session cleared"); }} className="h-8 rounded-xl px-3 !text-[13px]">
                  <Trash2 className="mr-1.5 size-3.5" />
                  Clear saved session
                </Button>
              </SettingsCard>
            ) : null}
          </main>
        </div>
      </div>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex h-7 items-center rounded-xl bg-muted/35 px-2.5 !text-[12px] text-muted-foreground">
      {label}: <span className="ml-1 font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</span>
    </span>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-background/70 p-4 shadow-sm">
      <h3 className="!text-[13px] font-bold text-foreground">{title}</h3>
      <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">{description}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function SettingRow({ title, description, children, stacked = false }: { title: string; description: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-muted/[0.16] p-3", stacked ? "space-y-3" : "flex items-center justify-between gap-4")}>
      <div className="min-w-0">
        <p className="!text-[13px] font-bold text-foreground">{title}</p>
        <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className={cn("shrink-0", stacked && "w-full")}>{children}</div>
    </div>
  );
}

function SelectRow<T extends string>({ title, description, value, options, onChange }: { title: string; description: string; value: T; options: SelectOption<T>[]; onChange: (value: T) => void }) {
  return (
    <SettingRow title={title} description={description}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 min-w-[220px] rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SettingRow>
  );
}

function TextSetting({ label, description, value, placeholder, onChange }: { label: string; description: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <SettingRow title={label} description={description} stacked>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/20"
      />
    </SettingRow>
  );
}

function NumberSetting({ label, description, value, min, max, step, onChange }: { label: string; description: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return (
    <SettingRow title={label} description={description}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-[160px] rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring/20"
      />
    </SettingRow>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <SettingRow title={title} description={description}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={cn(
          "flex h-8 w-[58px] items-center rounded-full border px-1 transition",
          checked ? "border-primary/40 bg-primary/90" : "border-border bg-muted/45",
        )}
      >
        <span
          className={cn(
            "block size-6 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        />
      </button>
    </SettingRow>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-3 text-primary">
      <Database className="mt-0.5 size-4 shrink-0" />
      <p className="!text-[13px] leading-5">{children}</p>
    </div>
  );
}
