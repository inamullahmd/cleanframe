export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";

  if (Number.isInteger(value)) return value.toLocaleString();

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}