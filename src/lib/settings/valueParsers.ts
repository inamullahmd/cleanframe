import type {
  CleanframeSettings,
  DateParsingMode,
  NumberParsingMode,
} from "@/types/cleanframeSettings";
import { DEFAULT_CLEANFRAME_SETTINGS } from "@/types/cleanframeSettings";
import { isMissingValue } from "@/lib/profile/detectMissingValues";

export type NumberParserOptions = {
  numberParsingMode?: NumberParsingMode;
  emptyValueTokens?: string;
};

export type DateParserOptions = {
  dateParsingMode?: DateParsingMode;
  emptyValueTokens?: string;
};

export function splitTokenList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeNumberInput(
  value: unknown,
  mode: NumberParsingMode = "balanced",
) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) return "";

  if (mode === "strict") {
    return /^-?\d+(\.\d+)?$/.test(rawValue) ? rawValue : "";
  }

  if (mode === "aggressive") {
    return rawValue
      .replace(/\(([^)]+)\)/, "-$1")
      .replaceAll(",", "")
      .replace("%", "")
      .replace(/[^\d.-]/g, "");
  }

  return rawValue
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^\(([^)]+)\)$/, "-$1")
    .replace(/^[^\d.-]+/, "")
    .replace(/[^\d.-]+$/, "");
}

export function parseConfiguredNumber(
  value: unknown,
  options: NumberParserOptions = {},
): number | null {
  if (isMissingValue(value, options.emptyValueTokens)) return null;

  const normalized = normalizeNumberInput(value, options.numberParsingMode);

  if (!normalized || normalized === "-" || normalized === ".") return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildDateFromParts(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseUsOrEuDate(value: string, mode: "us" | "eu") {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+.*)?$/);

  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) year += year >= 70 ? 1900 : 2000;

  const month = mode === "us" ? first : second;
  const day = mode === "us" ? second : first;

  return buildDateFromParts(year, month, day);
}

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);

  if (!match) return null;

  return buildDateFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function parseConfiguredDate(
  value: unknown,
  options: DateParserOptions = {},
): Date | null {
  if (isMissingValue(value, options.emptyValueTokens)) return null;

  const rawValue = String(value ?? "").trim();
  const mode = options.dateParsingMode ?? "auto";

  if (!rawValue || /^\d+(\.\d+)?$/.test(rawValue)) return null;

  if (mode === "iso") return parseIsoDate(rawValue);
  if (mode === "us") return parseUsOrEuDate(rawValue, "us");
  if (mode === "eu") return parseUsOrEuDate(rawValue, "eu");

  const isoDate = parseIsoDate(rawValue);
  if (isoDate) return isoDate;

  const browserDate = new Date(rawValue);
  if (!Number.isNaN(browserDate.getTime())) return browserDate;

  return parseUsOrEuDate(rawValue, "us") ?? parseUsOrEuDate(rawValue, "eu");
}

export function isConfiguredBoolean(
  value: unknown,
  settings: Pick<
    CleanframeSettings,
    "emptyValueTokens" | "trueValueTokens" | "falseValueTokens"
  >,
) {
  if (isMissingValue(value, settings.emptyValueTokens)) return false;

  const normalized = String(value ?? "").trim().toLowerCase();
  const trueTokens = splitTokenList(settings.trueValueTokens);
  const falseTokens = splitTokenList(settings.falseValueTokens);

  return trueTokens.includes(normalized) || falseTokens.includes(normalized);
}

export function formatConfiguredBoolean(
  value: unknown,
  settings: Pick<
    CleanframeSettings,
    "emptyValueTokens" | "trueValueTokens" | "falseValueTokens"
  >,
) {
  if (isMissingValue(value, settings.emptyValueTokens)) return "";

  const normalized = String(value ?? "").trim().toLowerCase();
  const trueTokens = splitTokenList(settings.trueValueTokens);
  const falseTokens = splitTokenList(settings.falseValueTokens);

  if (trueTokens.includes(normalized)) return "Yes";
  if (falseTokens.includes(normalized)) return "No";

  return String(value ?? "");
}

export function getGridNumberDecimalPlaces(
  settings: Partial<CleanframeSettings>,
) {
  return {
    number: settings.numberDecimalPlaces ?? DEFAULT_CLEANFRAME_SETTINGS.numberDecimalPlaces,
    currency:
      settings.currencyDecimalPlaces ?? DEFAULT_CLEANFRAME_SETTINGS.currencyDecimalPlaces,
    percentage:
      settings.percentageDecimalPlaces ??
      DEFAULT_CLEANFRAME_SETTINGS.percentageDecimalPlaces,
    coordinate:
      settings.coordinateDecimalPlaces ??
      DEFAULT_CLEANFRAME_SETTINGS.coordinateDecimalPlaces,
  };
}
