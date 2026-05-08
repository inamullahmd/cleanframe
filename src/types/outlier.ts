export type OutlierDetectionMethod =
  | "iqr"
  | "z_score"
  | "modified_z_score"
  | "percentile"
  | "std_dev"
  | "domain_rules"
  | "isolation_forest";

export type DomainRule = {
  min?: number;
  max?: number;
};

export type OutlierConfig = {
  method: OutlierDetectionMethod;

  iqrMultiplier: number;

  zScoreThreshold: number;

  modifiedZScoreThreshold: number;

  percentileLower: number;
  percentileUpper: number;

  stdDevMultiplier: number;

  domainRules: Record<string, DomainRule>;

  isolationTrees: number;
  isolationSampleSize: number;
  isolationScoreThreshold: number;
};

export const DEFAULT_OUTLIER_CONFIG: OutlierConfig = {
  method: "iqr",

  iqrMultiplier: 1.5,

  zScoreThreshold: 3,

  modifiedZScoreThreshold: 3.5,

  percentileLower: 1,
  percentileUpper: 99,

  stdDevMultiplier: 3,

  domainRules: {},

  isolationTrees: 50,
  isolationSampleSize: 256,
  isolationScoreThreshold: 0.65,
};