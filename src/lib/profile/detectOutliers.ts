import { quantile } from "@/lib/profile/calculateNumericStats";

export function detectOutliersIqr(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length < 4) {
    return {
      count: 0,
      lowerFence: 0,
      upperFence: 0,
    };
  }

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const count = sorted.filter(
    (value) => value < lowerFence || value > upperFence,
  ).length;

  return {
    count,
    lowerFence,
    upperFence,
  };
}