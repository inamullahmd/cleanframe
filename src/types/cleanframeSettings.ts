import type { CsvEncoding } from "@/types/settings";

export type CsvDelimiter =
  | "auto"
  | "comma"
  | "semicolon"
  | "tab"
  | "pipe"
  | "custom";
export type DateParsingMode = "auto" | "us" | "iso" | "eu";
export type NumberParsingMode = "balanced" | "strict" | "aggressive";
export type ColumnNameFormat =
  | "original"
  | "title_case_spaces"
  | "snake_case"
  | "camel_case"
  | "lowercase_spaces";
export type DuplicateColumnStrategy = "append_suffix" | "keep_first" | "make_unique";
export type ProfileSampleSize = "full" | "5000" | "10000" | "25000";
export type DetectionStrictness = "strict" | "balanced" | "aggressive";
export type ValueDisplayMode = "formatted" | "raw";
export type RowDensity = "compact" | "comfortable";
export type PageSize = "10" | "25" | "50" | "100";
export type ChartType = "bar" | "line" | "area" | "pie" | "scatter" | "histogram";
export type ChartAggregation = "count" | "sum" | "average" | "median" | "min" | "max";
export type ChartColumnPool =
  | "recommended"
  | "categorical"
  | "boolean"
  | "numeric"
  | "date_time"
  | "all_columns";
export type ExportScale = "1" | "2" | "3";
export type DuplicateHandling = "keep_first" | "keep_last" | "mark_only";
export type CasingCleanup = "none" | "title_case" | "lowercase" | "uppercase";
export type MaxHistoryPoints = "25" | "50" | "100";
export type ExportFormat = "csv" | "json";
export type FileNamingPattern =
  | "dataset_timestamp"
  | "dataset_only"
  | "cleanframe_timestamp";
export type LandingModule = "upload" | "schema" | "data" | "clean" | "history" | "charts" | "export";

export type CleanframeSettings = {
  delimiter: CsvDelimiter;
  customDelimiter: string;
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
  defaultGridTextSize: number;
  numberDecimalPlaces: number;
  currencyDecimalPlaces: number;
  percentageDecimalPlaces: number;
  coordinateDecimalPlaces: number;
  currencyCode: string;
  trueValueTokens: string;
  falseValueTokens: string;
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
  defaultUnknownFillValue: string;
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

export const DEFAULT_CLEANFRAME_SETTINGS: CleanframeSettings = {
  delimiter: "auto",
  customDelimiter: "",
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
  defaultGridTextSize: 12,
  numberDecimalPlaces: 2,
  currencyDecimalPlaces: 2,
  percentageDecimalPlaces: 2,
  coordinateDecimalPlaces: 5,
  currencyCode: "USD",
  trueValueTokens: "true, 1, yes, y",
  falseValueTokens: "false, 0, no, n",
  highlightMissingValues: true,
  highlightOutliers: true,
  stickyTableHeader: true,
  showRowNumbers: true,

  defaultChartType: "bar",
  defaultAggregation: "count",
  defaultColumnPool: "recommended",
  showChartLabels: true,
  showChartLegend: false,
  chartAnimation: true,
  chartZoom: false,
  pngExportScale: "2",

  duplicateHandling: "keep_first",
  whitespaceCleanup: true,
  textNormalization: false,
  casingCleanup: "none",
  autoHistoryBeforeCleaning: true,
  defaultUnknownFillValue: "Unknown",
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

  defaultLandingModule: "schema",
  compactMode: true,
  showOnboardingHints: false,
  persistWorkspaceLocally: false,
  autoSaveWorkspaceState: true,
};

export const CLEANFRAME_SETTINGS_STORAGE_KEY = "cleanframe-settings-v3";
export const LEGACY_CLEANFRAME_SETTINGS_STORAGE_KEY = "cleanframe-settings-v2";
export const CLEANFRAME_SETTINGS_CHANGE_EVENT = "cleanframe-settings-change";
