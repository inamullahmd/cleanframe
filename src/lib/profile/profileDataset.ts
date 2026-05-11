import type { ColumnType, DatasetRow } from "@/types/dataset";
import type {
  ColumnProfile,
  DatasetProfile,
  DateSummary,
  TopValue,
} from "@/types/profile";
import { calculateNumericStats } from "@/lib/profile/calculateNumericStats";
import { calculateQualityScore } from "@/lib/profile/calculateQualityScore";
import { detectColumnType } from "@/lib/profile/detectColumnType";
import { detectDuplicateRows } from "@/lib/profile/detectDuplicates";
import { detectOutliers } from "@/lib/profile/detectOutliers";
import type { OutlierConfig } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import {
  parseConfiguredDate,
  parseConfiguredNumber,
} from "@/lib/settings/valueParsers";
import {
  DEFAULT_CLEANFRAME_SETTINGS,
  type CleanframeSettings,
} from "@/types/cleanframeSettings";
import { loadCleanframeSettings } from "@/lib/settings/cleanframeSettings";

type ProfileDatasetOptions = {
  fileName: string;
  fileSizeBytes: number;
  parseErrors?: string[];
  outlierConfig?: OutlierConfig;
  columnTypeOverrides?: Partial<Record<string, ColumnType>>;
  settings?: Partial<CleanframeSettings>;
};

const NUMERIC_PROFILE_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

const DATE_PROFILE_TYPES: ColumnType[] = ["date", "datetime"];

export function createEmptyColumnTypeCounts(): Record<ColumnType, number> {
  return {
    integer: 0,
    decimal: 0,
    number: 0,
    percentage: 0,
    currency: 0,
    date: 0,
    datetime: 0,
    time: 0,
    boolean: 0,
    category: 0,
    text: 0,
    id: 0,
    uuid: 0,
    email: 0,
    phone: 0,
    url: 0,
    postal_code: 0,
    country_code: 0,
    latitude: 0,
    longitude: 0,
    json: 0,
  };
}

function resolveProfileSettings(settings?: Partial<CleanframeSettings>) {
  if (settings) {
    return {
      ...DEFAULT_CLEANFRAME_SETTINGS,
      ...settings,
    };
  }

  return loadCleanframeSettings();
}

function getProfileRows(rows: DatasetRow[], profileSampleSize: CleanframeSettings["profileSampleSize"]) {
  if (profileSampleSize === "full") return rows;

  return rows.slice(0, Number(profileSampleSize));
}

function parseNumber(value: unknown, settings: CleanframeSettings): number | null {
  return parseConfiguredNumber(value, {
    numberParsingMode: settings.numberParsingMode,
    emptyValueTokens: settings.emptyValueTokens,
  });
}

function getTopValues(
  values: unknown[],
  settings: CleanframeSettings,
  limit = 5,
): TopValue[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (isMissingValue(value, settings.emptyValueTokens)) continue;

    const normalized = String(value).trim();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function calculateDateSummary(
  values: unknown[],
  settings: CleanframeSettings,
): DateSummary | undefined {
  const parsedDates = values
    .filter((value) => !isMissingValue(value, settings.emptyValueTokens))
    .map((value) => {
      const rawValue = String(value).trim();
      const parsedDate = parseConfiguredDate(rawValue, {
        dateParsingMode: settings.dateParsingMode,
        emptyValueTokens: settings.emptyValueTokens,
      });

      if (!parsedDate) return null;

      return {
        rawValue,
        timestamp: parsedDate.getTime(),
      };
    })
    .filter(
      (value): value is { rawValue: string; timestamp: number } =>
        value !== null,
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (parsedDates.length === 0) return undefined;

  return {
    min: parsedDates[0]?.rawValue ?? "",
    max: parsedDates[parsedDates.length - 1]?.rawValue ?? "",
  };
}

function countRowsWithMissingValues(
  rows: DatasetRow[],
  fields: string[],
  settings: CleanframeSettings,
): number {
  return rows.filter((row) =>
    fields.some((field) => isMissingValue(row[field], settings.emptyValueTokens)),
  ).length;
}

function buildRecommendations(
  columns: ColumnProfile[],
  duplicateRowCount: number,
): string[] {
  const recommendations: string[] = [];
  const missingColumns = columns.filter((column) => column.missingCount > 0);
  const outlierColumns = columns.filter(
    (column) => column.outliers && column.outliers.count > 0,
  );

  if (missingColumns.length > 0) {
    recommendations.push(
      "Review missing values. Fill numeric columns with median and categorical columns with mode.",
    );
  }

  if (duplicateRowCount > 0) {
    recommendations.push("Remove duplicate rows before analysis or export.");
  }

  if (outlierColumns.length > 0) {
    recommendations.push(
      "Review numeric outliers detected by the selected method before deciding whether to keep or remove them.",
    );
  }

  if (columns.some((column) => column.type === "text")) {
    recommendations.push(
      "Trim whitespace and standardize text formatting where appropriate.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Dataset looks clean based on the current checks.");
  }

  return recommendations;
}

export function profileDataset(
  rows: DatasetRow[],
  fields: string[],
  options: ProfileDatasetOptions,
): DatasetProfile {
  const settings = resolveProfileSettings(options.settings);
  const outlierConfig = options.outlierConfig ?? DEFAULT_OUTLIER_CONFIG;
  const profileRows = getProfileRows(rows, settings.profileSampleSize);
  const duplicateRowCount = detectDuplicateRows(rows, fields);
  const rowsWithMissingValuesCount = countRowsWithMissingValues(
    rows,
    fields,
    settings,
  );

  let totalMissingValues = 0;
  let totalOutliers = 0;
  let numericValueCount = 0;
  const columnTypeCounts = createEmptyColumnTypeCounts();

  const columns: ColumnProfile[] = fields.map((field) => {
    const values = rows.map((row) => row[field]);
    const sampledValues = profileRows.map((row) => row[field]);
    const missingCount = values.filter((value) =>
      isMissingValue(value, settings.emptyValueTokens),
    ).length;
    const presentValues = values.filter(
      (value) => !isMissingValue(value, settings.emptyValueTokens),
    );
    const type =
      options.columnTypeOverrides?.[field] ??
      detectColumnType(field, sampledValues, settings);

    totalMissingValues += missingCount;
    columnTypeCounts[type] += 1;

    const shouldCalculateNumericStats = NUMERIC_PROFILE_TYPES.includes(type);
    const shouldCalculateDateStats = DATE_PROFILE_TYPES.includes(type);
    const numericValues = shouldCalculateNumericStats
      ? values
          .map((value) => parseNumber(value, settings))
          .filter((value): value is number => value !== null)
      : [];
    const numericSummary = shouldCalculateNumericStats
      ? calculateNumericStats(numericValues)
      : undefined;
    const outliers = shouldCalculateNumericStats
      ? detectOutliers(numericValues, outlierConfig, field)
      : undefined;
    const dateSummary = shouldCalculateDateStats
      ? calculateDateSummary(values, settings)
      : undefined;

    if (shouldCalculateNumericStats) {
      numericValueCount += numericValues.length;
      totalOutliers += outliers?.count ?? 0;
    }

    return {
      name: field,
      type,
      totalValues: values.length,
      missingCount,
      missingPercentage:
        values.length === 0 ? 0 : (missingCount / values.length) * 100,
      uniqueCount: new Set(presentValues.map((value) => String(value).trim())).size,
      topValues: getTopValues(values, settings),
      numericSummary,
      dateSummary,
      outliers,
    };
  });

  const qualityScore = calculateQualityScore({
    rowCount: rows.length,
    columnCount: fields.length,
    totalMissingValues,
    duplicateRowCount,
    totalOutliers,
    numericValueCount,
  });

  return {
    fileName: options.fileName,
    fileSizeBytes: options.fileSizeBytes,
    rowCount: rows.length,
    columnCount: fields.length,
    duplicateRowCount,
    rowsWithMissingValuesCount,
    qualityScore,
    columns,
    previewRows: rows.slice(0, 25),
    columnTypeCounts,
    missingValuesChartData: columns.map((column) => ({
      column: column.name,
      missing: column.missingCount,
    })),
    recommendations: buildRecommendations(columns, duplicateRowCount),
    createdAt: new Date().toISOString(),
    parseErrors: options.parseErrors ?? [],
  };
}
