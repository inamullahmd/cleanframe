"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckSelect, type CheckSelectOption } from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ColumnType } from "@/types/dataset";
import type { OutlierConfig, OutlierDetectionMethod } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";
import { CSV_ENCODINGS, DEFAULT_CSV_ENCODING } from "@/types/settings";
import { useWorkspaceStore } from "@/store/workspaceStore";

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

export function SettingsDialog() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);

  const updateOutlierConfig = useWorkspaceStore(
    (state) => state.updateOutlierConfig,
  );
  const updateCsvEncoding = useWorkspaceStore(
    (state) => state.updateCsvEncoding,
  );

  const [open, setOpen] = useState(false);
  const [draftOutlierConfig, setDraftOutlierConfig] =
    useState<OutlierConfig>(outlierConfig);
  const [draftCsvEncoding, setDraftCsvEncoding] =
    useState<CsvEncoding>(csvEncoding);

  useEffect(() => {
    if (!open) return;

    setDraftOutlierConfig(outlierConfig);
    setDraftCsvEncoding(csvEncoding);
  }, [open, outlierConfig, csvEncoding]);

  const numericColumns =
    workspace?.profile.columns.filter((column) =>
      NUMERIC_TYPES.includes(column.type),
    ) ?? [];

  function updateDraftOutlierConfig(nextConfig: Partial<OutlierConfig>) {
    setDraftOutlierConfig((current) => ({
      ...current,
      ...nextConfig,
    }));
  }

  function saveSettings() {
    updateCsvEncoding(draftCsvEncoding);
    updateOutlierConfig(draftOutlierConfig);
    setOpen(false);
  }

  function resetSettings() {
    setDraftCsvEncoding(DEFAULT_CSV_ENCODING);
    setDraftOutlierConfig(DEFAULT_OUTLIER_CONFIG);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="size-4 text-foreground" />
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[88vh] !w-[calc(100vw-48px)] !max-w-[1100px] flex-col overflow-hidden rounded-3xl border bg-background p-0 shadow-2xl sm:!max-w-[1100px] lg:!w-[1100px]">
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle>Workspace settings</DialogTitle>
          <DialogDescription>
            Configure CSV parsing, outlier detection, and future workspace
            behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-2">
              <SettingsSectionCard
                title="Parsing"
                description="Controls how the uploaded CSV is read before profiling."
              />

              <SettingsSectionCard
                title="Outliers"
                description="Controls numeric outlier counts and table highlights."
              />

              <div className="rounded-2xl border bg-muted/30 p-4 opacity-60 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">
                  Coming later
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Cleaning defaults, export preferences, chart presets, and row
                  validation rules.
                </p>
              </div>
            </aside>

            <div className="min-w-0 space-y-8">
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    CSV parsing
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Encoding is applied to the next uploaded file. Existing
                    workspace data will not be re-decoded until re-uploaded.
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                  <div className="pt-1 text-sm font-medium text-foreground">
                    Encoding
                  </div>

                  <CheckSelect<CsvEncoding>
                    hideLabel
                    label="Encoding"
                    value={draftCsvEncoding}
                    options={ENCODING_OPTIONS}
                    onChange={setDraftCsvEncoding}
                  />
                </div>
              </section>

              <section className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Outlier detection
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    These settings recalculate schema metrics and data-grid
                    highlights after saving.
                  </p>
                </div>

                <div className="grid min-w-0 gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                  <div className="pt-1 text-sm font-medium text-foreground">
                    Detection method
                  </div>

                  <CheckSelect<OutlierDetectionMethod>
                    hideLabel
                    label="Detection method"
                    value={draftOutlierConfig.method}
                    options={METHOD_OPTIONS}
                    onChange={(value) =>
                      updateDraftOutlierConfig({
                        method: value,
                      })
                    }
                  />
                </div>

                {draftOutlierConfig.method === "iqr" && (
                  <NumberSetting
                    label="IQR multiplier"
                    description="Default is 1.5. Larger values are less sensitive."
                    value={draftOutlierConfig.iqrMultiplier}
                    step={0.1}
                    min={0.5}
                    onChange={(value) =>
                      updateDraftOutlierConfig({ iqrMultiplier: value })
                    }
                  />
                )}

                {draftOutlierConfig.method === "z_score" && (
                  <NumberSetting
                    label="Z-score threshold"
                    description="Default is 3. Lower values are more sensitive."
                    value={draftOutlierConfig.zScoreThreshold}
                    step={0.1}
                    min={1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({ zScoreThreshold: value })
                    }
                  />
                )}

                {draftOutlierConfig.method === "modified_z_score" && (
                  <NumberSetting
                    label="Modified Z-score threshold"
                    description="Common default is 3.5."
                    value={draftOutlierConfig.modifiedZScoreThreshold}
                    step={0.1}
                    min={1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({
                        modifiedZScoreThreshold: value,
                      })
                    }
                  />
                )}

                {draftOutlierConfig.method === "percentile" && (
                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <CompactNumberSetting
                      label="Lower percentile"
                      description="Values below this percentile are flagged."
                      value={draftOutlierConfig.percentileLower}
                      step={0.5}
                      min={0}
                      max={50}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ percentileLower: value })
                      }
                    />

                    <CompactNumberSetting
                      label="Upper percentile"
                      description="Values above this percentile are flagged."
                      value={draftOutlierConfig.percentileUpper}
                      step={0.5}
                      min={50}
                      max={100}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ percentileUpper: value })
                      }
                    />
                  </div>
                )}

                {draftOutlierConfig.method === "std_dev" && (
                  <NumberSetting
                    label="Standard deviation multiplier"
                    description="Default is 3. Uses mean ± multiplier × standard deviation."
                    value={draftOutlierConfig.stdDevMultiplier}
                    step={0.1}
                    min={1}
                    onChange={(value) =>
                      updateDraftOutlierConfig({ stdDevMultiplier: value })
                    }
                  />
                )}

                {draftOutlierConfig.method === "isolation_forest" && (
                  <div className="grid min-w-0 gap-3 md:grid-cols-3">
                    <CompactNumberSetting
                      label="Trees"
                      description="More trees are steadier but slower."
                      value={draftOutlierConfig.isolationTrees}
                      step={10}
                      min={10}
                      max={200}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ isolationTrees: value })
                      }
                    />

                    <CompactNumberSetting
                      label="Sample size"
                      description="Rows sampled per tree."
                      value={draftOutlierConfig.isolationSampleSize}
                      step={16}
                      min={32}
                      max={512}
                      onChange={(value) =>
                        updateDraftOutlierConfig({ isolationSampleSize: value })
                      }
                    />

                    <CompactNumberSetting
                      label="Score threshold"
                      description="Higher is less sensitive."
                      value={draftOutlierConfig.isolationScoreThreshold}
                      step={0.01}
                      min={0.5}
                      max={0.9}
                      onChange={(value) =>
                        updateDraftOutlierConfig({
                          isolationScoreThreshold: value,
                        })
                      }
                    />
                  </div>
                )}

                {draftOutlierConfig.method === "domain_rules" && (
                  <section className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Domain rules
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Define acceptable min/max bounds for numeric columns.
                      </p>
                    </div>

                    {numericColumns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No numeric columns are available.
                      </p>
                    ) : (
                      <div className="max-h-[360px] overflow-y-auto overflow-x-hidden rounded-2xl border">
                        <table className="w-full table-fixed text-left text-sm">
                          <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="w-1/2 border-b px-3 py-2">
                                Column
                              </th>
                              <th className="w-1/4 border-b px-3 py-2">
                                Min
                              </th>
                              <th className="w-1/4 border-b px-3 py-2">
                                Max
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {numericColumns.map((column) => {
                              const rule =
                                draftOutlierConfig.domainRules[column.name] ??
                                {};

                              return (
                                <tr key={column.name} className="border-b">
                                  <td className="truncate px-3 py-2 font-medium">
                                    {column.name}
                                  </td>

                                  <td className="px-3 py-2">
                                    <InputWithLabel
                                      hideLabel
                                      label={`${column.name} minimum`}
                                      type="number"
                                      value={rule.min ?? ""}
                                      inputClassName="h-9 rounded-xl px-3"
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
                                    />
                                  </td>

                                  <td className="px-3 py-2">
                                    <InputWithLabel
                                      hideLabel
                                      label={`${column.name} maximum`}
                                      type="number"
                                      value={rule.max ?? ""}
                                      inputClassName="h-9 rounded-xl px-3"
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
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}
              </section>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={resetSettings}>
            Reset
          </Button>

          <Button type="button" onClick={saveSettings}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <div className="rounded-2xl border bg-muted/30 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
    <div className="grid min-w-0 gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
      <div className="pt-1 text-sm font-medium text-foreground">{label}</div>

      <InputWithLabel
        hideLabel
        label={label}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        helpText={description}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function CompactNumberSetting({
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
    <InputWithLabel
      label={label}
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      helpText={description}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}