import type { ColumnType, DatasetRow } from "@/types/dataset";
import type {
  ColumnProfile,
  DatasetProfile,
  TopValue,
} from "@/types/profile";
import { calculateNumericStats } from "@/lib/profile/calculateNumericStats";
import { calculateQualityScore } from "@/lib/profile/calculateQualityScore";
import { detectColumnType } from "@/lib/profile/detectColumnType";
import { detectDuplicateRows } from "@/lib/profile/detectDuplicates";
import { detectOutliersIqr } from "@/lib/profile/detectOutliers";
import { isMissingValue } from "@/lib/profile/detectMissingValues";

type ProfileDatasetOptions = {
  fileName: string;
  fileSizeBytes: number;
  parseErrors?: string[];
};

function parseNumber(value: unknown): number | null {
  if (isMissingValue(value)) return null;

  const normalized = String(value)
    .trim()
    .replaceAll(",", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function getTopValues(values: unknown[], limit = 5): TopValue[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (isMissingValue(value)) continue;

    const normalized = String(value).trim();

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
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
      "Review numeric outliers detected by the IQR method before deciding whether to keep or remove them.",
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
  const duplicateRowCount = detectDuplicateRows(rows, fields);

  let totalMissingValues = 0;
  let totalOutliers = 0;
  let numericValueCount = 0;

  const columnTypeCounts: Record<ColumnType, number> = {
    number: 0,
    date: 0,
    category: 0,
    text: 0,
    boolean: 0,
    id: 0,
    email: 0,
    url: 0,
    currency: 0,
  };

  const columns: ColumnProfile[] = fields.map((field) => {
    const values = rows.map((row) => row[field]);
    const missingCount = values.filter(isMissingValue).length;
    const presentValues = values.filter((value) => !isMissingValue(value));

    const type = detectColumnType(field, values);

    totalMissingValues += missingCount;
    columnTypeCounts[type] += 1;

    const shouldCalculateNumericStats =
      type === "number" || type === "currency";

    const numericValues = shouldCalculateNumericStats
      ? values
          .map(parseNumber)
          .filter((value): value is number => value !== null)
      : [];

    const numericSummary = shouldCalculateNumericStats
      ? calculateNumericStats(numericValues)
      : undefined;

    const outliers = shouldCalculateNumericStats
      ? detectOutliersIqr(numericValues)
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
      uniqueCount: new Set(
        presentValues.map((value) => String(value).trim()),
      ).size,
      topValues: getTopValues(values),
      numericSummary,
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