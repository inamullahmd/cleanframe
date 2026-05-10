"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Database, RotateCcw, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CheckSelect, type CheckSelectOption } from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import { StorageConsentDialog } from "@/components/workbench/settings/StorageConsentDialog";
import { clearPersistedWorkspaceSession } from "@/components/workbench/persistence/WorkspacePersistenceBridge";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { resetCleanframeSettings } from "@/lib/settings/cleanframeSettings";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ColumnType } from "@/types/dataset";
import type { OutlierConfig, OutlierDetectionMethod } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";
import { CSV_ENCODINGS, DEFAULT_CSV_ENCODING } from "@/types/settings";
import {
  DEFAULT_CLEANFRAME_SETTINGS,
  type ChartAggregation,
  type ChartColumnPool,
  type ChartType,
  type CleanframeSettings,
  type CsvDelimiter,
  type DateParsingMode,
  type DetectionStrictness,
  type DuplicateColumnStrategy,
  type DuplicateHandling,
  type ExportFormat,
  type ExportScale,
  type FileNamingPattern,
  type LandingModule,
  type MaxHistoryPoints,
  type NumberParsingMode,
  type PageSize,
  type ProfileSampleSize,
  type RowDensity,
  type ValueDisplayMode,
  type CasingCleanup,
  type ColumnNameFormat,
} from "@/types/cleanframeSettings";

const NUMERIC_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

type SettingsSectionId =
  | "import"
  | "columnNames"
  | "profiling"
  | "dataGrid"
  | "cleaning"
  | "charts"
  | "history"
  | "export"
  | "workspace";

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  title: string;
  description: string;
}[] = [
  { id: "import", title: "CSV & Import", description: "Encoding and parsing" },
  { id: "columnNames", title: "Column Names", description: "Naming defaults" },
  { id: "profiling", title: "Data Profiling", description: "Types and outliers" },
  { id: "dataGrid", title: "Data Grid", description: "Table defaults" },
  { id: "cleaning", title: "Cleaning", description: "Cleanup behavior" },
  { id: "charts", title: "Charts", description: "Chart defaults" },
  { id: "history", title: "History", description: "Restore behavior" },
  { id: "export", title: "Export Package", description: "Package defaults" },
  { id: "workspace", title: "Workspace", description: "Persistence" },
];

const ENCODING_OPTIONS: CheckSelectOption<CsvEncoding>[] = CSV_ENCODINGS.map(
  (encoding) => ({
    value: encoding.value,
    label: encoding.label,
    description: encoding.description,
  }),
);

const METHOD_OPTIONS: CheckSelectOption<OutlierDetectionMethod>[] = [
  { value: "iqr", label: "IQR", description: "Q1/Q3 fences." },
  { value: "z_score", label: "Z-score", description: "Distance from mean." },
  { value: "modified_z_score", label: "Modified Z-score", description: "Median and MAD." },
  { value: "percentile", label: "Percentile bounds" },
  { value: "std_dev", label: "Standard deviation" },
  { value: "domain_rules", label: "Domain rules" },
  { value: "isolation_forest", label: "Isolation Forest" },
];

const DELIMITER_OPTIONS: CheckSelectOption<CsvDelimiter>[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "comma", label: "Comma" },
  { value: "semicolon", label: "Semicolon" },
  { value: "tab", label: "Tab" },
  { value: "pipe", label: "Pipe" },
];
const DATE_MODE_OPTIONS: CheckSelectOption<DateParsingMode>[] = [
  { value: "auto", label: "Auto" },
  { value: "us", label: "US: MM/DD/YYYY" },
  { value: "iso", label: "ISO: YYYY-MM-DD" },
  { value: "eu", label: "EU: DD/MM/YYYY" },
];
const NUMBER_MODE_OPTIONS: CheckSelectOption<NumberParsingMode>[] = [
  { value: "balanced", label: "Balanced" },
  { value: "strict", label: "Strict" },
  { value: "aggressive", label: "Aggressive" },
];
const COLUMN_NAME_OPTIONS: CheckSelectOption<ColumnNameFormat>[] = [
  { value: "original", label: "Keep original" },
  { value: "title_case_spaces", label: "Title Case + Spaces" },
  { value: "snake_case", label: "snake_case" },
  { value: "camel_case", label: "camelCase" },
  { value: "lowercase_spaces", label: "lowercase + spaces" },
];
const DUPLICATE_COLUMN_OPTIONS: CheckSelectOption<DuplicateColumnStrategy>[] = [
  { value: "append_suffix", label: "Append suffix" },
  { value: "keep_first", label: "Keep first" },
  { value: "make_unique", label: "Make unique names" },
];
const SAMPLE_SIZE_OPTIONS: CheckSelectOption<ProfileSampleSize>[] = [
  { value: "full", label: "Full dataset" },
  { value: "5000", label: "First 5,000 rows" },
  { value: "10000", label: "First 10,000 rows" },
  { value: "25000", label: "First 25,000 rows" },
];
const STRICTNESS_OPTIONS: CheckSelectOption<DetectionStrictness>[] = [
  { value: "strict", label: "Strict" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
];
const VALUE_DISPLAY_OPTIONS: CheckSelectOption<ValueDisplayMode>[] = [
  { value: "formatted", label: "Formatted values" },
  { value: "raw", label: "Raw CSV values" },
];
const ROW_DENSITY_OPTIONS: CheckSelectOption<RowDensity>[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];
const PAGE_SIZE_OPTIONS: CheckSelectOption<PageSize>[] = [
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
];
const CHART_TYPE_OPTIONS: CheckSelectOption<ChartType>[] = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "scatter", label: "Scatter" },
  { value: "histogram", label: "Histogram" },
];
const AGGREGATION_OPTIONS: CheckSelectOption<ChartAggregation>[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "median", label: "Median" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];
const COLUMN_POOL_OPTIONS: CheckSelectOption<ChartColumnPool>[] = [
  { value: "recommended", label: "Recommended" },
  { value: "categorical", label: "Category only" },
  { value: "boolean", label: "Boolean only" },
  { value: "numeric", label: "Numeric only" },
  { value: "date_time", label: "Date & Time" },
  { value: "all_columns", label: "All columns" },
];
const EXPORT_SCALE_OPTIONS: CheckSelectOption<ExportScale>[] = [
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "3", label: "3x" },
];
const DUPLICATE_HANDLING_OPTIONS: CheckSelectOption<DuplicateHandling>[] = [
  { value: "keep_first", label: "Keep first" },
  { value: "keep_last", label: "Keep last" },
  { value: "mark_only", label: "Mark only" },
];
const CASING_CLEANUP_OPTIONS: CheckSelectOption<CasingCleanup>[] = [
  { value: "none", label: "None" },
  { value: "title_case", label: "Title Case" },
  { value: "lowercase", label: "lowercase" },
  { value: "uppercase", label: "UPPERCASE" },
];
const HISTORY_LIMIT_OPTIONS: CheckSelectOption<MaxHistoryPoints>[] = [
  { value: "25", label: "25 points" },
  { value: "50", label: "50 points" },
  { value: "100", label: "100 points" },
];
const EXPORT_FORMAT_OPTIONS: CheckSelectOption<ExportFormat>[] = [
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
];
const FILE_NAME_OPTIONS: CheckSelectOption<FileNamingPattern>[] = [
  { value: "dataset_timestamp", label: "Dataset + timestamp" },
  { value: "dataset_only", label: "Dataset name only" },
  { value: "cleanframe_timestamp", label: "Cleanframe + timestamp" },
];
const LANDING_MODULE_OPTIONS: CheckSelectOption<LandingModule>[] = [
  { value: "upload", label: "Upload" },
  { value: "schema", label: "Schema" },
  { value: "data", label: "Data" },
  { value: "clean", label: "Clean" },
  { value: "history", label: "History" },
  { value: "charts", label: "Charts" },
];

function clampGridTextSize(value: number) {
  return Math.min(16, Math.max(10, Math.round(value)));
}

export function SettingsPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const updateOutlierConfig = useWorkspaceStore((state) => state.updateOutlierConfig);
  const updateCsvEncoding = useWorkspaceStore((state) => state.updateCsvEncoding);
  const { settings, hydrated, saveSettings } = useCleanframeSettings();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>("workspace");
  const [draftSettings, setDraftSettings] = useState<CleanframeSettings>(settings);
  const [draftOutlierConfig, setDraftOutlierConfig] = useState<OutlierConfig>(outlierConfig);
  const [draftCsvEncoding, setDraftCsvEncoding] = useState<CsvEncoding>(csvEncoding);
  const [saveStatus, setSaveStatus] = useState("");
  const [showStorageConsent, setShowStorageConsent] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    setDraftSettings(settings);
  }, [hydrated, settings]);

  const numericColumnCount = useMemo(() => {
    return workspace?.profile.columns.filter((column) => NUMERIC_TYPES.includes(column.type)).length ?? 0;
  }, [workspace]);

  const activeSectionMeta = SETTINGS_SECTIONS.find((section) => section.id === activeSection) ?? SETTINGS_SECTIONS[0];

  function updateDraftSettings(nextSettings: Partial<CleanframeSettings>) {
    setDraftSettings((current) => ({ ...current, ...nextSettings }));
  }

  function updateDraftOutlierConfig(nextConfig: Partial<OutlierConfig>) {
    setDraftOutlierConfig((current) => ({ ...current, ...nextConfig }));
  }

  function showSavedStatus(message: string) {
    setSaveStatus(message);
    window.setTimeout(() => setSaveStatus(""), 2200);
  }

  function handleSaveSettings() {
    saveSettings(draftSettings);
    updateCsvEncoding(draftCsvEncoding);
    updateOutlierConfig(draftOutlierConfig);
    showSavedStatus("Saved");
  }

  function handleResetSettings() {
    const defaults = resetCleanframeSettings();
    setDraftSettings(defaults);
    setDraftCsvEncoding(DEFAULT_CSV_ENCODING);
    setDraftOutlierConfig(DEFAULT_OUTLIER_CONFIG);
    updateCsvEncoding(DEFAULT_CSV_ENCODING);
    updateOutlierConfig(DEFAULT_OUTLIER_CONFIG);
    showSavedStatus("Defaults restored");
  }

  function handlePersistenceToggle(checked: boolean) {
    if (checked) {
      setShowStorageConsent(true);
      return;
    }

    updateDraftSettings({ persistWorkspaceLocally: false });
    clearPersistedWorkspaceSession();
  }

  return (
    <section className="min-h-0 overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <StorageConsentDialog
        open={showStorageConsent}
        onCancel={() => setShowStorageConsent(false)}
        onAccept={() => {
          updateDraftSettings({ persistWorkspaceLocally: true, autoSaveWorkspaceState: true });
          setShowStorageConsent(false);
        }}
      />

      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/35 text-foreground">
              <Settings className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">Settings</h2>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Configure import, data grid, charts, history, and workspace persistence.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveStatus ? <span className="rounded-full bg-muted/35 px-3 py-1 !text-[13px] font-semibold text-muted-foreground">{saveStatus}</span> : null}
            <Button type="button" variant="outline" onClick={handleResetSettings} className="h-8 rounded-xl px-3 !text-[13px]">
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset
            </Button>
            <Button type="button" onClick={handleSaveSettings} className="h-8 rounded-xl px-3 !text-[13px]">
              <Save className="mr-1.5 size-3.5" />
              Save settings
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <SummaryPill label="Rows" value={workspace?.profile.rowCount ?? 0} />
          <SummaryPill label="Columns" value={workspace?.profile.columnCount ?? 0} />
          <SummaryPill label="Numeric" value={numericColumnCount} />
          <SummaryPill label="Encoding" value={draftCsvEncoding} />
          <SummaryPill label="Outlier" value={draftOutlierConfig.method} />
          <SummaryPill label="Session" value={draftSettings.persistWorkspaceLocally ? "Saved" : "Not saved"} />
        </div>
      </div>

      <div className="bg-muted/[0.06] p-3">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-background p-2 shadow-sm">
            <div className="space-y-1">
              {SETTINGS_SECTIONS.map((section, index) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition",
                    activeSection === section.id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                  )}
                >
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-lg bg-background !text-[11px] font-bold text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate !text-[13px] font-bold leading-5">{section.title}</span>
                    <span className="block truncate !text-[12px] leading-4">{section.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 rounded-2xl bg-background px-4 py-3 shadow-sm">
              <p className="!text-[13px] font-bold leading-5 text-foreground">{activeSectionMeta.title}</p>
              <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">{activeSectionMeta.description}</p>
            </div>

            <div className="max-w-[980px]">
              {activeSection === "import" ? (
                <SettingsCard title="CSV & Import" description="Applied to the next uploaded CSV.">
                  <SelectRow title="Encoding" description="Used when decoding CSV text." value={draftCsvEncoding} options={ENCODING_OPTIONS} onChange={setDraftCsvEncoding} />
                  <SelectRow title="Delimiter" description="Choose or auto-detect the delimiter." value={draftSettings.delimiter} options={DELIMITER_OPTIONS} onChange={(value) => updateDraftSettings({ delimiter: value })} />
                  <SettingRow title="Header row" description="Treat first row as column headers."><ToggleSwitch checked={draftSettings.hasHeaderRow} onCheckedChange={(value) => updateDraftSettings({ hasHeaderRow: value })} /></SettingRow>
                  <SettingRow title="Trim cells" description="Remove leading/trailing spaces on import."><ToggleSwitch checked={draftSettings.trimCellsOnImport} onCheckedChange={(value) => updateDraftSettings({ trimCellsOnImport: value })} /></SettingRow>
                  <SettingRow title="Empty values" description="Comma-separated missing tokens." stacked><InputWithLabel label="Empty values" hideLabel value={draftSettings.emptyValueTokens} onChange={(event) => updateDraftSettings({ emptyValueTokens: event.target.value })} inputClassName="h-9 rounded-xl !text-[13px]" /></SettingRow>
                  <SelectRow title="Date parsing" description="Preferred date interpretation." value={draftSettings.dateParsingMode} options={DATE_MODE_OPTIONS} onChange={(value) => updateDraftSettings({ dateParsingMode: value })} />
                  <SelectRow title="Number parsing" description="Controls numeric detection strictness." value={draftSettings.numberParsingMode} options={NUMBER_MODE_OPTIONS} onChange={(value) => updateDraftSettings({ numberParsingMode: value })} />
                </SettingsCard>
              ) : null}

              {activeSection === "columnNames" ? (
                <SettingsCard title="Column Names" description="Defaults for upload-time column cleanup.">
                  <SettingRow title="Auto clean on upload" description="Apply column-name cleanup after import."><ToggleSwitch checked={draftSettings.autoCleanColumnNames} onCheckedChange={(value) => updateDraftSettings({ autoCleanColumnNames: value })} /></SettingRow>
                  <SelectRow title="Name format" description="Preferred output style." value={draftSettings.columnNameFormat} options={COLUMN_NAME_OPTIONS} onChange={(value) => updateDraftSettings({ columnNameFormat: value })} />
                  <SettingRow title="Replace underscores" description="Convert underscores into spaces."><ToggleSwitch checked={draftSettings.replaceUnderscores} onCheckedChange={(value) => updateDraftSettings({ replaceUnderscores: value })} /></SettingRow>
                  <SettingRow title="Remove special characters" description="Strip symbols from column names."><ToggleSwitch checked={draftSettings.removeSpecialCharacters} onCheckedChange={(value) => updateDraftSettings({ removeSpecialCharacters: value })} /></SettingRow>
                  <SelectRow title="Duplicate names" description="How duplicate headers are handled." value={draftSettings.duplicateColumnStrategy} options={DUPLICATE_COLUMN_OPTIONS} onChange={(value) => updateDraftSettings({ duplicateColumnStrategy: value })} />
                </SettingsCard>
              ) : null}

              {activeSection === "profiling" ? (
                <SettingsCard title="Data Profiling" description="Controls schema metrics and outlier detection.">
                  <SelectRow title="Profile sample" description="Rows used for profiling large datasets." value={draftSettings.profileSampleSize} options={SAMPLE_SIZE_OPTIONS} onChange={(value) => updateDraftSettings({ profileSampleSize: value })} />
                  <SettingRow title="Detect ID columns" description="Mark identifier-like columns automatically."><ToggleSwitch checked={draftSettings.detectIdColumns} onCheckedChange={(value) => updateDraftSettings({ detectIdColumns: value })} /></SettingRow>
                  <SelectRow title="Numeric detection" description="Strictness for numeric inference." value={draftSettings.numericDetectionStrictness} options={STRICTNESS_OPTIONS} onChange={(value) => updateDraftSettings({ numericDetectionStrictness: value })} />
                  <SelectRow title="Date detection" description="Strictness for date/time inference." value={draftSettings.dateDetectionStrictness} options={STRICTNESS_OPTIONS} onChange={(value) => updateDraftSettings({ dateDetectionStrictness: value })} />
                  <SelectRow title="Outlier method" description="Used in schema metrics and grid highlights." value={draftOutlierConfig.method} options={METHOD_OPTIONS} onChange={(value) => updateDraftOutlierConfig({ method: value })} />
                  {draftOutlierConfig.method === "iqr" ? <NumberSetting label="IQR multiplier" description="Higher values flag fewer outliers." value={draftOutlierConfig.iqrMultiplier} step={0.1} min={0.1} onChange={(value) => updateDraftOutlierConfig({ iqrMultiplier: value })} /> : null}
                </SettingsCard>
              ) : null}

              {activeSection === "dataGrid" ? (
                <SettingsCard title="Data Grid" description="Default table behavior.">
                  <SelectRow title="Value display" description="Formatted or raw CSV values." value={draftSettings.defaultValueDisplay} options={VALUE_DISPLAY_OPTIONS} onChange={(value) => updateDraftSettings({ defaultValueDisplay: value })} />
                  <SelectRow title="Row density" description="Default table spacing." value={draftSettings.rowDensity} options={ROW_DENSITY_OPTIONS} onChange={(value) => updateDraftSettings({ rowDensity: value })} />
                  <SelectRow title="Page size" description="Rows shown by default." value={draftSettings.defaultPageSize} options={PAGE_SIZE_OPTIONS} onChange={(value) => updateDraftSettings({ defaultPageSize: value })} />
                  <NumberSetting label="Default text size" description="Initial grid font size in pixels." value={draftSettings.defaultGridTextSize} min={10} max={16} step={1} onChange={(value) => updateDraftSettings({ defaultGridTextSize: clampGridTextSize(value) })} />
                  <SettingRow title="Highlight missing" description="Mark missing values in the grid."><ToggleSwitch checked={draftSettings.highlightMissingValues} onCheckedChange={(value) => updateDraftSettings({ highlightMissingValues: value })} /></SettingRow>
                  <SettingRow title="Highlight outliers" description="Mark numeric outlier values."><ToggleSwitch checked={draftSettings.highlightOutliers} onCheckedChange={(value) => updateDraftSettings({ highlightOutliers: value })} /></SettingRow>
                  <SettingRow title="Sticky header" description="Keep table headers visible."><ToggleSwitch checked={draftSettings.stickyTableHeader} onCheckedChange={(value) => updateDraftSettings({ stickyTableHeader: value })} /></SettingRow>
                  <SettingRow title="Row numbers" description="Show spreadsheet-style row numbers."><ToggleSwitch checked={draftSettings.showRowNumbers} onCheckedChange={(value) => updateDraftSettings({ showRowNumbers: value })} /></SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "cleaning" ? (
                <SettingsCard title="Cleaning Defaults" description="Controls default behavior in Clean.">
                  <SelectRow title="Duplicate handling" description="Default strategy for duplicate rows." value={draftSettings.duplicateHandling} options={DUPLICATE_HANDLING_OPTIONS} onChange={(value) => updateDraftSettings({ duplicateHandling: value })} />
                  <SettingRow title="Whitespace cleanup" description="Trim spaces during cleanup."><ToggleSwitch checked={draftSettings.whitespaceCleanup} onCheckedChange={(value) => updateDraftSettings({ whitespaceCleanup: value })} /></SettingRow>
                  <SettingRow title="Text normalization" description="Normalize repeated spacing and casing noise."><ToggleSwitch checked={draftSettings.textNormalization} onCheckedChange={(value) => updateDraftSettings({ textNormalization: value })} /></SettingRow>
                  <SelectRow title="Casing cleanup" description="Default text casing operation." value={draftSettings.casingCleanup} options={CASING_CLEANUP_OPTIONS} onChange={(value) => updateDraftSettings({ casingCleanup: value })} />
                  <SettingRow title="History before cleaning" description="Create a restore point before applying changes."><ToggleSwitch checked={draftSettings.autoHistoryBeforeCleaning} onCheckedChange={(value) => updateDraftSettings({ autoHistoryBeforeCleaning: value })} /></SettingRow>
                  <SettingRow title="Confirm destructive actions" description="Ask before deleting or overwriting data."><ToggleSwitch checked={draftSettings.confirmDestructiveActions} onCheckedChange={(value) => updateDraftSettings({ confirmDestructiveActions: value })} /></SettingRow>
                  <SettingRow title="Preview changes" description="Show preview rows before applying fixes."><ToggleSwitch checked={draftSettings.previewCleaningChanges} onCheckedChange={(value) => updateDraftSettings({ previewCleaningChanges: value })} /></SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "charts" ? (
                <SettingsCard title="Chart Defaults" description="Used for new charts.">
                  <SelectRow title="Chart type" description="Initial chart type." value={draftSettings.defaultChartType} options={CHART_TYPE_OPTIONS} onChange={(value) => updateDraftSettings({ defaultChartType: value })} />
                  <SelectRow title="Aggregation" description="Default summary calculation." value={draftSettings.defaultAggregation} options={AGGREGATION_OPTIONS} onChange={(value) => updateDraftSettings({ defaultAggregation: value })} />
                  <SelectRow title="Column pool" description="Default column filter." value={draftSettings.defaultColumnPool} options={COLUMN_POOL_OPTIONS} onChange={(value) => updateDraftSettings({ defaultColumnPool: value })} />
                  <SettingRow title="Chart labels" description="Show labels by default."><ToggleSwitch checked={draftSettings.showChartLabels} onCheckedChange={(value) => updateDraftSettings({ showChartLabels: value })} /></SettingRow>
                  <SettingRow title="Legend" description="Show legend by default."><ToggleSwitch checked={draftSettings.showChartLegend} onCheckedChange={(value) => updateDraftSettings({ showChartLegend: value })} /></SettingRow>
                  <SettingRow title="Animation" description="Animate chart transitions."><ToggleSwitch checked={draftSettings.chartAnimation} onCheckedChange={(value) => updateDraftSettings({ chartAnimation: value })} /></SettingRow>
                  <SettingRow title="Zoom controls" description="Enable ECharts data zoom by default."><ToggleSwitch checked={draftSettings.chartZoom} onCheckedChange={(value) => updateDraftSettings({ chartZoom: value })} /></SettingRow>
                  <SelectRow title="PNG scale" description="Image export quality." value={draftSettings.pngExportScale} options={EXPORT_SCALE_OPTIONS} onChange={(value) => updateDraftSettings({ pngExportScale: value })} />
                </SettingsCard>
              ) : null}

              {activeSection === "history" ? (
                <SettingsCard title="History & Restore" description="Restore point behavior.">
                  <SettingRow title="Auto-save points" description="Create restore points automatically."><ToggleSwitch checked={draftSettings.autoSaveHistoryPoints} onCheckedChange={(value) => updateDraftSettings({ autoSaveHistoryPoints: value })} /></SettingRow>
                  <SettingRow title="After every change" description="Save a point after schema/data changes."><ToggleSwitch checked={draftSettings.saveHistoryAfterEveryChange} onCheckedChange={(value) => updateDraftSettings({ saveHistoryAfterEveryChange: value })} /></SettingRow>
                  <SelectRow title="History limit" description="Maximum restore points to keep." value={draftSettings.maxHistoryPoints} options={HISTORY_LIMIT_OPTIONS} onChange={(value) => updateDraftSettings({ maxHistoryPoints: value })} />
                  <SettingRow title="Auto-label points" description="Generate labels from actions."><ToggleSwitch checked={draftSettings.autoLabelHistoryPoints} onCheckedChange={(value) => updateDraftSettings({ autoLabelHistoryPoints: value })} /></SettingRow>
                  <SettingRow title="Confirm restore" description="Ask before reverting the workspace."><ToggleSwitch checked={draftSettings.confirmBeforeRestore} onCheckedChange={(value) => updateDraftSettings({ confirmBeforeRestore: value })} /></SettingRow>
                  <SettingRow title="Keep upload snapshot" description="Always retain the original dataset state."><ToggleSwitch checked={draftSettings.keepUploadSnapshot} onCheckedChange={(value) => updateDraftSettings({ keepUploadSnapshot: value })} /></SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "export" ? (
                <SettingsCard title="Export Package" description="Defaults for the Export package module.">
                  <SelectRow title="Export format" description="Default structured data format." value={draftSettings.defaultExportFormat} options={EXPORT_FORMAT_OPTIONS} onChange={(value) => updateDraftSettings({ defaultExportFormat: value })} />
                  <SettingRow title="Cleaned data" description="Include the working dataset."><ToggleSwitch checked={draftSettings.includeCleanedData} onCheckedChange={(value) => updateDraftSettings({ includeCleanedData: value })} /></SettingRow>
                  <SettingRow title="Schema profile" description="Include column types and metrics."><ToggleSwitch checked={draftSettings.includeSchemaProfile} onCheckedChange={(value) => updateDraftSettings({ includeSchemaProfile: value })} /></SettingRow>
                  <SettingRow title="Cleaning history" description="Include the change log."><ToggleSwitch checked={draftSettings.includeCleaningHistory} onCheckedChange={(value) => updateDraftSettings({ includeCleaningHistory: value })} /></SettingRow>
                  <SettingRow title="Chart PNGs" description="Include exported chart images."><ToggleSwitch checked={draftSettings.includeChartPngs} onCheckedChange={(value) => updateDraftSettings({ includeChartPngs: value })} /></SettingRow>
                  <SelectRow title="File naming" description="Default package naming pattern." value={draftSettings.fileNamingPattern} options={FILE_NAME_OPTIONS} onChange={(value) => updateDraftSettings({ fileNamingPattern: value })} />
                  <SelectRow title="CSV encoding" description="Encoding used for exported CSVs." value={draftSettings.exportCsvEncoding} options={ENCODING_OPTIONS} onChange={(value) => updateDraftSettings({ exportCsvEncoding: value })} />
                </SettingsCard>
              ) : null}

              {activeSection === "workspace" ? (
                <SettingsCard title="Workspace Persistence" description="Save and restore the current browser session.">
                  <div className="mb-3 rounded-2xl bg-muted/[0.22] p-3">
                    <div className="flex items-start gap-2">
                      <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="!text-[13px] leading-5 text-muted-foreground">
                        Enable session saving only if you want Cleanframe to store the working dataset and edits in browser storage on this device.
                      </p>
                    </div>
                  </div>
                  <SelectRow title="Landing module" description="Module opened by default." value={draftSettings.defaultLandingModule} options={LANDING_MODULE_OPTIONS} onChange={(value) => updateDraftSettings({ defaultLandingModule: value })} />
                  <SettingRow title="Compact mode" description="Prefer dense controls and smaller spacing."><ToggleSwitch checked={draftSettings.compactMode} onCheckedChange={(value) => updateDraftSettings({ compactMode: value })} /></SettingRow>
                  <SettingRow title="Onboarding hints" description="Show helper text for new workspaces."><ToggleSwitch checked={draftSettings.showOnboardingHints} onCheckedChange={(value) => updateDraftSettings({ showOnboardingHints: value })} /></SettingRow>
                  <SettingRow title="Save session" description="Store current workspace in this browser."><ToggleSwitch checked={draftSettings.persistWorkspaceLocally} onCheckedChange={handlePersistenceToggle} /></SettingRow>
                  <SettingRow title="Auto-save workspace" description="Save workspace state after changes."><ToggleSwitch checked={draftSettings.autoSaveWorkspaceState} onCheckedChange={(value) => updateDraftSettings({ autoSaveWorkspaceState: value })} /></SettingRow>
                  <SettingRow title="Clear saved session" description="Remove the cached workspace without resetting the open page.">
                    <Button type="button" variant="outline" onClick={() => { clearPersistedWorkspaceSession(); showSavedStatus("Saved session cleared"); }} className="h-8 rounded-xl px-3 !text-[13px]">Clear saved session</Button>
                  </SettingRow>
                </SettingsCard>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/20 px-3 py-2">
      <p className="!text-[13px] leading-4 text-muted-foreground">{label}</p>
      <p className="mt-1 truncate !text-[13px] font-bold leading-4 text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-background p-4 !text-[13px] shadow-sm">
      <div className="mb-3">
        <h3 className="!text-[13px] font-bold leading-5 text-foreground">{title}</h3>
        <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-border/70">{children}</div>
    </section>
  );
}

function SelectRow<T extends string>({
  title,
  description,
  value,
  options,
  onChange,
}: {
  title: string;
  description: string;
  value: T;
  options: CheckSelectOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <SettingRow title={title} description={description}>
      <CheckSelect
        label={title}
        hideLabel
        value={value}
        options={options}
        onChange={onChange}
        triggerClassName="min-h-9 rounded-xl !text-[13px]"
      />
    </SettingRow>
  );
}

function SettingRow({ title, description, children, stacked = false }: { title: string; description: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={cn("grid gap-3 py-3 first:pt-0 last:pb-0", stacked ? "grid-cols-1" : "sm:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] sm:items-center")}>
      <div className="min-w-0">
        <p className="!text-[13px] font-semibold leading-5 text-foreground">{title}</p>
        <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0 sm:justify-self-end">{children}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn("flex h-8 w-[58px] items-center rounded-full border px-1 transition", checked ? "border-primary/40 bg-primary/90" : "border-border bg-muted/45")}
    >
      <span className={cn("size-6 rounded-full bg-background shadow-sm transition", checked ? "translate-x-6" : "translate-x-0")} />
    </button>
  );
}

function NumberSetting({
  label,
  description,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <SettingRow title={label} description={description}>
      <InputWithLabel
        label={label}
        hideLabel
        type="number"
        value={String(value)}
        step={step}
        min={min}
        max={max}
        inputClassName="h-9 rounded-xl !text-[13px] !font-semibold"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </SettingRow>
  );
}
