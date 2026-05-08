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

function ratio(values: string[], predicate: (value: string) => boolean): number {
  if (values.length === 0) return 0;

  return values.filter(predicate).length / values.length;
}

function stripCommas(value: string): string {
  return value.replaceAll(",", "").trim();
}

function isInteger(value: string): boolean {
  return /^-?\d+$/.test(stripCommas(value));
}

function isDecimal(value: string): boolean {
  return /^-?\d+\.\d+$/.test(stripCommas(value));
}

function isNumber(value: string): boolean {
  const normalized = stripCommas(value);

  if (!normalized) return false;

  return Number.isFinite(Number(normalized));
}

function isCurrency(value: string): boolean {
  const trimmed = value.trim();

  return /^[$€£₹¥]\s?-?\d{1,3}(,\d{3})*(\.\d+)?$|^[$€£₹¥]\s?-?\d+(\.\d+)?$/.test(
    trimmed,
  );
}

function isPercentage(value: string): boolean {
  return /^-?\d+(\.\d+)?%$/.test(value.trim());
}

function isDateOnly(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) return false;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return false;

  const dateOnlyPatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    /^\d{1,2}-\d{1,2}-\d{2,4}$/,
  ];

  if (!dateOnlyPatterns.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  return !Number.isNaN(Date.parse(trimmed));
}

function isDatetime(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) return false;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return false;

  const looksLikeDatetime =
    /\d{4}-\d{2}-\d{2}[T\s]\d{1,2}:\d{2}/.test(trimmed) ||
    /\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}/.test(trimmed);

  return looksLikeDatetime && !Number.isNaN(Date.parse(trimmed));
}

function isTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?(\s?(AM|PM|am|pm))?$/.test(
    value.trim(),
  );
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
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

function isLatitude(value: string): boolean {
  const parsed = Number(value.trim());

  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
}

function isLongitude(value: string): boolean {
  const parsed = Number(value.trim());

  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
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

  return (
    normalized === "lng" ||
    normalized === "lon" ||
    normalized.includes("longitude")
  );
}

function columnNameSuggestsPostalCode(columnName: string): boolean {
  const normalized = columnName.toLowerCase();

  return (
    normalized.includes("zip") ||
    normalized.includes("postal") ||
    normalized.includes("postcode")
  );
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
): ColumnType {
  const values = rawValues
    .filter((value) => !isMissingValue(value))
    .map((value) => String(value).trim());

  if (values.length === 0) return "text";

  if (ratio(values, isUuid) >= 0.9) return "uuid";

  if (looksLikeIdColumn(columnName, values)) return "id";

  if (ratio(values, isEmail) >= 0.9) return "email";

  if (ratio(values, isUrl) >= 0.9) return "url";

  if (ratio(values, isJson) >= 0.9) return "json";

  if (ratio(values, (value) => BOOLEAN_TOKENS.has(value.toLowerCase())) >= 0.95) {
    return "boolean";
  }

  if (ratio(values, isDatetime) >= 0.9) return "datetime";

  if (ratio(values, isDateOnly) >= 0.9) return "date";

  if (ratio(values, isTime) >= 0.9) return "time";

  if (columnNameSuggestsLatitude(columnName) && ratio(values, isLatitude) >= 0.95) {
    return "latitude";
  }

  if (
    columnNameSuggestsLongitude(columnName) &&
    ratio(values, isLongitude) >= 0.95
  ) {
    return "longitude";
  }

  if (columnNameSuggestsPhone(columnName) && ratio(values, isPhone) >= 0.9) {
    return "phone";
  }

  if (
    columnNameSuggestsCountryCode(columnName) &&
    ratio(values, isCountryCode) >= 0.9
  ) {
    return "country_code";
  }

  if (
    columnNameSuggestsPostalCode(columnName) &&
    ratio(values, isPostalCode) >= 0.9
  ) {
    return "postal_code";
  }

  if (ratio(values, isPercentage) >= 0.95) return "percentage";

  if (ratio(values, isCurrency) >= 0.95) return "currency";

  if (columnNameSuggestsCurrency(columnName) && ratio(values, isNumber) >= 0.95) {
    return "currency";
  }

  if (ratio(values, isInteger) >= 0.95) return "integer";

  if (ratio(values, isDecimal) >= 0.95) return "decimal";

  if (ratio(values, isNumber) >= 0.95) return "number";

  const uniqueCount = new Set(values).size;
  const uniqueRatio = uniqueCount / values.length;

  if (uniqueCount <= 20 || uniqueRatio <= 0.2) return "category";

  return "text";
}