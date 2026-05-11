import type { ColumnType } from "@/types/dataset";
import type { CleanframeSettings, DetectionStrictness } from "@/types/cleanframeSettings";
import { DEFAULT_CLEANFRAME_SETTINGS } from "@/types/cleanframeSettings";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import {
  isConfiguredBoolean,
  parseConfiguredDate,
  parseConfiguredNumber,
} from "@/lib/settings/valueParsers";

type DetectColumnTypeOptions = Pick<
  CleanframeSettings,
  | "emptyValueTokens"
  | "detectIdColumns"
  | "numericDetectionStrictness"
  | "dateDetectionStrictness"
  | "dateParsingMode"
  | "numberParsingMode"
  | "trueValueTokens"
  | "falseValueTokens"
>;

const DEFAULT_DETECT_OPTIONS: DetectColumnTypeOptions = {
  emptyValueTokens: DEFAULT_CLEANFRAME_SETTINGS.emptyValueTokens,
  detectIdColumns: DEFAULT_CLEANFRAME_SETTINGS.detectIdColumns,
  numericDetectionStrictness: DEFAULT_CLEANFRAME_SETTINGS.numericDetectionStrictness,
  dateDetectionStrictness: DEFAULT_CLEANFRAME_SETTINGS.dateDetectionStrictness,
  dateParsingMode: DEFAULT_CLEANFRAME_SETTINGS.dateParsingMode,
  numberParsingMode: DEFAULT_CLEANFRAME_SETTINGS.numberParsingMode,
  trueValueTokens: DEFAULT_CLEANFRAME_SETTINGS.trueValueTokens,
  falseValueTokens: DEFAULT_CLEANFRAME_SETTINGS.falseValueTokens,
};

function getThreshold(strictness: DetectionStrictness) {
  if (strictness === "strict") return 0.98;
  if (strictness === "aggressive") return 0.85;
  return 0.95;
}

function getDateThreshold(strictness: DetectionStrictness) {
  if (strictness === "strict") return 0.95;
  if (strictness === "aggressive") return 0.75;
  return 0.9;
}

function ratio(values: string[], predicate: (value: string) => boolean): number {
  if (values.length === 0) return 0;
  return values.filter(predicate).length / values.length;
}

function isInteger(value: string, options: DetectColumnTypeOptions): boolean {
  const parsed = parseConfiguredNumber(value, options);
  return parsed !== null && Number.isInteger(parsed) && !String(value).includes(".");
}

function isDecimal(value: string, options: DetectColumnTypeOptions): boolean {
  const parsed = parseConfiguredNumber(value, options);
  return parsed !== null && !Number.isInteger(parsed);
}

function isNumber(value: string, options: DetectColumnTypeOptions): boolean {
  return parseConfiguredNumber(value, options) !== null;
}

function isCurrency(value: string): boolean {
  const trimmed = value.trim();
  return /^[$€£₹¥]\s?-?\d{1,3}(,\d{3})*(\.\d+)?$|^[$€£₹¥]\s?-?\d+(\.\d+)?$/.test(trimmed);
}

function isPercentage(value: string): boolean {
  return /^-?\d+(\.\d+)?%$/.test(value.trim());
}

function isDateOnly(value: string, options: DetectColumnTypeOptions): boolean {
  const trimmed = value.trim();
  if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) return false;

  const parsed = parseConfiguredDate(trimmed, options);
  if (!parsed) return false;

  return !/[T\s]\d{1,2}:\d{2}/.test(trimmed);
}

function isDatetime(value: string, options: DetectColumnTypeOptions): boolean {
  const trimmed = value.trim();
  if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) return false;

  return /\d{1,2}:\d{2}/.test(trimmed) && parseConfiguredDate(trimmed, options) !== null;
}

function isTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?(\s?(AM|PM|am|pm))?$/.test(value.trim());
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function isPhone(value: string): boolean {
  return /^\+?[\d\s().-]{7,20}$/.test(value.trim());
}

function isPostalCode(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9\s-]{2,12}$/.test(value.trim());
}

function isCountryCode(value: string): boolean {
  return /^[A-Z]{2,3}$/.test(value.trim());
}

function isLatitude(value: string, options: DetectColumnTypeOptions): boolean {
  const parsed = parseConfiguredNumber(value, options);
  return parsed !== null && parsed >= -90 && parsed <= 90;
}

function isLongitude(value: string, options: DetectColumnTypeOptions): boolean {
  const parsed = parseConfiguredNumber(value, options);
  return parsed !== null && parsed >= -180 && parsed <= 180;
}

function isJson(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;

  try {
    JSON.parse(trimmed);
    return true;
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
    normalizedName.endsWith("key") ||
    normalizedName.endsWith("_key") ||
    normalizedName.includes("identifier");

  if (!nameSuggestsId || values.length === 0) return false;

  const uniqueRatio = new Set(values).size / values.length;

  return uniqueRatio >= 0.8;
}

function columnNameSuggestsLatitude(columnName: string): boolean {
  const normalized = columnName.toLowerCase();
  return normalized === "lat" || normalized.includes("latitude");
}

function columnNameSuggestsLongitude(columnName: string): boolean {
  const normalized = columnName.toLowerCase();
  return normalized === "lng" || normalized === "lon" || normalized.includes("longitude");
}

function columnNameSuggestsPostalCode(columnName: string): boolean {
  const normalized = columnName.toLowerCase();
  return normalized.includes("zip") || normalized.includes("postal") || normalized.includes("postcode");
}

function columnNameSuggestsCountryCode(columnName: string): boolean {
  const normalized = columnName.toLowerCase();
  return (
    normalized === "country_code" ||
    normalized === "country code" ||
    normalized === "country_iso" ||
    normalized === "iso_country" ||
    normalized === "country_abbr"
  );
}

function columnNameSuggestsPhone(columnName: string): boolean {
  const normalized = columnName.toLowerCase();
  return (
    normalized.includes("phone") ||
    normalized.includes("mobile") ||
    normalized.includes("telephone") ||
    normalized.includes("contact_number")
  );
}

function columnNameSuggestsCurrency(columnName: string): boolean {
  const normalized = columnName.toLowerCase();
  return (
    normalized.includes("price") ||
    normalized.includes("revenue") ||
    normalized.includes("sales") ||
    normalized.includes("cost") ||
    normalized.includes("amount") ||
    normalized.includes("salary") ||
    normalized.includes("income") ||
    normalized.includes("payment") ||
    normalized.includes("total")
  );
}

export function detectColumnType(
  columnName: string,
  rawValues: unknown[],
  options: Partial<DetectColumnTypeOptions> = {},
): ColumnType {
  const resolvedOptions = {
    ...DEFAULT_DETECT_OPTIONS,
    ...options,
  };

  const values = rawValues
    .filter((value) => !isMissingValue(value, resolvedOptions.emptyValueTokens))
    .map((value) => String(value).trim());

  if (values.length === 0) return "text";

  const numericThreshold = getThreshold(resolvedOptions.numericDetectionStrictness);
  const dateThreshold = getDateThreshold(resolvedOptions.dateDetectionStrictness);

  if (ratio(values, isUuid) >= 0.9) return "uuid";
  if (resolvedOptions.detectIdColumns && looksLikeIdColumn(columnName, values)) return "id";
  if (ratio(values, isEmail) >= 0.9) return "email";
  if (ratio(values, isUrl) >= 0.9) return "url";
  if (ratio(values, isJson) >= 0.9) return "json";
  if (ratio(values, (value) => isConfiguredBoolean(value, resolvedOptions)) >= 0.95) return "boolean";
  if (ratio(values, (value) => isDatetime(value, resolvedOptions)) >= dateThreshold) return "datetime";
  if (ratio(values, (value) => isDateOnly(value, resolvedOptions)) >= dateThreshold) return "date";
  if (ratio(values, isTime) >= dateThreshold) return "time";
  if (columnNameSuggestsLatitude(columnName) && ratio(values, (value) => isLatitude(value, resolvedOptions)) >= numericThreshold) return "latitude";
  if (columnNameSuggestsLongitude(columnName) && ratio(values, (value) => isLongitude(value, resolvedOptions)) >= numericThreshold) return "longitude";
  if (columnNameSuggestsPhone(columnName) && ratio(values, isPhone) >= 0.9) return "phone";
  if (columnNameSuggestsCountryCode(columnName) && ratio(values, isCountryCode) >= 0.9) return "country_code";
  if (columnNameSuggestsPostalCode(columnName) && ratio(values, isPostalCode) >= 0.9) return "postal_code";
  if (ratio(values, isPercentage) >= numericThreshold) return "percentage";
  if (ratio(values, isCurrency) >= numericThreshold) return "currency";
  if (columnNameSuggestsCurrency(columnName) && ratio(values, (value) => isNumber(value, resolvedOptions)) >= numericThreshold) return "currency";
  if (ratio(values, (value) => isInteger(value, resolvedOptions)) >= numericThreshold) return "integer";
  if (ratio(values, (value) => isDecimal(value, resolvedOptions)) >= numericThreshold) return "decimal";
  if (ratio(values, (value) => isNumber(value, resolvedOptions)) >= numericThreshold) return "number";

  const uniqueCount = new Set(values).size;
  const uniqueRatio = uniqueCount / values.length;

  if (uniqueCount <= 20 || uniqueRatio <= 0.2) return "category";

  return "text";
}
