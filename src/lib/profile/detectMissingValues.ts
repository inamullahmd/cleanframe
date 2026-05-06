const MISSING_TOKENS = new Set([
  "",
  "na",
  "n/a",
  "null",
  "nil",
  "none",
  "-",
  "--",
]);

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;

  const normalized = String(value).trim().toLowerCase();

  return MISSING_TOKENS.has(normalized);
}