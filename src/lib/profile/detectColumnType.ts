import type { ColumnType } from "@/types/dataset";
import { isMissingValue } from "@/lib/profile/detectMissingValues";

const BOOLEAN_TOKENS = new Set([
  "true",
  "false",
  "yes",
  "no",
  "y",
  "n",
  "0",
  "1",
]);

function isNumeric(value: string): boolean {
  if (value.trim() === "") return false;

  const normalized = value.replaceAll(",", "");

  return Number.isFinite(Number(normalized));
}

function isCurrency(value: string): boolean {
  const trimmed = value.trim();

  return /^[$€£₹]?\s?-?\d{1,3}(,\d{3})*(\.\d+)?$|^[$€£₹]?\s?-?\d+(\.\d+)?$/.test(
    trimmed,
  );
}

function isDateLike(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) return false;

  if (/^\d+(\.\d+)?$/.test(trimmed)) return false;

  const parsed = Date.parse(trimmed);

  return !Number.isNaN(parsed);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function looksLikeIdColumn(columnName: string, values: string[]): boolean {
  const normalizedName = columnName.toLowerCase();

  const nameSuggestsId =
    normalizedName === "id" ||
    normalizedName.endsWith("_id") ||
    normalizedName.endsWith(" id") ||
    normalizedName.includes("uuid") ||
    normalizedName.includes("guid") ||
    normalizedName.endsWith("key");

  if (!nameSuggestsId || values.length === 0) return false;

  const uniqueRatio = new Set(values).size / values.length;

  return uniqueRatio >= 0.8;
}

function ratio(values: string[], predicate: (value: string) => boolean): number {
  if (values.length === 0) return 0;

  return values.filter(predicate).length / values.length;
}

export function detectColumnType(
  columnName: string,
  rawValues: unknown[],
): ColumnType {
  const values = rawValues
    .filter((value) => !isMissingValue(value))
    .map((value) => String(value).trim());

  if (values.length === 0) return "text";

  if (looksLikeIdColumn(columnName, values)) return "id";

  if (ratio(values, isEmail) >= 0.9) return "email";

  if (ratio(values, isUrl) >= 0.9) return "url";

  if (ratio(values, (value) => BOOLEAN_TOKENS.has(value.toLowerCase())) >= 0.95) {
    return "boolean";
  }

  if (ratio(values, isCurrency) >= 0.95) return "currency";

  if (ratio(values, isNumeric) >= 0.95) return "number";

  if (ratio(values, isDateLike) >= 0.9) return "date";

  const uniqueCount = new Set(values).size;
  const uniqueRatio = uniqueCount / values.length;

  if (uniqueCount <= 20 || uniqueRatio <= 0.2) return "category";

  return "text";
}