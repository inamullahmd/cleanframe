import type { DatasetRow } from "@/types/dataset";

export const MISSING_VALUE_TOKENS = new Set([
  "",
  "na",
  "n/a",
  "n.a.",
  "null",
  "none",
  "undefined",
  "nan",
  "-",
  "--",
  "missing",
  "not available",
  "not applicable"
]);

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;

  const normalized = String(value).trim().toLowerCase();

  return MISSING_VALUE_TOKENS.has(normalized);
}

export function countMissingValues(
  rows: DatasetRow[],
  columnName: string,
): number {
  let count = 0;

  for (const row of rows) {
    if (isMissingValue(row[columnName])) {
      count += 1;
    }
  }

  return count;
}

export function getRowsWithMissingValuesCount(
  rows: DatasetRow[],
  fields: string[],
): number {
  let count = 0;

  for (const row of rows) {
    for (const field of fields) {
      if (isMissingValue(row[field])) {
        count += 1;
        break;
      }
    }
  }

  return count;
}

export function getTotalMissingValues(
  rows: DatasetRow[],
  fields: string[],
): number {
  let total = 0;

  for (const row of rows) {
    for (const field of fields) {
      if (isMissingValue(row[field])) {
        total += 1;
      }
    }
  }

  return total;
}