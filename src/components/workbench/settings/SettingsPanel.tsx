"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CheckSelect } from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ColumnType } from "@/types/dataset";
import type { OutlierConfig, OutlierDetectionMethod } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";
import { CSV_ENCODINGS, DEFAULT_CSV_ENCODING } from "@/types/settings";

const SETTINGS_STORAGE_KEY = "cleanframe-settings";

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

type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type CsvDelimiter = "auto" | "comma" | "semicolon" | "tab" | "pipe";
type DateParsingMode = "auto" | "us" | "iso" | "eu";
type NumberParsingMode = "balanced" | "strict" | "aggressive";
type ColumnNameFormat =
  | "original"
  | "title_case_spaces"
  | "snake_case"
  | "camel_case"
  | "lowercase_spaces";
type DuplicateColumnStrategy = "append_suffix" | "keep_first" | "make_unique";
type ProfileSampleSize = "full" | "5000" | "10000" | "25000";
type DetectionStrictness = "strict" | "balanced" | "aggressive";
type ValueDisplayMode = "formatted" | "raw";
type RowDensity = "compact" | "comfortable";
type PageSize = "25" | "50" | "100";
type ChartType = "bar" | "line" | "area" | "pie" | "scatter" | "histogram";
type ChartAggregation = "count" | "sum" | "average" | "median" | "min" | "max";
type ChartColumnPool =
  | "recommended"
  | "category"
  | "numeric"
  | "date_time"
  | "all";
type ExportScale = "1" | "2" | "3";
type DuplicateHandling = "keep_first" | "keep_last" | "mark_only";
type CasingCleanup = "none" | "title_case" | "lowercase" | "uppercase";
type MaxHistoryPoints = "25" | "50" | "100";
type ExportFormat = "csv" | "json";
type FileNamingPattern =
  | "dataset_timestamp"
  | "dataset_only"
  | "cleanframe_timestamp";
type LandingModule =
  | "upload"
  | "schema"
  | "data"
  | "clean"
  | "history"
  | "charts";

type CleanframeSettings = {
  delimiter: CsvDelimiter;
  hasHeaderRow: boolean;
  trimCellsOnImport: boolean;
  emptyValueTokens: string;
  dateParsingMode: DateParsingMode;
  numberParsingMode: NumberParsingMode;

  autoCleanColumnNames: boolean;
  columnNameFormat: ColumnNameFormat;
  replaceUnderscores: boolean;
  removeSpecialCharacters: boolean;
  duplicateColumnStrategy: DuplicateColumnStrategy;

  profileSampleSize: ProfileSampleSize;
  detectIdColumns: boolean;
  numericDetectionStrictness: DetectionStrictness;
  dateDetectionStrictness: DetectionStrictness;

  defaultValueDisplay: ValueDisplayMode;
  rowDensity: RowDensity;
  defaultPageSize: PageSize;
  highlightMissingValues: boolean;
  highlightOutliers: boolean;
  stickyTableHeader: boolean;
  showRowNumbers: boolean;

  defaultChartType: ChartType;
  defaultAggregation: ChartAggregation;
  defaultColumnPool: ChartColumnPool;
  showChartLabels: boolean;
  showChartLegend: boolean;
  chartAnimation: boolean;
  chartZoom: boolean;
  pngExportScale: ExportScale;

  duplicateHandling: DuplicateHandling;
  whitespaceCleanup: boolean;
  textNormalization: boolean;
  casingCleanup: CasingCleanup;
  autoHistoryBeforeCleaning: boolean;
  confirmDestructiveActions: boolean;
  previewCleaningChanges: boolean;

  autoSaveHistoryPoints: boolean;
  saveHistoryAfterEveryChange: boolean;
  maxHistoryPoints: MaxHistoryPoints;
  autoLabelHistoryPoints: boolean;
  confirmBeforeRestore: boolean;
  keepUploadSnapshot: boolean;

  defaultExportFormat: ExportFormat;
  includeCleanedData: boolean;
  includeSchemaProfile: boolean;
  includeCleaningHistory: boolean;
  includeChartPngs: boolean;
  fileNamingPattern: FileNamingPattern;
  exportCsvEncoding: CsvEncoding;

  defaultLandingModule: LandingModule;
  compactMode: boolean;
  showOnboardingHints: boolean;
  persistWorkspaceLocally: boolean;
  autoSaveWorkspaceState: boolean;
};

const DEFAULT_CLEANFRAME_SETTINGS: CleanframeSettings = {
  delimiter: "auto",
  hasHeaderRow: true,
  trimCellsOnImport: true,
  emptyValueTokens: "NA, N/A, null, NULL, -, empty",
  dateParsingMode: "auto",
  numberParsingMode: "balanced",

  autoCleanColumnNames: false,
  columnNameFormat: "title_case_spaces",
  replaceUnderscores: true,
  removeSpecialCharacters: false,
  duplicateColumnStrategy: "append_suffix",

  profileSampleSize: "full",
  detectIdColumns: true,
  numericDetectionStrictness: "balanced",
  dateDetectionStrictness: "balanced",

  defaultValueDisplay: "formatted",
  rowDensity: "compact",
  defaultPageSize: "50",
  highlightMissingValues: true,
  highlightOutliers: true,
  stickyTableHeader: true,
  showRowNumbers: false,

  defaultChartType: "bar",
  defaultAggregation: "count",
  defaultColumnPool: "recommended",
  showChartLabels: false,
  showChartLegend: true,
  chartAnimation: true,
  chartZoom: false,
  pngExportScale: "2",

  duplicateHandling: "keep_first",
  whitespaceCleanup: true,
  textNormalization: false,
  casingCleanup: "none",
  autoHistoryBeforeCleaning: true,
  confirmDestructiveActions: true,
  previewCleaningChanges: true,

  autoSaveHistoryPoints: true,
  saveHistoryAfterEveryChange: true,
  maxHistoryPoints: "50",
  autoLabelHistoryPoints: true,
  confirmBeforeRestore: true,
  keepUploadSnapshot: true,

  defaultExportFormat: "csv",
  includeCleanedData: true,
  includeSchemaProfile: true,
  includeCleaningHistory: true,
  includeChartPngs: true,
  fileNamingPattern: "dataset_timestamp",
  exportCsvEncoding: "utf-8",

  defaultLandingModule: "upload",
  compactMode: true,
  showOnboardingHints: false,
  persistWorkspaceLocally: true,
  autoSaveWorkspaceState: true,
};

const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: "import",
    title: "CSV & Import",
    description: "Encoding, delimiter, parsing",
  },
  {
    id: "columnNames",
    title: "Column Names",
    description: "Naming defaults",
  },
  {
    id: "profiling",
    title: "Data Profiling",
    description: "Types, metrics, outliers",
  },
  {
    id: "dataGrid",
    title: "Data Grid",
    description: "Table display defaults",
  },
  {
    id: "cleaning",
    title: "Cleaning",
    description: "Cleanup behavior",
  },
  {
    id: "charts",
    title: "Charts",
    description: "Chart defaults",
  },
  {
    id: "history",
    title: "History",
    description: "Restore points",
  },
  {
    id: "export",
    title: "Export Package",
    description: "Package defaults",
  },
  {
    id: "workspace",
    title: "Workspace",
    description: "General preferences",
  },
];

const METHOD_OPTIONS: SelectOption<OutlierDetectionMethod>[] = [
  {
    value: "iqr",
    label: "IQR",
    description: "Uses Q1/Q3 fences. Strong default for skewed data.",
  },
  {
    value: "z_score",
    label: "Z-score",
    description: "Flags values far from the mean. Best for normal data.",
  },
  {
    value: "modified_z_score",
    label: "Modified Z-score",
    description: "Uses median and MAD. More robust than classic Z-score.",
  },
  {
    value: "percentile",
    label: "Percentile bounds",
    description: "Flags values below or above selected percentiles.",
  },
  {
    value: "std_dev",
    label: "Standard deviation",
    description: "Uses mean ± N standard deviations.",
  },
  {
    value: "domain_rules",
    label: "Domain rules",
    description: "Uses user-defined min/max rules per column.",
  },
  {
    value: "isolation_forest",
    label: "Isolation Forest",
    description: "Univariate anomaly scoring using random isolation splits.",
  },
];

const ENCODING_OPTIONS: SelectOption<CsvEncoding>[] = CSV_ENCODINGS.map(
  (encoding) => ({
    value: encoding.value,
    label: encoding.label,
    description: encoding.description,
  }),
);

const DELIMITER_OPTIONS: SelectOption<CsvDelimiter>[] = [
  {
    value: "auto",
    label: "Auto-detect",
    description: "Let Cleanframe infer the delimiter.",
  },
  {
    value: "comma",
    label: "Comma",
    description: "Standard CSV files.",
  },
  {
    value: "semicolon",
    label: "Semicolon",
    description: "Common in regional Excel exports.",
  },
  {
    value: "tab",
    label: "Tab",
    description: "TSV-style files.",
  },
  {
    value: "pipe",
    label: "Pipe",
    description: "Pipe-delimited files.",
  },
];

const DATE_MODE_OPTIONS: SelectOption<DateParsingMode>[] = [
  { value: "auto", label: "Auto" },
  { value: "us", label: "US: MM/DD/YYYY" },
  { value: "iso", label: "ISO: YYYY-MM-DD" },
  { value: "eu", label: "EU: DD/MM/YYYY" },
];

const NUMBER_MODE_OPTIONS: SelectOption<NumberParsingMode>[] = [
  {
    value: "balanced",
    label: "Balanced",
    description: "Recommended default for mixed CSV files.",
  },
  {
    value: "strict",
    label: "Strict",
    description: "Only obvious numbers are typed as numeric.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Convert currency, commas, and percentages aggressively.",
  },
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
  { value: "category", label: "Category only" },
  { value: "numeric", label: "Numeric only" },
  { value: "date_time", label: "Date & Time" },
  { value: "all", label: "All columns" },
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
  { value: "upload", label: "Upload" },
  { value: "schema", label: "Schema" },
  { value: "data", label: "Data" },
  { value: "clean", label: "Clean" },
  { value: "history", label: "History" },
  { value: "charts", label: "Charts" },
];

export function SettingsPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const updateOutlierConfig = useWorkspaceStore(
    (state) => state.updateOutlierConfig,
  );
  const updateCsvEncoding = useWorkspaceStore(
    (state) => state.updateCsvEncoding,
  );

  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("import");
  const [draftOutlierConfig, setDraftOutlierConfig] =
    useState<OutlierConfig>(outlierConfig);
  const [draftCsvEncoding, setDraftCsvEncoding] =
    useState<CsvEncoding>(csvEncoding);
  const [draftSettings, setDraftSettings] = useState<CleanframeSettings>(
    DEFAULT_CLEANFRAME_SETTINGS,
  );
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!savedSettings) return;

    try {
      const parsedSettings = JSON.parse(
        savedSettings,
      ) as Partial<CleanframeSettings>;

      setDraftSettings((current) => ({
        ...current,
        ...parsedSettings,
      }));
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }, []);

  const numericColumns =
    workspace?.profile.columns.filter((column) =>
      NUMERIC_TYPES.includes(column.type),
    ) ?? [];

  const numericColumnCount = useMemo(
    () => numericColumns.length,
    [numericColumns],
  );

  const activeEncodingLabel =
    ENCODING_OPTIONS.find((option) => option.value === draftCsvEncoding)
      ?.label ?? draftCsvEncoding;

  const activeOutlierLabel =
    METHOD_OPTIONS.find((option) => option.value === draftOutlierConfig.method)
      ?.label ?? draftOutlierConfig.method;

  const activeSectionMeta =
    SETTINGS_SECTIONS.find((section) => section.id === activeSection) ??
    SETTINGS_SECTIONS[0];

  function updateDraftOutlierConfig(nextConfig: Partial<OutlierConfig>) {
    setDraftOutlierConfig((current) => ({
      ...current,
      ...nextConfig,
    }));
  }

  function updateDraftSettings(nextSettings: Partial<CleanframeSettings>) {
    setDraftSettings((current) => ({
      ...current,
      ...nextSettings,
    }));
  }

  function showSavedStatus(message: string) {
    setSaveStatus(message);

    window.setTimeout(() => {
      setSaveStatus("");
    }, 2200);
  }

  function saveSettings() {
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(draftSettings));
    }

    updateCsvEncoding(draftCsvEncoding);
    updateOutlierConfig(draftOutlierConfig);

    showSavedStatus("Saved");
  }

  function resetSettings() {
    setDraftCsvEncoding(DEFAULT_CSV_ENCODING);
    setDraftOutlierConfig(DEFAULT_OUTLIER_CONFIG);
    setDraftSettings(DEFAULT_CLEANFRAME_SETTINGS);

    updateCsvEncoding(DEFAULT_CSV_ENCODING);
    updateOutlierConfig(DEFAULT_OUTLIER_CONFIG);

    if (typeof window !== "undefined") {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }

    showSavedStatus("Defaults restored");
  }

  return (
    <section className="min-h-0 overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground">
              <Settings className="size-4" />
            </span>

            <div className="min-w-0">
              <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">
                Settings
              </h2>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Configure import, profiling, cleaning, charts, history, and
                export defaults.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveStatus ? (
              <span className="rounded-full border border-border bg-muted/35 px-3 py-1 !text-[13px] font-semibold text-muted-foreground">
                {saveStatus}
              </span>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={resetSettings}
              className="h-8 rounded-xl px-3 !text-[13px]"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset
            </Button>

            <Button
              type="button"
              onClick={saveSettings}
              className="h-8 rounded-xl px-3 !text-[13px]"
            >
              <Save className="mr-1.5 size-3.5" />
              Save settings
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <SummaryPill label="Rows" value={workspace?.profile.rowCount ?? 0} />
          <SummaryPill
            label="Columns"
            value={workspace?.profile.columnCount ?? 0}
          />
          <SummaryPill label="Numeric" value={numericColumnCount} />
          <SummaryPill label="Encoding" value={activeEncodingLabel} />
          <SummaryPill label="Outlier" value={activeOutlierLabel} />
          <SummaryPill
            label="History"
            value={workspace?.history.length ?? 0}
          />
        </div>
      </div>

      <div className="bg-muted/[0.06] p-3">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-background p-2 shadow-sm">
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
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-lg border !text-[11px] font-bold",
                      activeSection === section.id
                        ? "border-primary/20 bg-background text-primary"
                        : "border-border bg-muted/25 text-muted-foreground",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate !text-[13px] font-bold leading-5">
                      {section.title}
                    </span>
                    <span className="block truncate !text-[12px] leading-4">
                      {section.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 rounded-2xl border border-border bg-background px-4 py-3 shadow-sm">
              <p className="!text-[13px] font-bold leading-5 text-foreground">
                {activeSectionMeta.title}
              </p>
              <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">
                {activeSectionMeta.description}
              </p>
            </div>

            <div className="max-w-[980px]">
              {activeSection === "import" ? (
                <SettingsCard
                  title="CSV & Import"
                  description="Defaults used when a new dataset is uploaded."
                >
                  <SettingRow
                    title="Encoding"
                    description="Used for future CSV uploads."
                  >
                    <CheckSelect
                      label="Encoding"
                      hideLabel
                      value={draftCsvEncoding}
                      options={ENCODING_OPTIONS}
                      onChange={setDraftCsvEncoding}
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Delimiter"
                    description="Choose or auto-detect the file delimiter."
                  >
                    <CheckSelect
                      label="Delimiter"
                      hideLabel
                      value={draftSettings.delimiter}
                      options={DELIMITER_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ delimiter: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Header row"
                    description="Treat first row as column headers."
                  >
                    <ToggleSwitch
                      checked={draftSettings.hasHeaderRow}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ hasHeaderRow: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Trim cells"
                    description="Remove leading and trailing spaces on import."
                  >
                    <ToggleSwitch
                      checked={draftSettings.trimCellsOnImport}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ trimCellsOnImport: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Empty values"
                    description="Comma-separated tokens treated as missing."
                    stacked
                  >
                    <InputWithLabel
                      label="Empty values"
                      hideLabel
                      value={draftSettings.emptyValueTokens}
                      onChange={(event) =>
                        updateDraftSettings({
                          emptyValueTokens: event.target.value,
                        })
                      }
                      inputClassName="h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Date parsing"
                    description="Default date interpretation."
                  >
                    <CheckSelect
                      label="Date parsing"
                      hideLabel
                      value={draftSettings.dateParsingMode}
                      options={DATE_MODE_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ dateParsingMode: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Number parsing"
                    description="Controls numeric type detection."
                  >
                    <CheckSelect
                      label="Number parsing"
                      hideLabel
                      value={draftSettings.numberParsingMode}
                      options={NUMBER_MODE_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ numberParsingMode: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "columnNames" ? (
                <SettingsCard
                  title="Column Names"
                  description="Defaults for future column-name cleanup."
                >
                  <SettingRow
                    title="Auto clean on upload"
                    description="Apply column-name cleanup after import."
                  >
                    <ToggleSwitch
                      checked={draftSettings.autoCleanColumnNames}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ autoCleanColumnNames: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Name format"
                    description="Preferred output style."
                  >
                    <CheckSelect
                      label="Name format"
                      hideLabel
                      value={draftSettings.columnNameFormat}
                      options={COLUMN_NAME_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ columnNameFormat: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Replace underscores"
                    description="Convert underscores into spaces."
                  >
                    <ToggleSwitch
                      checked={draftSettings.replaceUnderscores}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ replaceUnderscores: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Remove special characters"
                    description="Strip symbols from column names."
                  >
                    <ToggleSwitch
                      checked={draftSettings.removeSpecialCharacters}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ removeSpecialCharacters: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Duplicate names"
                    description="How duplicate column names are handled."
                  >
                    <CheckSelect
                      label="Duplicate names"
                      hideLabel
                      value={draftSettings.duplicateColumnStrategy}
                      options={DUPLICATE_COLUMN_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({
                          duplicateColumnStrategy: value,
                        })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "profiling" ? (
                <div className="space-y-3">
                  <SettingsCard
                    title="Data Profiling"
                    description="Controls schema metrics and column inference."
                  >
                    <SettingRow
                      title="Profile sample"
                      description="Rows used for profiling large datasets."
                    >
                      <CheckSelect
                        label="Profile sample"
                        hideLabel
                        value={draftSettings.profileSampleSize}
                        options={SAMPLE_SIZE_OPTIONS}
                        onChange={(value) =>
                          updateDraftSettings({ profileSampleSize: value })
                        }
                        triggerClassName="min-h-9 rounded-xl !text-[13px]"
                      />
                    </SettingRow>

                    <SettingRow
                      title="Detect ID columns"
                      description="Mark identifier-like columns automatically."
                    >
                      <ToggleSwitch
                        checked={draftSettings.detectIdColumns}
                        onCheckedChange={(value) =>
                          updateDraftSettings({ detectIdColumns: value })
                        }
                      />
                    </SettingRow>

                    <SettingRow
                      title="Numeric detection"
                      description="Strictness for numeric type inference."
                    >
                      <CheckSelect
                        label="Numeric detection"
                        hideLabel
                        value={draftSettings.numericDetectionStrictness}
                        options={STRICTNESS_OPTIONS}
                        onChange={(value) =>
                          updateDraftSettings({
                            numericDetectionStrictness: value,
                          })
                        }
                        triggerClassName="min-h-9 rounded-xl !text-[13px]"
                      />
                    </SettingRow>

                    <SettingRow
                      title="Date detection"
                      description="Strictness for date/time type inference."
                    >
                      <CheckSelect
                        label="Date detection"
                        hideLabel
                        value={draftSettings.dateDetectionStrictness}
                        options={STRICTNESS_OPTIONS}
                        onChange={(value) =>
                          updateDraftSettings({
                            dateDetectionStrictness: value,
                          })
                        }
                        triggerClassName="min-h-9 rounded-xl !text-[13px]"
                      />
                    </SettingRow>

                    <SettingRow
                      title="Outlier method"
                      description="Algorithm used in Schema and Data."
                    >
                      <CheckSelect
                        label="Outlier method"
                        hideLabel
                        value={draftOutlierConfig.method}
                        options={METHOD_OPTIONS}
                        onChange={(value) =>
                          updateDraftOutlierConfig({
                            method: value,
                          })
                        }
                        triggerClassName="min-h-9 rounded-xl !text-[13px]"
                      />
                    </SettingRow>

                    {draftOutlierConfig.method === "iqr" ? (
                      <NumberSetting
                        label="IQR multiplier"
                        description="Higher values flag fewer outliers."
                        value={draftOutlierConfig.iqrMultiplier}
                        step={0.1}
                        min={0.1}
                        onChange={(value) =>
                          updateDraftOutlierConfig({ iqrMultiplier: value })
                        }
                      />
                    ) : null}
                  </SettingsCard>

                  {draftOutlierConfig.method === "domain_rules" ? (
                    <DomainRulesCard
                      numericColumns={numericColumns}
                      draftOutlierConfig={draftOutlierConfig}
                      updateDraftOutlierConfig={updateDraftOutlierConfig}
                    />
                  ) : null}
                </div>
              ) : null}

              {activeSection === "dataGrid" ? (
                <SettingsCard
                  title="Data Grid"
                  description="Default table behavior for the Data module."
                >
                  <SettingRow
                    title="Value display"
                    description="Default formatted/raw mode."
                  >
                    <CheckSelect
                      label="Value display"
                      hideLabel
                      value={draftSettings.defaultValueDisplay}
                      options={VALUE_DISPLAY_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultValueDisplay: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Row density"
                    description="Default table height."
                  >
                    <CheckSelect
                      label="Row density"
                      hideLabel
                      value={draftSettings.rowDensity}
                      options={ROW_DENSITY_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ rowDensity: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Page size"
                    description="Rows shown by default."
                  >
                    <CheckSelect
                      label="Page size"
                      hideLabel
                      value={draftSettings.defaultPageSize}
                      options={PAGE_SIZE_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultPageSize: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Highlight missing"
                    description="Mark missing values in the grid."
                  >
                    <ToggleSwitch
                      checked={draftSettings.highlightMissingValues}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ highlightMissingValues: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Highlight outliers"
                    description="Mark outlier values in numeric columns."
                  >
                    <ToggleSwitch
                      checked={draftSettings.highlightOutliers}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ highlightOutliers: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Sticky header"
                    description="Keep headers visible while scrolling."
                  >
                    <ToggleSwitch
                      checked={draftSettings.stickyTableHeader}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ stickyTableHeader: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Row numbers"
                    description="Show spreadsheet-style row numbers."
                  >
                    <ToggleSwitch
                      checked={draftSettings.showRowNumbers}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ showRowNumbers: value })
                      }
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "cleaning" ? (
                <SettingsCard
                  title="Cleaning Defaults"
                  description="Controls default behavior in the Clean module."
                >
                  <SettingRow
                    title="Duplicate handling"
                    description="Default strategy for duplicate rows."
                  >
                    <CheckSelect
                      label="Duplicate handling"
                      hideLabel
                      value={draftSettings.duplicateHandling}
                      options={DUPLICATE_HANDLING_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ duplicateHandling: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Whitespace cleanup"
                    description="Trim spaces during cleanup."
                  >
                    <ToggleSwitch
                      checked={draftSettings.whitespaceCleanup}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ whitespaceCleanup: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Text normalization"
                    description="Normalize repeated spacing and casing noise."
                  >
                    <ToggleSwitch
                      checked={draftSettings.textNormalization}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ textNormalization: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Casing cleanup"
                    description="Default text casing operation."
                  >
                    <CheckSelect
                      label="Casing cleanup"
                      hideLabel
                      value={draftSettings.casingCleanup}
                      options={CASING_CLEANUP_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ casingCleanup: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="History before cleaning"
                    description="Create a restore point before applying changes."
                  >
                    <ToggleSwitch
                      checked={draftSettings.autoHistoryBeforeCleaning}
                      onCheckedChange={(value) =>
                        updateDraftSettings({
                          autoHistoryBeforeCleaning: value,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Confirm destructive actions"
                    description="Ask before deleting or overwriting data."
                  >
                    <ToggleSwitch
                      checked={draftSettings.confirmDestructiveActions}
                      onCheckedChange={(value) =>
                        updateDraftSettings({
                          confirmDestructiveActions: value,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Preview changes"
                    description="Preview cleaning changes before applying."
                  >
                    <ToggleSwitch
                      checked={draftSettings.previewCleaningChanges}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ previewCleaningChanges: value })
                      }
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "charts" ? (
                <SettingsCard
                  title="Chart Defaults"
                  description="Defaults used when creating new charts."
                >
                  <SettingRow
                    title="Chart type"
                    description="Initial chart type."
                  >
                    <CheckSelect
                      label="Chart type"
                      hideLabel
                      value={draftSettings.defaultChartType}
                      options={CHART_TYPE_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultChartType: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Aggregation"
                    description="Default summary calculation."
                  >
                    <CheckSelect
                      label="Aggregation"
                      hideLabel
                      value={draftSettings.defaultAggregation}
                      options={AGGREGATION_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultAggregation: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Column pool"
                    description="Default column filter."
                  >
                    <CheckSelect
                      label="Column pool"
                      hideLabel
                      value={draftSettings.defaultColumnPool}
                      options={COLUMN_POOL_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultColumnPool: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Chart labels"
                    description="Show data labels by default."
                  >
                    <ToggleSwitch
                      checked={draftSettings.showChartLabels}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ showChartLabels: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Legend"
                    description="Show legend by default."
                  >
                    <ToggleSwitch
                      checked={draftSettings.showChartLegend}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ showChartLegend: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Animation"
                    description="Animate chart transitions."
                  >
                    <ToggleSwitch
                      checked={draftSettings.chartAnimation}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ chartAnimation: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Zoom controls"
                    description="Enable ECharts data zoom by default."
                  >
                    <ToggleSwitch
                      checked={draftSettings.chartZoom}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ chartZoom: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="PNG scale"
                    description="Image export quality."
                  >
                    <CheckSelect
                      label="PNG scale"
                      hideLabel
                      value={draftSettings.pngExportScale}
                      options={EXPORT_SCALE_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ pngExportScale: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "history" ? (
                <SettingsCard
                  title="History & Restore"
                  description="Controls workspace restore point behavior."
                >
                  <SettingRow
                    title="Auto-save points"
                    description="Create restore points automatically."
                  >
                    <ToggleSwitch
                      checked={draftSettings.autoSaveHistoryPoints}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ autoSaveHistoryPoints: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="After every change"
                    description="Save a point after schema/data changes."
                  >
                    <ToggleSwitch
                      checked={draftSettings.saveHistoryAfterEveryChange}
                      onCheckedChange={(value) =>
                        updateDraftSettings({
                          saveHistoryAfterEveryChange: value,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="History limit"
                    description="Maximum restore points to keep."
                  >
                    <CheckSelect
                      label="History limit"
                      hideLabel
                      value={draftSettings.maxHistoryPoints}
                      options={HISTORY_LIMIT_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ maxHistoryPoints: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Auto-label points"
                    description="Generate labels from actions."
                  >
                    <ToggleSwitch
                      checked={draftSettings.autoLabelHistoryPoints}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ autoLabelHistoryPoints: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Confirm restore"
                    description="Ask before reverting the workspace."
                  >
                    <ToggleSwitch
                      checked={draftSettings.confirmBeforeRestore}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ confirmBeforeRestore: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Keep upload snapshot"
                    description="Always retain the original dataset state."
                  >
                    <ToggleSwitch
                      checked={draftSettings.keepUploadSnapshot}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ keepUploadSnapshot: value })
                      }
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "export" ? (
                <SettingsCard
                  title="Export Package"
                  description="Defaults for the Export package module."
                >
                  <SettingRow
                    title="Export format"
                    description="Default structured data format."
                  >
                    <CheckSelect
                      label="Export format"
                      hideLabel
                      value={draftSettings.defaultExportFormat}
                      options={EXPORT_FORMAT_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultExportFormat: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Cleaned data"
                    description="Include the working dataset."
                  >
                    <ToggleSwitch
                      checked={draftSettings.includeCleanedData}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ includeCleanedData: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Schema profile"
                    description="Include column types and metrics."
                  >
                    <ToggleSwitch
                      checked={draftSettings.includeSchemaProfile}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ includeSchemaProfile: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Cleaning history"
                    description="Include the change log."
                  >
                    <ToggleSwitch
                      checked={draftSettings.includeCleaningHistory}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ includeCleaningHistory: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Chart PNGs"
                    description="Include exported chart images."
                  >
                    <ToggleSwitch
                      checked={draftSettings.includeChartPngs}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ includeChartPngs: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="File naming"
                    description="Default package naming pattern."
                  >
                    <CheckSelect
                      label="File naming"
                      hideLabel
                      value={draftSettings.fileNamingPattern}
                      options={FILE_NAME_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ fileNamingPattern: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="CSV encoding"
                    description="Encoding used for exported CSVs."
                  >
                    <CheckSelect
                      label="CSV encoding"
                      hideLabel
                      value={draftSettings.exportCsvEncoding}
                      options={ENCODING_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ exportCsvEncoding: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>
                </SettingsCard>
              ) : null}

              {activeSection === "workspace" ? (
                <SettingsCard
                  title="Workspace"
                  description="General workspace preferences."
                >
                  <SettingRow
                    title="Landing module"
                    description="Module opened by default."
                  >
                    <CheckSelect
                      label="Landing module"
                      hideLabel
                      value={draftSettings.defaultLandingModule}
                      options={LANDING_MODULE_OPTIONS}
                      onChange={(value) =>
                        updateDraftSettings({ defaultLandingModule: value })
                      }
                      triggerClassName="min-h-9 rounded-xl !text-[13px]"
                    />
                  </SettingRow>

                  <SettingRow
                    title="Compact mode"
                    description="Prefer dense controls and smaller spacing."
                  >
                    <ToggleSwitch
                      checked={draftSettings.compactMode}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ compactMode: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Onboarding hints"
                    description="Show helper text for new workspaces."
                  >
                    <ToggleSwitch
                      checked={draftSettings.showOnboardingHints}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ showOnboardingHints: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Local persistence"
                    description="Keep workspace state in browser storage."
                  >
                    <ToggleSwitch
                      checked={draftSettings.persistWorkspaceLocally}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ persistWorkspaceLocally: value })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    title="Auto-save workspace"
                    description="Save workspace state after changes."
                  >
                    <ToggleSwitch
                      checked={draftSettings.autoSaveWorkspaceState}
                      onCheckedChange={(value) =>
                        updateDraftSettings({ autoSaveWorkspaceState: value })
                      }
                    />
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

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2">
      <p className="!text-[13px] leading-4 text-muted-foreground">{label}</p>
      <p className="mt-1 truncate !text-[13px] font-bold leading-4 text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4 !text-[13px] shadow-sm">
      <div className="mb-3">
        <h3 className="!text-[13px] font-bold leading-5 text-foreground">
          {title}
        </h3>
        <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="divide-y divide-border/70">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
  stacked = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 py-3 first:pt-0 last:pb-0",
        stacked
          ? "grid-cols-1"
          : "sm:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] sm:items-center",
      )}
    >
      <div className="min-w-0">
        <p className="!text-[13px] font-semibold leading-5 text-foreground">
          {title}
        </p>
        <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="min-w-0 sm:justify-self-end">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-8 w-[58px] items-center rounded-full border px-1 transition",
        checked
          ? "border-primary/40 bg-primary/90"
          : "border-border bg-muted/45",
      )}
    >
      <span
        className={cn(
          "size-6 rounded-full bg-background shadow-sm transition",
          checked ? "translate-x-6" : "translate-x-0",
        )}
      />
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

function DomainRulesCard({
  numericColumns,
  draftOutlierConfig,
  updateDraftOutlierConfig,
}: {
  numericColumns: {
    name: string;
    type: ColumnType;
  }[];
  draftOutlierConfig: OutlierConfig;
  updateDraftOutlierConfig: (nextConfig: Partial<OutlierConfig>) => void;
}) {
  return (
    <SettingsCard
      title="Domain Rules"
      description="Acceptable min/max bounds for numeric columns."
    >
      {numericColumns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center !text-[13px] text-muted-foreground">
          No numeric columns are available.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left !text-[13px]">
            <thead className="bg-muted/35 !text-[13px] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Column</th>
                <th className="px-3 py-2">Min</th>
                <th className="px-3 py-2">Max</th>
              </tr>
            </thead>

            <tbody>
              {numericColumns.map((column) => {
                const rule =
                  draftOutlierConfig.domainRules[column.name] ?? {};

                return (
                  <tr key={column.name} className="border-t border-border">
                    <td className="px-3 py-2 !text-[13px] font-semibold text-foreground">
                      {column.name}
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={rule.min ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;

                          updateDraftOutlierConfig({
                            domainRules: {
                              ...draftOutlierConfig.domainRules,
                              [column.name]: {
                                ...rule,
                                min:
                                  value === "" ? undefined : Number(value),
                              },
                            },
                          });
                        }}
                        className="h-8 w-full rounded-xl border border-border bg-background px-2 !text-[13px] !font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={rule.max ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;

                          updateDraftOutlierConfig({
                            domainRules: {
                              ...draftOutlierConfig.domainRules,
                              [column.name]: {
                                ...rule,
                                max:
                                  value === "" ? undefined : Number(value),
                              },
                            },
                          });
                        }}
                        className="h-8 w-full rounded-xl border border-border bg-background px-2 !text-[13px] !font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsCard>
  );
}