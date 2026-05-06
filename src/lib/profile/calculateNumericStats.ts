import type { NumericSummary } from "@/types/profile";

export function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;

  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;

  const baseValue = sortedValues[base] ?? 0;
  const nextValue = sortedValues[base + 1];

  if (nextValue !== undefined) {
    return baseValue + rest * (nextValue - baseValue);
  }

  return baseValue;
}

export function calculateNumericStats(
  values: number[],
): NumericSummary | undefined {
  if (values.length === 0) return undefined;

  const sorted = [...values].sort((a, b) => a - b);

  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  const variance =
    sorted.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    sorted.length;

  return {
    min,
    max,
    mean,
    median,
    standardDeviation: Math.sqrt(variance),
    q1,
    q3,
  };
}