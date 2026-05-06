type QualityScoreInput = {
  rowCount: number;
  columnCount: number;
  totalMissingValues: number;
  duplicateRowCount: number;
  totalOutliers: number;
  numericValueCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateQualityScore(input: QualityScoreInput): number {
  const totalCells = input.rowCount * input.columnCount;

  if (totalCells === 0) return 0;

  const missingRatio = input.totalMissingValues / totalCells;

  const duplicateRatio =
    input.rowCount === 0 ? 0 : input.duplicateRowCount / input.rowCount;

  const outlierRatio =
    input.numericValueCount === 0
      ? 0
      : input.totalOutliers / input.numericValueCount;

  const score =
    100 -
    missingRatio * 45 -
    duplicateRatio * 30 -
    outlierRatio * 15;

  return Math.round(clamp(score, 0, 100));
}