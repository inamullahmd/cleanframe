"use client";

import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleHelp,
  Columns3,
  Copy,
  Database,
  Gauge,
  Plus,
  Rows3,
  Search,
  Sigma,
  TextCursorInput,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckSelect,
  type CheckSelectOption,
} from "@/components/ui/check-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputWithLabel } from "@/components/ui/input-with-label";
import {
  useWorkspaceStore,
  type ColumnNameTransform,
} from "@/store/workspaceStore";
import type { ColumnType } from "@/types/dataset";
import type { ColumnProfile, DatasetProfile } from "@/types/profile";

const COLUMN_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "date",
  "datetime",
  "time",
  "boolean",
  "category",
  "text",
  "id",
  "uuid",
  "email",
  "phone",
  "url",
  "postal_code",
  "country_code",
  "latitude",
  "longitude",
  "json",
];

const NUMERIC_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

const IDENTITY_TYPES: ColumnType[] = [
  "id",
  "uuid",
  "email",
  "phone",
  "url",
  "json",
];

const DATE_TYPES: ColumnType[] = ["date", "datetime", "time"];

const CATEGORICAL_TYPES: ColumnType[] = [
  "category",
  "boolean",
  "country_code",
  "postal_code",
];

type AddColumnSourceMode = "custom_value" | "from_columns";

type ColumnFilter =
  | "all"
  | "numeric"
  | "categorical"
  | "text"
  | "date"
  | "issues";

const COLUMN_NAME_TRANSFORM_OPTIONS: CheckSelectOption<ColumnNameTransform>[] = [
  {
    value: "title_case_spaces",
    label: "Title Case + Spaces",
    description: "host_id → Host ID",
  },
  {
    value: "replace_underscores",
    label: "Replace Underscores",
    description: "host_id → host id",
  },
  {
    value: "lowercase_spaces",
    label: "Lowercase + Spaces",
    description: "Host_ID → host id",
  },
  {
    value: "uppercase",
    label: "Uppercase",
    description: "host_id → HOST ID",
  },
  {
    value: "snake_case",
    label: "Snake Case",
    description: "Host ID → host_id",
  },
  {
    value: "camel_case",
    label: "Camel Case",
    description: "host id → hostId",
  },
  {
    value: "trim",
    label: "Trim Whitespace",
    description: "Remove extra spaces around column names.",
  },
];

function formatColumnTypeLabel(type: ColumnType): string {
  const labels: Record<ColumnType, string> = {
    integer: "Integer",
    decimal: "Decimal",
    number: "Number",
    percentage: "Percentage",
    currency: "Currency",
    date: "Date",
    datetime: "Date Time",
    time: "Time",
    boolean: "Boolean",
    category: "Category",
    text: "Text",
    id: "ID",
    uuid: "UUID",
    email: "Email",
    phone: "Phone",
    url: "URL",
    postal_code: "Postal Code",
    country_code: "Country Code",
    latitude: "Latitude",
    longitude: "Longitude",
    json: "JSON",
  };

  return labels[type];
}

const COLUMN_TYPE_OPTIONS: CheckSelectOption<ColumnType>[] = COLUMN_TYPES.map(
  (type) => ({
    value: type,
    label: formatColumnTypeLabel(type),
  }),
);

function formatCount(value: number): string {
  return value.toLocaleString();
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumericValue(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Review";
  return "Risk";
}

function getQualityBadgeVariant(score: number) {
  return score >= 75 ? "secondary" : "destructive";
}

function getDuplicateCount(column: ColumnProfile): number {
  return Math.max(
    0,
    column.totalValues - column.missingCount - column.uniqueCount,
  );
}

function getColumnOutlierCount(column: ColumnProfile): number {
  return column.outliers?.count ?? 0;
}

function hasColumnIssue(column: ColumnProfile): boolean {
  const outlierCount = getColumnOutlierCount(column);
  const duplicateCount = getDuplicateCount(column);

  return (
    column.missingCount > 0 ||
    outlierCount > 0 ||
    (IDENTITY_TYPES.includes(column.type) && duplicateCount > 0)
  );
}

function getFilterCount(columns: ColumnProfile[], filter: ColumnFilter): number {
  if (filter === "all") return columns.length;

  if (filter === "numeric") {
    return columns.filter((column) => NUMERIC_TYPES.includes(column.type))
      .length;
  }

  if (filter === "categorical") {
    return columns.filter((column) => CATEGORICAL_TYPES.includes(column.type))
      .length;
  }

  if (filter === "text") {
    return columns.filter((column) => column.type === "text").length;
  }

  if (filter === "date") {
    return columns.filter((column) => DATE_TYPES.includes(column.type)).length;
  }

  if (filter === "issues") {
    return columns.filter(hasColumnIssue).length;
  }

  return columns.length;
}

function matchesFilter(column: ColumnProfile, filter: ColumnFilter): boolean {
  if (filter === "all") return true;
  if (filter === "numeric") return NUMERIC_TYPES.includes(column.type);
  if (filter === "categorical") return CATEGORICAL_TYPES.includes(column.type);
  if (filter === "text") return column.type === "text";
  if (filter === "date") return DATE_TYPES.includes(column.type);
  if (filter === "issues") return hasColumnIssue(column);

  return true;
}

type RenameInputProps = {
  column: ColumnProfile;
  columnNames: string[];
};

function RenameInput({ column, columnNames }: RenameInputProps) {
  const renameColumn = useWorkspaceStore((state) => state.renameColumn);

  const [draftName, setDraftName] = useState(column.name);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftName(column.name);
    setError("");
  }, [column.name]);

  function commitRename() {
    const nextName = draftName.trim();

    if (nextName === column.name) {
      setError("");
      return;
    }

    if (!nextName) {
      setError("Required");
      setDraftName(column.name);
      return;
    }

    const duplicateExists = columnNames.some(
      (name) =>
        name !== column.name && name.toLowerCase() === nextName.toLowerCase(),
    );

    if (duplicateExists) {
      setError("Already exists");
      return;
    }

    setError("");
    renameColumn(column.name, nextName);
  }

  return (
    <InputWithLabel
      hideLabel
      label={`Rename ${column.name}`}
      value={draftName}
      error={error}
      inputClassName="h-9 rounded-xl px-3 text-sm font-semibold"
      onChange={(event) => setDraftName(event.target.value)}
      onBlur={commitRename}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();

        if (event.key === "Escape") {
          setDraftName(column.name);
          setError("");
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function TypeSelect({
  value,
  onChange,
}: {
  value: ColumnType;
  onChange: (nextType: ColumnType) => void;
}) {
  return (
    <CheckSelect
      hideLabel
      label="Column type"
      value={value}
      options={COLUMN_TYPE_OPTIONS}
      onChange={onChange}
      triggerClassName="h-9 rounded-xl px-3 text-sm font-medium"
    />
  );
}

function TransformColumnNamesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const transformColumnNames = useWorkspaceStore(
    (state) => state.transformColumnNames,
  );

  const [transform, setTransform] =
    useState<ColumnNameTransform>("title_case_spaces");

  function applyTransform() {
    transformColumnNames(transform);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Transform column names</DialogTitle>
          <DialogDescription>
            Apply a bulk naming format to every column header.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <CheckSelect
            label="Format"
            value={transform}
            options={COLUMN_NAME_TRANSFORM_OPTIONS}
            onChange={setTransform}
          />

          <div className="rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
            This updates column headers across schema, rows, cleaning history,
            and restore snapshots.
          </div>
        </div>

        <DialogFooter className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={applyTransform}>
            Apply format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddColumnDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const addColumn = useWorkspaceStore((state) => state.addColumn);

  const existingColumns = workspace?.fields ?? [];

  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<ColumnType>("text");
  const [sourceMode, setSourceMode] =
    useState<AddColumnSourceMode>("custom_value");
  const [defaultValue, setDefaultValue] = useState("");
  const [selectedSourceColumns, setSelectedSourceColumns] = useState<string[]>(
    [],
  );
  const [expression, setExpression] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setColumnName("");
    setColumnType("text");
    setSourceMode("custom_value");
    setDefaultValue("");
    setSelectedSourceColumns([]);
    setExpression("");
    setError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  }

  function toggleSourceColumn(column: string) {
    setSelectedSourceColumns((current) =>
      current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column],
    );
  }

  function createColumn() {
    const trimmedName = columnName.trim();

    if (!trimmedName) {
      setError("Column name is required.");
      return;
    }

    const duplicateExists = existingColumns.some(
      (field) => field.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicateExists) {
      setError("A column with this name already exists.");
      return;
    }

    if (sourceMode === "from_columns" && selectedSourceColumns.length === 0) {
      setError("Select at least one existing column.");
      return;
    }

    if (
      sourceMode === "from_columns" &&
      selectedSourceColumns.length > 1 &&
      !expression.trim()
    ) {
      setError("Write an expression when using more than one source column.");
      return;
    }

    addColumn({
      columnName: trimmedName,
      columnType,
      defaultValue: sourceMode === "custom_value" ? defaultValue : "",
      sourceMode,
      sourceColumns:
        sourceMode === "from_columns" ? selectedSourceColumns : [],
      expression: sourceMode === "from_columns" ? expression.trim() : "",
    });

    handleOpenChange(false);
  }

  const showExpression =
    sourceMode === "from_columns" && selectedSourceColumns.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-6 sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add a new column</DialogTitle>
          <DialogDescription>
            Create a column using a custom value or values from existing
            columns.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <InputWithLabel
            label="Column name"
            value={columnName}
            error={error}
            placeholder="Example: Review Status"
            onChange={(event) => {
              setColumnName(event.target.value);
              setError("");
            }}
          />

          <CheckSelect
            label="Column type"
            value={columnType}
            options={COLUMN_TYPE_OPTIONS}
            onChange={setColumnType}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Populate using
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={sourceMode === "custom_value" ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => {
                  setSourceMode("custom_value");
                  setError("");
                }}
              >
                Custom value
              </Button>

              <Button
                type="button"
                variant={sourceMode === "from_columns" ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => {
                  setSourceMode("from_columns");
                  setError("");
                }}
              >
                Existing column(s)
              </Button>
            </div>
          </div>

          {sourceMode === "custom_value" ? (
            <InputWithLabel
              label="Default value"
              value={defaultValue}
              placeholder="Optional"
              helpText="This value will be inserted into every row for the new column."
              onChange={(event) => setDefaultValue(event.target.value)}
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Source columns
                </label>

                <div className="max-h-48 overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <div className="flex flex-wrap gap-2">
                    {existingColumns.map((column) => {
                      const selected = selectedSourceColumns.includes(column);

                      return (
                        <button
                          key={column}
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                          onClick={() => {
                            toggleSourceColumn(column);
                            setError("");
                          }}
                        >
                          {column}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Select one column to copy values. Select multiple columns to
                  build a formula.
                </p>
              </div>

              {showExpression ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Expression / formula
                  </label>

                  <textarea
                    value={expression}
                    onChange={(event) => {
                      setExpression(event.target.value);
                      setError("");
                    }}
                    placeholder={
                      selectedSourceColumns.length > 1
                        ? `Example: concat({${selectedSourceColumns[0] ?? "col1"}}, " - ", {${selectedSourceColumns[1] ?? "col2"}})`
                        : `Optional: upper({${selectedSourceColumns[0] ?? "column"}})`
                    }
                    className="min-h-[110px] w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />

                  <div className="rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
                    <div className="font-medium text-foreground">
                      Formula examples
                    </div>
                    <div className="mt-2 space-y-1 font-mono">
                      <div>
                        concat(&#123;name&#125;, " - ", &#123;host_name&#125;)
                      </div>
                      <div>&#123;price&#125; * &#123;minimum_nights&#125;</div>
                      <div>upper(&#123;neighbourhood_group&#125;)</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={createColumn}>
            Add column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchemaToolsBar() {
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);

  return (
    <>
      <div className="-mx-4 mt-3 border-y border-border/70 bg-muted/[0.18] px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="!h-6 !min-h-0 !rounded-md !px-1.5 !py-0 !text-[10.5px] !font-medium !leading-none shadow-sm [&_svg]:!mr-1 [&_svg]:!size-2.5"
            onClick={() => setTransformDialogOpen(true)}
          >
            <TextCursorInput className="!mr-1 !size-2.5" />
            Transform column names
          </Button>

          <Button
            type="button"
            variant="outline"
            className="!h-6 !min-h-0 !rounded-md !px-1.5 !py-0 !text-[10.5px] !font-medium !leading-none shadow-sm [&_svg]:!mr-1 [&_svg]:!size-2.5"
            onClick={() => setAddColumnDialogOpen(true)}
          >
            <Plus className="!mr-1 !size-2.5" />
            Add a new column
          </Button>
        </div>
      </div>

      <TransformColumnNamesDialog
        open={transformDialogOpen}
        onOpenChange={setTransformDialogOpen}
      />

      <AddColumnDialog
        open={addColumnDialogOpen}
        onOpenChange={setAddColumnDialogOpen}
      />
    </>
  );
}

function MetricChip({
  icon: Icon,
  label,
  value,
  intent = "default",
}: {
  icon: ElementType;
  label: string;
  value: string;
  intent?: "default" | "warning" | "danger";
}) {
  const valueClassName =
    intent === "danger"
      ? "text-rose-700 dark:text-rose-300"
      : intent === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";

  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 shadow-sm">
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-bold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function HeaderMetrics({
  profile,
  numericColumnCount,
  columnsWithMissingCount,
}: {
  profile: DatasetProfile;
  numericColumnCount: number;
  columnsWithMissingCount: number;
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      <MetricChip
        icon={Rows3}
        label="Rows"
        value={formatCount(profile.rowCount)}
      />
      <MetricChip
        icon={Columns3}
        label="Columns"
        value={formatCount(profile.columnCount)}
      />
      <MetricChip
        icon={Sigma}
        label="Numeric"
        value={formatCount(numericColumnCount)}
      />
      <MetricChip
        icon={TriangleAlert}
        label="With missing"
        value={formatCount(columnsWithMissingCount)}
        intent={columnsWithMissingCount > 0 ? "warning" : "default"}
      />
      <MetricChip
        icon={Copy}
        label="Duplicates"
        value={formatCount(profile.duplicateRowCount)}
        intent={profile.duplicateRowCount > 0 ? "warning" : "default"}
      />
      <MetricChip
        icon={AlertTriangle}
        label="Warnings"
        value={formatCount(profile.parseErrors.length)}
        intent={profile.parseErrors.length > 0 ? "danger" : "default"}
      />

      <div className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 shadow-sm">
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
          <Gauge className="size-3.5" />
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Quality
        </span>
        <span className="text-sm font-bold text-foreground">
          {profile.qualityScore}/100
        </span>
        <Badge variant={getQualityBadgeVariant(profile.qualityScore)}>
          {getQualityLabel(profile.qualityScore)}
        </Badge>
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  intent = "default",
}: {
  label: string;
  value: string;
  intent?: "default" | "warning" | "danger";
}) {
  const valueClassName =
    intent === "danger"
      ? "text-rose-700 dark:text-rose-300"
      : intent === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`max-w-[55%] truncate text-right text-xs font-bold ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}

function MetricsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function TopValueTags({
  column,
  label = "Top values",
}: {
  column: ColumnProfile;
  label?: string;
}) {
  if (column.topValues.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>

      <div className="space-y-1.5">
        {column.topValues.slice(0, 5).map((item) => (
          <div
            key={`${column.name}-${item.value}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2"
          >
            <span className="min-w-0 truncate text-xs font-medium text-foreground">
              {item.value}
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {formatCount(item.count)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpandedMetricsContent({ column }: { column: ColumnProfile }) {
  if (column.type === "text") {
    const duplicateCount = getDuplicateCount(column);

    return (
      <div className="space-y-3">
        <MetricsSection title="Column health">
          <MetricItem
            label="Missing"
            value={`${formatCount(column.missingCount)} (${formatPercentage(
              column.missingPercentage,
            )})`}
            intent={column.missingCount > 0 ? "warning" : "default"}
          />
          <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
          <MetricItem
            label="Duplicates"
            value={formatCount(duplicateCount)}
            intent={duplicateCount > 0 ? "warning" : "default"}
          />
        </MetricsSection>
      </div>
    );
  }

  if (NUMERIC_TYPES.includes(column.type)) {
    const summary = column.numericSummary;
    const outlierCount = getColumnOutlierCount(column);

    if (!summary) {
      return (
        <div className="space-y-3">
          <MetricsSection title="Column health">
            <MetricItem
              label="Missing"
              value={`${formatCount(column.missingCount)} (${formatPercentage(
                column.missingPercentage,
              )})`}
              intent={column.missingCount > 0 ? "warning" : "default"}
            />
            <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
          </MetricsSection>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <MetricsSection title="Column health">
          <MetricItem
            label="Missing"
            value={`${formatCount(column.missingCount)} (${formatPercentage(
              column.missingPercentage,
            )})`}
            intent={column.missingCount > 0 ? "warning" : "default"}
          />
          <MetricItem
            label="Outliers"
            value={formatCount(outlierCount)}
            intent={outlierCount > 0 ? "danger" : "default"}
          />
          <MetricItem
            label="Range"
            value={`${formatNumericValue(summary.min)} → ${formatNumericValue(
              summary.max,
            )}`}
          />
        </MetricsSection>

        <MetricsSection title="Distribution">
          <div className="grid grid-cols-2 gap-1.5">
            <MetricItem label="Mean" value={formatNumericValue(summary.mean)} />
            <MetricItem
              label="Median"
              value={formatNumericValue(summary.median)}
            />
            <MetricItem label="Min" value={formatNumericValue(summary.min)} />
            <MetricItem label="Max" value={formatNumericValue(summary.max)} />
            <MetricItem
              label="Std dev"
              value={formatNumericValue(summary.standardDeviation)}
            />
            <MetricItem label="Q1" value={formatNumericValue(summary.q1)} />
            <MetricItem label="Q3" value={formatNumericValue(summary.q3)} />
          </div>
        </MetricsSection>
      </div>
    );
  }

  if (column.type === "date" || column.type === "datetime") {
    if (!column.dateSummary) {
      return (
        <MetricsSection title="Column health">
          <MetricItem
            label="Missing"
            value={`${formatCount(column.missingCount)} (${formatPercentage(
              column.missingPercentage,
            )})`}
            intent={column.missingCount > 0 ? "warning" : "default"}
          />
          <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
        </MetricsSection>
      );
    }

    return (
      <div className="space-y-4">
        <MetricsSection title="Column health">
          <MetricItem
            label="Missing"
            value={`${formatCount(column.missingCount)} (${formatPercentage(
              column.missingPercentage,
            )})`}
            intent={column.missingCount > 0 ? "warning" : "default"}
          />
          <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
        </MetricsSection>

        <MetricsSection title="Date range">
          <MetricItem label="Earliest" value={column.dateSummary.min} />
          <MetricItem label="Latest" value={column.dateSummary.max} />
          <MetricItem label="Distinct" value={formatCount(column.uniqueCount)} />
        </MetricsSection>
      </div>
    );
  }

  if (column.type === "category" || column.type === "boolean") {
    return (
      <div className="space-y-4">
        <MetricsSection title="Column health">
          <MetricItem
            label="Missing"
            value={`${formatCount(column.missingCount)} (${formatPercentage(
              column.missingPercentage,
            )})`}
            intent={column.missingCount > 0 ? "warning" : "default"}
          />
          <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
        </MetricsSection>

        <TopValueTags
          column={column}
          label={column.type === "boolean" ? "Value breakdown" : "Most common"}
        />
      </div>
    );
  }

  if (IDENTITY_TYPES.includes(column.type)) {
    const duplicateCount = getDuplicateCount(column);

    return (
      <MetricsSection title="Column health">
        <MetricItem
          label="Missing"
          value={`${formatCount(column.missingCount)} (${formatPercentage(
            column.missingPercentage,
          )})`}
          intent={column.missingCount > 0 ? "warning" : "default"}
        />
        <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
        <MetricItem
          label="Duplicates"
          value={formatCount(duplicateCount)}
          intent={duplicateCount > 0 ? "warning" : "default"}
        />
      </MetricsSection>
    );
  }

  return (
    <MetricsSection title="Column health">
      <MetricItem
        label="Missing"
        value={`${formatCount(column.missingCount)} (${formatPercentage(
          column.missingPercentage,
        )})`}
        intent={column.missingCount > 0 ? "warning" : "default"}
      />
      <MetricItem label="Unique" value={formatCount(column.uniqueCount)} />
    </MetricsSection>
  );
}

function MetricsAccordion({
  column,
  expanded,
  onToggle,
}: {
  column: ColumnProfile;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasWarning = hasColumnIssue(column);

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-sm transition ${
        expanded
          ? "border-primary/25 bg-muted/[0.14]"
          : "border-border/70 bg-background hover:bg-muted/[0.18]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground">
            <CircleHelp className="size-3.5" />
          </span>

          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-foreground">
              Metrics
            </div>
            <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {expanded ? "Hide profile details" : "View profile details"}
            </div>
          </div>

          <span
            className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              hasWarning
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {hasWarning ? "Review" : "Clean"}
          </span>
        </div>

        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-border/70 px-3 py-3">
          <ExpandedMetricsContent column={column} />
        </div>
      ) : null}
    </div>
  );
}

function DeleteColumnDialog({
  open,
  onOpenChange,
  columnName,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  onDelete: () => void;
}) {
  function handleDelete() {
    onDelete();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete column</DialogTitle>
          <DialogDescription>
            This will remove{" "}
            <span className="font-semibold text-foreground">{columnName}</span>{" "}
            from the current workspace. A history point should be created before
            the change is saved.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchemaColumnCard({
  column,
  columnNames,
  onTypeChange,
  onDeleteColumn,
}: {
  column: ColumnProfile;
  columnNames: string[];
  onTypeChange: (columnName: string, nextType: ColumnType) => void;
  onDeleteColumn: (columnName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const hasIssue = hasColumnIssue(column);
  const canDelete = columnNames.length > 1;

  return (
    <>
      <article
        className={`overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
          expanded
            ? "border-primary/30 ring-2 ring-primary/5"
            : hasIssue
              ? "border-amber-200/80 dark:border-amber-900/50"
              : "border-border/70"
        }`}
      >
        <div className="space-y-2.5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <RenameInput column={column} columnNames={columnNames} />
            </div>

            <button
              type="button"
              disabled={!canDelete}
              onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
              aria-label={`Delete ${column.name}`}
              title={
                canDelete ? "Delete column" : "At least one column is required"
              }
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Type
            </span>

            <TypeSelect
              value={column.type}
              onChange={(nextType) => onTypeChange(column.name, nextType)}
            />
          </div>

          <MetricsAccordion
            column={column}
            expanded={expanded}
            onToggle={() => setExpanded((current) => !current)}
          />
        </div>
      </article>

      <DeleteColumnDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        columnName={column.name}
        onDelete={() => onDeleteColumn(column.name)}
      />
    </>
  );
}

function FilterButton({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
        selected
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          selected ? "bg-background text-foreground" : "bg-muted"
        }`}
      >
        {formatCount(count)}
      </span>
    </button>
  );
}

export function SchemaEditor() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const updateColumnType = useWorkspaceStore((state) => state.updateColumnType);
  const deleteColumn = useWorkspaceStore((state) => state.deleteColumn);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ColumnFilter>("all");

  const columns = workspace?.profile.columns ?? [];

  const columnNames = useMemo(
    () => columns.map((column) => column.name),
    [columns],
  );

  const numericColumnCount = useMemo(
    () => columns.filter((column) => NUMERIC_TYPES.includes(column.type)).length,
    [columns],
  );

  const columnsWithMissingCount = useMemo(
    () => columns.filter((column) => column.missingCount > 0).length,
    [columns],
  );

  const filteredColumns = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return columns.filter((column) => {
      const searchMatches =
        !normalizedSearchTerm ||
        column.name.toLowerCase().includes(normalizedSearchTerm) ||
        formatColumnTypeLabel(column.type)
          .toLowerCase()
          .includes(normalizedSearchTerm);

      return searchMatches && matchesFilter(column, activeFilter);
    });
  }, [activeFilter, columns, searchTerm]);

  const filterOptions: { value: ColumnFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "numeric", label: "Numeric" },
    { value: "categorical", label: "Categorical" },
    { value: "text", label: "Text" },
    { value: "date", label: "Date" },
    { value: "issues", label: "Issues" },
  ];

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-sm">
      <div className="shrink-0 border-b border-border/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground">
              <Database className="size-5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-[-0.02em] text-foreground">
                Schema
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Rename columns, correct inferred types, and review type-specific
                metrics.
              </p>
            </div>
          </div>

          <HeaderMetrics
            profile={workspace.profile}
            numericColumnCount={numericColumnCount}
            columnsWithMissingCount={columnsWithMissingCount}
          />
        </div>

        <SchemaToolsBar />
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-3 sm:p-4">
        <div className="mb-4 rounded-2xl border border-border/70 bg-background p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Column fields
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Showing {formatCount(filteredColumns.length)} of{" "}
                {formatCount(columns.length)} columns.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-2 xl:max-w-5xl xl:flex-row xl:items-center xl:justify-end">
              <div className="relative w-full xl:max-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search columns"
                  className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {filterOptions.map((option) => (
                  <FilterButton
                    key={option.value}
                    label={option.label}
                    count={getFilterCount(columns, option.value)}
                    selected={activeFilter === option.value}
                    onClick={() => setActiveFilter(option.value)}
                  />
                ))}
              </div>

              {activeFilter !== "all" || searchTerm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl px-3 text-xs"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveFilter("all");
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {filteredColumns.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredColumns.map((column) => (
              <SchemaColumnCard
                key={column.name}
                column={column}
                columnNames={columnNames}
                onTypeChange={updateColumnType}
                onDeleteColumn={deleteColumn}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-background">
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                No columns found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjust the search term or selected filter.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}