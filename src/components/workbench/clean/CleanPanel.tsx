"use client";

import { useMemo, useState } from "react";
import {
  BrushCleaning,
  CheckCircle2,
  History,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CheckSelect,
  type CheckSelectOption,
} from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import type { ColumnType, DatasetRow } from "@/types/dataset";
import type { ColumnProfile } from "@/types/profile";
import type { MissingValueStrategy } from "@/types/cleaning";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import { useWorkspaceStore } from "@/store/workspaceStore";

const NUMERIC_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "currency",
  "percentage",
  "latitude",
  "longitude",
];

const TEXT_LIKE_TYPES: ColumnType[] = [
  "text",
  "email",
  "phone",
  "url",
  "id",
  "uuid",
  "postal_code",
  "country_code",
  "json",
];

const DATE_LIKE_TYPES: ColumnType[] = ["date", "datetime", "time"];

const BASE_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  {
    value: "leave",
    label: "Leave Missing",
    description: "Do not change this column.",
  },
  {
    value: "drop_rows",
    label: "Drop Rows",
    description: "Remove rows where this column is missing.",
  },
  {
    value: "fill_custom",
    label: "Fill Custom Value",
    description: "Use a value you provide.",
  },
];

const NUMERIC_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  {
    value: "fill_zero",
    label: "Fill Zero",
    description: "Replace missing values with 0.",
  },
  {
    value: "fill_median",
    label: "Fill Median",
    description: "Safer default for skewed numeric data.",
  },
  {
    value: "fill_mean",
    label: "Fill Mean",
    description: "Use the numeric average.",
  },
  {
    value: "fill_min",
    label: "Fill Minimum",
    description: "Use the column minimum.",
  },
  {
    value: "fill_max",
    label: "Fill Maximum",
    description: "Use the column maximum.",
  },
];

const CATEGORY_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  {
    value: "fill_mode",
    label: "Fill Most Frequent",
    description: "Use the most common category.",
  },
  {
    value: "fill_unknown",
    label: "Fill Unknown",
    description: 'Replace missing values with "Unknown".',
  },
];

const TEXT_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  {
    value: "fill_unknown",
    label: "Fill Unknown",
    description: 'Replace missing values with "Unknown".',
  },
];

const BOOLEAN_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  {
    value: "fill_mode",
    label: "Fill Most Frequent",
    description: "Use the most common boolean value.",
  },
];

const DATE_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  {
    value: "fill_previous",
    label: "Fill Previous",
    description: "Use the previous available value in row order.",
  },
  {
    value: "fill_next",
    label: "Fill Next",
    description: "Use the next available value in row order.",
  },
];

function getStrategyOptions(type: ColumnType): CheckSelectOption<MissingValueStrategy>[] {
  if (NUMERIC_TYPES.includes(type)) {
    return [...BASE_STRATEGIES, ...NUMERIC_STRATEGIES];
  }

  if (type === "category") {
    return [...BASE_STRATEGIES, ...CATEGORY_STRATEGIES];
  }

  if (type === "boolean") {
    return [...BASE_STRATEGIES, ...BOOLEAN_STRATEGIES];
  }

  if (DATE_LIKE_TYPES.includes(type)) {
    return [...BASE_STRATEGIES, ...DATE_STRATEGIES];
  }

  if (TEXT_LIKE_TYPES.includes(type)) {
    return [...BASE_STRATEGIES, ...TEXT_STRATEGIES];
  }

  return BASE_STRATEGIES;
}

function getSuggestedStrategy(column: ColumnProfile): MissingValueStrategy {
  if (NUMERIC_TYPES.includes(column.type)) return "fill_median";
  if (column.type === "category") return "fill_mode";
  if (column.type === "boolean") return "fill_mode";
  if (column.type === "text") return "fill_unknown";

  return "leave";
}

function getPreviewValue({
  rowIndex,
  rows,
  column,
  strategy,
  customValue,
}: {
  rowIndex: number;
  rows: DatasetRow[];
  column: ColumnProfile;
  strategy: MissingValueStrategy;
  customValue: string;
}): string {
  if (strategy === "leave") return "";
  if (strategy === "drop_rows") return "Row removed";
  if (strategy === "fill_custom") return customValue;
  if (strategy === "fill_unknown") return "Unknown";
  if (strategy === "fill_zero") return "0";
  if (strategy === "fill_mean") return String(column.numericSummary?.mean ?? "");
  if (strategy === "fill_median") {
    return String(column.numericSummary?.median ?? "");
  }
  if (strategy === "fill_min") return String(column.numericSummary?.min ?? "");
  if (strategy === "fill_max") return String(column.numericSummary?.max ?? "");
  if (strategy === "fill_mode") return column.topValues[0]?.value ?? "";

  if (strategy === "fill_previous") {
    for (let index = rowIndex - 1; index >= 0; index -= 1) {
      const value = rows[index]?.[column.name];

      if (!isMissingValue(value)) return String(value);
    }

    return "";
  }

  if (strategy === "fill_next") {
    for (let index = rowIndex + 1; index < rows.length; index += 1) {
      const value = rows[index]?.[column.name];

      if (!isMissingValue(value)) return String(value);
    }

    return "";
  }

  return "";
}

function formatStrategyLabel(strategy: MissingValueStrategy): string {
  const labels: Record<MissingValueStrategy, string> = {
    leave: "Leave Missing",
    drop_rows: "Drop Rows",
    fill_custom: "Fill Custom Value",
    fill_unknown: "Fill Unknown",
    fill_zero: "Fill Zero",
    fill_mean: "Fill Mean",
    fill_median: "Fill Median",
    fill_mode: "Fill Most Frequent",
    fill_min: "Fill Minimum",
    fill_max: "Fill Maximum",
    fill_previous: "Fill Previous",
    fill_next: "Fill Next",
  };

  return labels[strategy];
}

function getColumnOptionLabel(column: ColumnProfile): string {
  return `${column.name} · ${column.missingCount} missing`;
}

export function CleanPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const applyMissingValueFix = useWorkspaceStore(
    (state) => state.applyMissingValueFix,
  );
  const resetCleaning = useWorkspaceStore((state) => state.resetCleaning);

  const columnsWithMissing = useMemo(() => {
    return (
      workspace?.profile.columns.filter((column) => column.missingCount > 0) ??
      []
    );
  }, [workspace]);

  const columnOptions: CheckSelectOption<string>[] = useMemo(() => {
    return columnsWithMissing.map((column) => ({
      value: column.name,
      label: getColumnOptionLabel(column),
      description: `${column.type} column`,
    }));
  }, [columnsWithMissing]);

  const [selectedColumnName, setSelectedColumnName] = useState(
    columnsWithMissing[0]?.name ?? "",
  );

  const selectedColumn =
    columnsWithMissing.find((column) => column.name === selectedColumnName) ??
    columnsWithMissing[0];

  const [strategy, setStrategy] = useState<MissingValueStrategy>(
    selectedColumn ? getSuggestedStrategy(selectedColumn) : "leave",
  );
  const [customValue, setCustomValue] = useState("");

  const rows = workspace?.workingRows ?? [];

  const strategyOptions = selectedColumn
    ? getStrategyOptions(selectedColumn.type)
    : BASE_STRATEGIES;

  const missingRowIndexes = useMemo(() => {
    if (!selectedColumn) return [];

    return rows
      .map((row, index) => ({
        row,
        index,
      }))
      .filter((item) => isMissingValue(item.row[selectedColumn.name]));
  }, [rows, selectedColumn]);

  const previewRows = useMemo(() => {
    if (!selectedColumn) return [];

    return missingRowIndexes.slice(0, 8).map((item) => ({
      rowIndex: item.index,
      before: String(item.row[selectedColumn.name] ?? ""),
      after: getPreviewValue({
        rowIndex: item.index,
        rows,
        column: selectedColumn,
        strategy,
        customValue,
      }),
    }));
  }, [missingRowIndexes, rows, selectedColumn, strategy, customValue]);

  if (!workspace) return null;

  function handleColumnChange(columnName: string) {
    const column = columnsWithMissing.find((item) => item.name === columnName);

    setSelectedColumnName(columnName);
    setStrategy(column ? getSuggestedStrategy(column) : "leave");
    setCustomValue("");
  }

  function applyFix() {
    if (!selectedColumn) return;

    applyMissingValueFix({
      columnName: selectedColumn.name,
      strategy,
      customValue,
    });
  }

  const hasMissingValues = columnsWithMissing.length > 0;
  const canApply =
    Boolean(selectedColumn) &&
    strategy !== "leave" &&
    (strategy !== "fill_custom" || customValue.trim().length > 0);

  return (
    <section className="grid h-full min-h-0 overflow-hidden rounded-3xl border bg-background lg:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-b bg-muted/10 p-4 lg:border-b-0 lg:border-r">
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/30">
              <BrushCleaning className="size-5 text-foreground" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Clean missing values
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose a strategy, preview the changes, then apply the fix to
                the working dataset.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {!hasMissingValues ? (
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                <span className="font-semibold">No missing values found</span>
              </div>
              Your current working dataset has no detected missing values.
            </div>
          ) : (
            <>
              <CheckSelect<string>
                label="Column"
                value={selectedColumn?.name ?? ""}
                options={columnOptions}
                onChange={handleColumnChange}
              />

              <CheckSelect<MissingValueStrategy>
                label="Fix strategy"
                value={strategy}
                options={strategyOptions}
                onChange={setStrategy}
              />

              {strategy === "fill_custom" && (
                <InputWithLabel
                  label="Custom replacement"
                  value={customValue}
                  placeholder="Enter replacement value"
                  helpText="This value will replace every missing cell in the selected column."
                  onChange={(event) => setCustomValue(event.target.value)}
                />
              )}

              {selectedColumn && (
                <div className="rounded-2xl border bg-muted/25 p-4 text-xs leading-5 text-muted-foreground shadow-sm">
                  <p>
                    Selected column:{" "}
                    <span className="font-semibold text-foreground">
                      {selectedColumn.name}
                    </span>
                  </p>
                  <p>
                    Type:{" "}
                    <span className="font-semibold text-foreground">
                      {selectedColumn.type}
                    </span>
                  </p>
                  <p>
                    Missing cells:{" "}
                    <span className="font-semibold text-foreground">
                      {selectedColumn.missingCount.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Suggested strategy:{" "}
                    <span className="font-semibold text-foreground">
                      {formatStrategyLabel(getSuggestedStrategy(selectedColumn))}
                    </span>
                  </p>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={!canApply}
                onClick={applyFix}
              >
                <Sparkles className="mr-2 size-4" />
                Apply fix
              </Button>
            </>
          )}

          {workspace.cleaningSteps.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resetCleaning}
            >
              Reset cleaning
            </Button>
          )}
        </div>
      </aside>

      <main className="flex min-h-0 flex-col bg-background">
        <div className="shrink-0 border-b px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Preview changes
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The original imported rows are preserved. Fixes apply only to
                the working dataset.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-2xl border bg-muted/25 px-3 py-2">
                Original rows:{" "}
                <span className="font-semibold text-foreground">
                  {workspace.rawRows.length.toLocaleString()}
                </span>
              </span>

              <span className="rounded-2xl border bg-muted/25 px-3 py-2">
                Working rows:{" "}
                <span className="font-semibold text-foreground">
                  {workspace.workingRows.length.toLocaleString()}
                </span>
              </span>

              <span className="rounded-2xl border bg-muted/25 px-3 py-2">
                Cleaning steps:{" "}
                <span className="font-semibold text-foreground">
                  {workspace.cleaningSteps.length.toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {!hasMissingValues ? (
            <div className="grid h-full min-h-[420px] place-items-center rounded-3xl border border-dashed bg-muted/10 p-8">
              <div className="max-w-md text-center">
                <CheckCircle2 className="mx-auto mb-4 size-10 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Nothing to fix
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cleanframe does not detect missing values in the current
                  working dataset.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-3xl border bg-muted/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TriangleAlert className="size-4 text-amber-600 dark:text-amber-300" />
                  Affected row preview
                </div>

                <div className="overflow-hidden rounded-2xl border bg-background">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-24 border-b border-r px-4 py-3">
                          Row
                        </th>
                        <th className="border-b border-r px-4 py-3">
                          Before
                        </th>
                        <th className="border-b px-4 py-3">After</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row.rowIndex} className="border-b last:border-b-0">
                          <td className="border-r px-4 py-3 text-xs font-medium text-muted-foreground">
                            {(row.rowIndex + 1).toLocaleString()}
                          </td>

                          <td className="border-r bg-amber-100 px-4 py-3 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                            {row.before || "empty"}
                          </td>

                          <td className="px-4 py-3 font-medium text-foreground">
                            {row.after || "empty"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {missingRowIndexes.length > previewRows.length && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Showing first {previewRows.length} affected rows from{" "}
                    {missingRowIndexes.length.toLocaleString()} total.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border bg-muted/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="size-4 text-muted-foreground" />
                  Cleaning history
                </div>

                {workspace.cleaningSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No cleaning steps have been applied yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {workspace.cleaningSteps
                      .slice()
                      .reverse()
                      .map((step) => (
                        <div
                          key={step.id}
                          className="rounded-2xl border bg-background p-3 text-sm shadow-sm"
                        >
                          <p className="font-medium text-foreground">
                            {formatStrategyLabel(step.strategy)} ·{" "}
                            {step.columnName}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {step.affectedRows.toLocaleString()} rows affected ·{" "}
                            {new Date(step.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </section>
  );
}