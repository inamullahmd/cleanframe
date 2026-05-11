import type { DatasetRow } from "@/types/dataset";
import {
  CLEANFRAME_SETTINGS_STORAGE_KEY,
  DEFAULT_CLEANFRAME_SETTINGS,
  LEGACY_CLEANFRAME_SETTINGS_STORAGE_KEY,
} from "@/types/cleanframeSettings";

export const DEFAULT_MISSING_VALUE_TOKENS = [
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
  "not applicable",
];

export function parseMissingValueTokens(emptyValueTokens?: string) {
  const customTokens =
    emptyValueTokens
      ?.split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean) ?? [];

  return new Set([
    ...DEFAULT_MISSING_VALUE_TOKENS,
    ...customTokens.map((token) => (token === "empty" ? "" : token)),
  ]);
}

function getRuntimeEmptyValueTokens(emptyValueTokens?: string) {
  if (emptyValueTokens !== undefined) return emptyValueTokens;

  if (typeof window === "undefined") {
    return DEFAULT_CLEANFRAME_SETTINGS.emptyValueTokens;
  }

  try {
    const rawSettings =
      window.localStorage.getItem(CLEANFRAME_SETTINGS_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_CLEANFRAME_SETTINGS_STORAGE_KEY);

    if (!rawSettings) return DEFAULT_CLEANFRAME_SETTINGS.emptyValueTokens;

    const settings = JSON.parse(rawSettings) as { emptyValueTokens?: string };

    return settings.emptyValueTokens ?? DEFAULT_CLEANFRAME_SETTINGS.emptyValueTokens;
  } catch {
    return DEFAULT_CLEANFRAME_SETTINGS.emptyValueTokens;
  }
}

export function createMissingValueChecker(emptyValueTokens?: string) {
  const tokens = parseMissingValueTokens(getRuntimeEmptyValueTokens(emptyValueTokens));

  return function isConfiguredMissingValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;

    const normalized = String(value).trim().toLowerCase();

    return tokens.has(normalized);
  };
}

export function isMissingValue(
  value: unknown,
  emptyValueTokens?: string,
): boolean {
  return createMissingValueChecker(emptyValueTokens)(value);
}

export function countMissingValues(
  rows: DatasetRow[],
  columnName: string,
  emptyValueTokens?: string,
): number {
  const isConfiguredMissingValue = createMissingValueChecker(emptyValueTokens);

  let count = 0;

  for (const row of rows) {
    if (isConfiguredMissingValue(row[columnName])) {
      count += 1;
    }
  }

  return count;
}

export function getRowsWithMissingValuesCount(
  rows: DatasetRow[],
  fields: string[],
  emptyValueTokens?: string,
): number {
  const isConfiguredMissingValue = createMissingValueChecker(emptyValueTokens);

  let count = 0;

  for (const row of rows) {
    for (const field of fields) {
      if (isConfiguredMissingValue(row[field])) {
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
  emptyValueTokens?: string,
): number {
  const isConfiguredMissingValue = createMissingValueChecker(emptyValueTokens);

  let total = 0;

  for (const row of rows) {
    for (const field of fields) {
      if (isConfiguredMissingValue(row[field])) {
        total += 1;
      }
    }
  }

  return total;
}
