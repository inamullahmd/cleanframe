import type { ColumnType, DatasetRow } from "@/types/dataset";

export type TopValue = {
  value: string;
  count: number;
};

export type NumericSummary = {
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  q1: number;
  q3: number;
};

export type OutlierSummary = {
  count: number;
  lowerFence: number;
  upperFence: number;
};

export type ColumnProfile = {
  name: string;
  type: ColumnType;
  totalValues: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  topValues: TopValue[];
  numericSummary?: NumericSummary;
  outliers?: OutlierSummary;
};

export type DatasetProfile = {
  fileName: string;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  duplicateRowCount: number;
  qualityScore: number;
  columns: ColumnProfile[];
  previewRows: DatasetRow[];
  columnTypeCounts: Record<ColumnType, number>;
  missingValuesChartData: {
    column: string;
    missing: number;
  }[];
  recommendations: string[];
  createdAt: string;
  parseErrors: string[];
};