import type { OutlierSummary } from "@/types/profile";
import type { OutlierConfig } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import { quantile } from "@/lib/profile/calculateNumericStats";

const EPSILON = 1e-9;
const EULER_MASCHERONI = 0.5772156649;

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const average = mean(values);

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;

  return quantile([...values].sort((a, b) => a - b), 0.5);
}

function medianAbsoluteDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const med = median(values);

  const deviations = values.map((value) => Math.abs(value - med));

  return median(deviations);
}

function buildFenceSummary({
  values,
  method,
  lowerFence,
  upperFence,
  threshold,
}: {
  values: number[];
  method: OutlierSummary["method"];
  lowerFence?: number;
  upperFence?: number;
  threshold?: number;
}): OutlierSummary {
  const outlierValues = uniqueNumbers(
    values.filter((value) => {
      if (lowerFence !== undefined && value < lowerFence) return true;
      if (upperFence !== undefined && value > upperFence) return true;

      return false;
    }),
  );

  return {
    method,
    count: values.filter((value) =>
      outlierValues.some((outlierValue) => Math.abs(outlierValue - value) < EPSILON),
    ).length,
    lowerFence,
    upperFence,
    threshold,
    outlierValues,
  };
}

function detectIqr(values: number[], config: OutlierConfig): OutlierSummary {
  if (values.length < 4) {
    return {
      method: "iqr",
      count: 0,
      lowerFence: 0,
      upperFence: 0,
      threshold: config.iqrMultiplier,
      outlierValues: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerFence = q1 - config.iqrMultiplier * iqr;
  const upperFence = q3 + config.iqrMultiplier * iqr;

  return buildFenceSummary({
    values,
    method: "iqr",
    lowerFence,
    upperFence,
    threshold: config.iqrMultiplier,
  });
}

function detectZScore(values: number[], config: OutlierConfig): OutlierSummary {
  const average = mean(values);
  const sd = standardDeviation(values);

  if (sd === 0) {
    return {
      method: "z_score",
      count: 0,
      threshold: config.zScoreThreshold,
      outlierValues: [],
    };
  }

  const lowerFence = average - config.zScoreThreshold * sd;
  const upperFence = average + config.zScoreThreshold * sd;

  return buildFenceSummary({
    values,
    method: "z_score",
    lowerFence,
    upperFence,
    threshold: config.zScoreThreshold,
  });
}

function detectModifiedZScore(
  values: number[],
  config: OutlierConfig,
): OutlierSummary {
  const med = median(values);
  const mad = medianAbsoluteDeviation(values);

  if (mad === 0) {
    return {
      method: "modified_z_score",
      count: 0,
      threshold: config.modifiedZScoreThreshold,
      outlierValues: [],
    };
  }

  const outlierValues = uniqueNumbers(
    values.filter((value) => {
      const score = (0.6745 * (value - med)) / mad;

      return Math.abs(score) > config.modifiedZScoreThreshold;
    }),
  );

  return {
    method: "modified_z_score",
    count: values.filter((value) =>
      outlierValues.some((outlierValue) => Math.abs(outlierValue - value) < EPSILON),
    ).length,
    lowerFence: med - (config.modifiedZScoreThreshold * mad) / 0.6745,
    upperFence: med + (config.modifiedZScoreThreshold * mad) / 0.6745,
    threshold: config.modifiedZScoreThreshold,
    outlierValues,
  };
}

function detectPercentile(
  values: number[],
  config: OutlierConfig,
): OutlierSummary {
  const sorted = [...values].sort((a, b) => a - b);

  const lowerPercentile = Math.max(0, Math.min(config.percentileLower, 100));
  const upperPercentile = Math.max(0, Math.min(config.percentileUpper, 100));

  const lowerFence = quantile(sorted, lowerPercentile / 100);
  const upperFence = quantile(sorted, upperPercentile / 100);

  return buildFenceSummary({
    values,
    method: "percentile",
    lowerFence,
    upperFence,
    threshold: upperPercentile,
  });
}

function detectStandardDeviation(
  values: number[],
  config: OutlierConfig,
): OutlierSummary {
  const average = mean(values);
  const sd = standardDeviation(values);

  const lowerFence = average - config.stdDevMultiplier * sd;
  const upperFence = average + config.stdDevMultiplier * sd;

  return buildFenceSummary({
    values,
    method: "std_dev",
    lowerFence,
    upperFence,
    threshold: config.stdDevMultiplier,
  });
}

function detectDomainRules(
  values: number[],
  columnName: string,
  config: OutlierConfig,
): OutlierSummary {
  const rule = config.domainRules[columnName];

  if (!rule || (rule.min === undefined && rule.max === undefined)) {
    return {
      method: "domain_rules",
      count: 0,
      lowerFence: rule?.min,
      upperFence: rule?.max,
      outlierValues: [],
    };
  }

  return buildFenceSummary({
    values,
    method: "domain_rules",
    lowerFence: rule.min,
    upperFence: rule.max,
  });
}

function createSeededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return state / 4294967296;
  };
}

function averagePathLength(size: number): number {
  if (size <= 1) return 0;
  if (size === 2) return 1;

  return (
    2 * (Math.log(size - 1) + EULER_MASCHERONI) -
    (2 * (size - 1)) / size
  );
}

function sampleValues(
  values: number[],
  sampleSize: number,
  random: () => number,
): number[] {
  const sample: number[] = [];

  for (let index = 0; index < sampleSize; index += 1) {
    const randomIndex = Math.floor(random() * values.length);
    const value = values[randomIndex];

    if (value !== undefined) {
      sample.push(value);
    }
  }

  return sample;
}

function isolationPathLength({
  value,
  sample,
  depth,
  maxDepth,
  random,
}: {
  value: number;
  sample: number[];
  depth: number;
  maxDepth: number;
  random: () => number;
}): number {
  if (sample.length <= 1 || depth >= maxDepth) {
    return depth + averagePathLength(sample.length);
  }

  const min = Math.min(...sample);
  const max = Math.max(...sample);

  if (min === max) {
    return depth + averagePathLength(sample.length);
  }

  const split = min + random() * (max - min);

  const nextSample = sample.filter((sampleValue) =>
    value < split ? sampleValue < split : sampleValue >= split,
  );

  return isolationPathLength({
    value,
    sample: nextSample,
    depth: depth + 1,
    maxDepth,
    random,
  });
}

function detectIsolationForest(
  values: number[],
  config: OutlierConfig,
): OutlierSummary {
  if (values.length < 8) {
    return {
      method: "isolation_forest",
      count: 0,
      threshold: config.isolationScoreThreshold,
      outlierValues: [],
    };
  }

  const uniqueValues = uniqueNumbers(values);

  const sampleSize = Math.min(
    Math.max(8, config.isolationSampleSize),
    values.length,
  );

  const treeCount = Math.max(10, config.isolationTrees);
  const maxDepth = Math.ceil(Math.log2(sampleSize));
  const c = averagePathLength(sampleSize);

  const random = createSeededRandom(42);

  const outlierValues = uniqueValues.filter((value) => {
    let pathLengthSum = 0;

    for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
      const sample = sampleValues(values, sampleSize, random);

      pathLengthSum += isolationPathLength({
        value,
        sample,
        depth: 0,
        maxDepth,
        random,
      });
    }

    const averageLength = pathLengthSum / treeCount;
    const anomalyScore = Math.pow(2, -averageLength / c);

    return anomalyScore >= config.isolationScoreThreshold;
  });

  return {
    method: "isolation_forest",
    count: values.filter((value) =>
      outlierValues.some((outlierValue) => Math.abs(outlierValue - value) < EPSILON),
    ).length,
    threshold: config.isolationScoreThreshold,
    outlierValues,
  };
}

export function detectOutliers(
  values: number[],
  config: OutlierConfig = DEFAULT_OUTLIER_CONFIG,
  columnName = "",
): OutlierSummary {
  if (values.length === 0) {
    return {
      method: config.method,
      count: 0,
      outlierValues: [],
    };
  }

  if (config.method === "z_score") {
    return detectZScore(values, config);
  }

  if (config.method === "modified_z_score") {
    return detectModifiedZScore(values, config);
  }

  if (config.method === "percentile") {
    return detectPercentile(values, config);
  }

  if (config.method === "std_dev") {
    return detectStandardDeviation(values, config);
  }

  if (config.method === "domain_rules") {
    return detectDomainRules(values, columnName, config);
  }

  if (config.method === "isolation_forest") {
    return detectIsolationForest(values, config);
  }

  return detectIqr(values, config);
}

export function isValueOutlier(
  value: unknown,
  outlierSummary?: OutlierSummary,
): boolean {
  if (!outlierSummary || outlierSummary.count === 0) return false;

  const normalized = String(value ?? "")
    .trim()
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return false;

  if (
    outlierSummary.outlierValues.some(
      (outlierValue) => Math.abs(outlierValue - parsed) < EPSILON,
    )
  ) {
    return true;
  }

  if (
    outlierSummary.lowerFence !== undefined &&
    parsed < outlierSummary.lowerFence
  ) {
    return true;
  }

  if (
    outlierSummary.upperFence !== undefined &&
    parsed > outlierSummary.upperFence
  ) {
    return true;
  }

  return false;
}