"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Save, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CheckSelect,
  type CheckSelectOption,
} from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ColumnType } from "@/types/dataset";
import type { OutlierDetectionMethod } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";
import { CSV_ENCODINGS, DEFAULT_CSV_ENCODING } from "@/types/settings";

const NUMERIC_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

const METHOD_OPTIONS: CheckSelectOption<OutlierDetectionMethod>[] = [
  {
    value: "iqr",
    label: "IQR",
    description: "Uses Q1/Q3 fences. Strong default for skewed data.",
  },
  {
    value: "z_score",
    label: "Z-score",
    description: "Flags values far from the mean. Best for normal data.",
  },
  {
    value: "modified_z_score",
    label: "Modified Z-score",
    description: "Uses median and MAD. More robust than classic Z-score.",
  },
  {
    value: "percentile",
    label: "Percentile bounds",
    description: "Flags values below/above selected percentiles.",
  },
  {
    value: "std_dev",
    label: "Standard deviation",
    description: "Uses mean ± N standard deviations.",
  },
  {
    value: "domain_rules",
    label: "Domain rules",
    description: "Uses user-defined min/max rules per column.",
  },
  {
    value: "isolation_forest",
    label: "Isolation Forest",
    description: "Univariate anomaly scoring using random isolation splits.",
  },
];

const ENCODING_OPTIONS: CheckSelectOption<CsvEncoding>[] = CSV_ENCODINGS.map(
  (encoding) => ({
    value: encoding.value,
    label: encoding.label,
    description: encoding.description,
  }),
);

export function SettingsPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const updateOutlierConfig = useWorkspaceStore(
    (state) => state.updateOutlierConfig,
  );
  const updateCsvEncoding = useWorkspaceStore(
    (state) => state.updateCsvEncoding,
  );

  const [draftOutlierConfig, setDraftOutlierConfig] = useState(outlierConfig);
  const [draftCsvEncoding, setDraftCsvEncoding] =
    useState<CsvEncoding>(csvEncoding);

  const numericColumns =
    workspace?.profile.columns.filter((column) =>
      NUMERIC_TYPES.includes(column.type),
    ) ?? [];

  const numericColumnCount = useMemo(
    () => numericColumns.length,
    [numericColumns],
  );

  function updateDraftOutlierConfig(
    nextConfig: Partial<typeof draftOutlierConfig>,
  ) {
    setDraftOutlierConfig((current) => ({
      ...current,
      ...nextConfig,
    }));
  }

  function saveSettings() {
    updateCsvEncoding(draftCsvEncoding);
    updateOutlierConfig(draftOutlierConfig);
  }

  function resetSettings() {
    setDraftCsvEncoding(DEFAULT_CSV_ENCODING);
    setDraftOutlierConfig(DEFAULT_OUTLIER_CONFIG);
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-sm">
      <div className="shrink-0 border-b border-border/70 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground">
              <Settings className="size-5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
                Settings
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure CSV parsing, outlier detection, and workspace
                preferences.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetSettings}
              className="h-8 rounded-xl px-3 text-xs"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset
            </Button>

            <Button
              type="button"
              onClick={saveSettings}
              className="h-8 rounded-xl px-3 text-xs"
            >
              <Save className="mr-1.5 size-3.5" />
              Save settings
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-4">
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <SettingsSectionCard
              title="CSV parsing"
              description="Encoding is applied to the next uploaded file. Existing workspace data will not be re-decoded until re-uploaded."
            />

            <SettingsSectionCard
              title="Outlier detection"
              description="These settings recalculate schema metrics and data-grid highlights after saving."
            />

            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">
                Workspace summary
              </h3>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Numeric columns</span>
                  <span className="font-bold text-foreground">
                    {numericColumnCount}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Current encoding</span>
                  <span className="font-bold text-foreground">
                    {draftCsvEncoding}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Outlier method</span>
                  <span className="font-bold text-foreground">
                    {draftOutlierConfig.method}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">
                CSV parsing
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose the encoding used for future CSV uploads.
              </p>

              <div className="mt-4 max-w-md">
                <CheckSelect
                  label="Encoding"
                  value={draftCsvEncoding}
                  options={ENCODING_OPTIONS}
                  onChange={setDraftCsvEncoding}
                  triggerClassName="h-10 text-xs"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">
                Outlier detection
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose the algorithm used for outlier flags in schema metrics
                and the data grid.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <CheckSelect
                  label="Detection method"
                  value={draftOutlierConfig.method}
                  options={METHOD_OPTIONS}
                  onChange={(value) =>
                    updateDraftOutlierConfig({
                      method: value,
                    })
                  }
                  triggerClassName="h-10 text-xs"
                />

                {draftOutlierConfig.method === "iqr" ? (
                  <NumberSetting
                    label="IQR multiplier"
                    description="Higher values flag fewer outliers."
                    value={draftOutlierConfig.iqrMultiplier}
                    step={0.1}
                    min={0.1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({ iqrMultiplier: value })
                    }
                  />
                ) : null}

                {draftOutlierConfig.method === "z_score" ? (
                  <NumberSetting
                    label="Z-score threshold"
                    description="Common values are between 2.5 and 3.5."
                    value={draftOutlierConfig.zScoreThreshold}
                    step={0.1}
                    min={0.1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({ zScoreThreshold: value })
                    }
                  />
                ) : null}

                {draftOutlierConfig.method === "modified_z_score" ? (
                  <NumberSetting
                    label="Modified Z-score threshold"
                    description="Common robust threshold is 3.5."
                    value={draftOutlierConfig.modifiedZScoreThreshold}
                    step={0.1}
                    min={0.1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({
                        modifiedZScoreThreshold: value,
                      })
                    }
                  />
                ) : null}

                {draftOutlierConfig.method === "percentile" ? (
                  <>
                    <NumberSetting
                      label="Lower percentile"
                      description="Values below this percentile are flagged."
                      value={draftOutlierConfig.percentileLower}
                      step={0.5}
                      min={0}
                      max={100}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ percentileLower: value })
                      }
                    />

                    <NumberSetting
                      label="Upper percentile"
                      description="Values above this percentile are flagged."
                      value={draftOutlierConfig.percentileUpper}
                      step={0.5}
                      min={0}
                      max={100}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ percentileUpper: value })
                      }
                    />
                  </>
                ) : null}

                {draftOutlierConfig.method === "std_dev" ? (
                  <NumberSetting
                    label="Standard deviation multiplier"
                    description="Higher values flag fewer outliers."
                    value={draftOutlierConfig.stdDevMultiplier}
                    step={0.1}
                    min={0.1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({ stdDevMultiplier: value })
                    }
                  />
                ) : null}

                {draftOutlierConfig.method === "isolation_forest" ? (
                  <>
                    <NumberSetting
                      label="Trees"
                      description="More trees can stabilize scores."
                      value={draftOutlierConfig.isolationTrees}
                      step={1}
                      min={10}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ isolationTrees: value })
                      }
                    />

                    <NumberSetting
                      label="Sample size"
                      description="Number of values sampled per tree."
                      value={draftOutlierConfig.isolationSampleSize}
                      step={1}
                      min={16}
                      onChange={(value) =>
                        updateDraftOutlierConfig({
                          isolationSampleSize: value,
                        })
                      }
                    />

                    <NumberSetting
                      label="Score threshold"
                      description="Higher values flag fewer anomalies."
                      value={draftOutlierConfig.isolationScoreThreshold}
                      step={0.01}
                      min={0}
                      max={1}
                      onChange={(value) =>
                        updateDraftOutlierConfig({
                          isolationScoreThreshold: value,
                        })
                      }
                    />
                  </>
                ) : null}
              </div>
            </div>

            {draftOutlierConfig.method === "domain_rules" ? (
              <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-bold text-foreground">
                  Domain rules
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Define acceptable min/max bounds for numeric columns.
                </p>

                {numericColumns.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No numeric columns are available.
                  </div>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/35 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Column</th>
                          <th className="px-3 py-2">Min</th>
                          <th className="px-3 py-2">Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {numericColumns.map((column) => {
                          const rule =
                            draftOutlierConfig.domainRules[column.name] ?? {};

                          return (
                            <tr
                              key={column.name}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2 font-semibold text-foreground">
                                {column.name}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={rule.min ?? ""}
                                  onChange={(event) => {
                                    const value = event.target.value;

                                    updateDraftOutlierConfig({
                                      domainRules: {
                                        ...draftOutlierConfig.domainRules,
                                        [column.name]: {
                                          ...rule,
                                          min:
                                            value === ""
                                              ? undefined
                                              : Number(value),
                                        },
                                      },
                                    });
                                  }}
                                  className="h-8 w-full rounded-xl border border-border bg-background px-2 !text-xs !font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={rule.max ?? ""}
                                  onChange={(event) => {
                                    const value = event.target.value;

                                    updateDraftOutlierConfig({
                                      domainRules: {
                                        ...draftOutlierConfig.domainRules,
                                        [column.name]: {
                                          ...rule,
                                          max:
                                            value === ""
                                              ? undefined
                                              : Number(value),
                                        },
                                      },
                                    });
                                  }}
                                  className="h-8 w-full rounded-xl border border-border bg-background px-2 !text-xs !font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsSectionCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function NumberSetting({
  label,
  description,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-foreground">{label}</span>
      <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
        {description}
      </span>
      <InputWithLabel
        label={label}
        hideLabel
        type="number"
        value={String(value)}
        step={step}
        min={min}
        max={max}
        inputClassName="mt-2 h-10 !text-xs !font-semibold"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}