"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Columns3,
  Database,
  FilePlus2,
  Sigma,
  TextCursorInput,
  TriangleAlert,
} from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { InputWithLabel } from "@/components/ui/input-with-label";
import type { ColumnType } from "@/types/dataset";
import type { ColumnProfile } from "@/types/profile";
import {
  useWorkspaceStore,
  type ColumnNameTransform,
} from "@/store/workspaceStore";
import { formatNumber } from "@/lib/utils/formatNumber";

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
      label="Column name"
      value={draftName}
      error={error}
      inputClassName="h-9 rounded-xl px-3 font-medium"
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
    <CheckSelect<ColumnType>
      hideLabel
      label="Column type"
      value={value}
      options={COLUMN_TYPE_OPTIONS}
      onChange={onChange}
      triggerClassName="h-9 rounded-xl px-3 font-medium"
    />
  );
}

function ToolButton({
  icon: Icon,
  title,
}: {
  icon: ElementType;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10 rounded-xl px-4"
    >
      <Icon className="mr-2 size-4" />
      {title}
    </Button>
  );
}

function TransformColumnNamesTool() {
  const transformColumnNames = useWorkspaceStore(
    (state) => state.transformColumnNames,
  );

  const [open, setOpen] = useState(false);
  const [transform, setTransform] =
    useState<ColumnNameTransform>("title_case_spaces");

  function applyTransform() {
    transformColumnNames(transform);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ToolButton icon={TextCursorInput} title="Transform column names" />
      </DialogTrigger>

      <DialogContent className="max-w-xl rounded-3xl px-6 py-6">
        <DialogHeader>
          <DialogTitle>Transform column names</DialogTitle>
          <DialogDescription>
            Apply a bulk naming format to every column header. A history point
            will be created before the change is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 pb-8">
          <CheckSelect<ColumnNameTransform>
            label="Format"
            value={transform}
            options={COLUMN_NAME_TRANSFORM_OPTIONS}
            onChange={setTransform}
          />

          <div className="rounded-2xl border bg-muted/25 p-4 text-xs leading-5 text-muted-foreground">
            This changes column headers and updates schema, data, chart
            mappings, cleaning history references, and restore history.
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

function AddColumnTool() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const addColumn = useWorkspaceStore((state) => state.addColumn);

  const existingColumns = workspace?.fields ?? [];

  const [open, setOpen] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<ColumnType>("text");
  const [defaultValue, setDefaultValue] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setColumnName("");
    setColumnType("text");
    setDefaultValue("");
    setError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
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

    addColumn({
      columnName: trimmedName,
      columnType,
      defaultValue,
    });

    setOpen(false);
    resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ToolButton icon={FilePlus2} title="Add a new column" />
      </DialogTrigger>

      <DialogContent className="max-w-xl rounded-3xl px-6 py-6">
        <DialogHeader>
          <DialogTitle>Add a new column</DialogTitle>
          <DialogDescription>
            Add a column to the working dataset and original row structure. A
            history point will be created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 pb-8">
          <InputWithLabel
            label="Column name"
            value={columnName}
            error={error}
            placeholder="Example: Cleaning Status"
            onChange={(event) => {
              setColumnName(event.target.value);
              setError("");
            }}
          />

          <CheckSelect<ColumnType>
            label="Column type"
            value={columnType}
            options={COLUMN_TYPE_OPTIONS}
            onChange={setColumnType}
          />

          <InputWithLabel
            label="Default value"
            value={defaultValue}
            placeholder="Optional"
            helpText="This value will be added to every existing row. Leave empty for blank cells."
            onChange={(event) => setDefaultValue(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
  return (
    <section className="rounded-3xl border bg-muted/10 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="shrink-0">
          <h3 className="text-sm font-semibold text-foreground">Tools</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Schema-level operations
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:ml-4">
          <TransformColumnNamesTool />
          <AddColumnTool />
        </div>
      </div>
    </section>
  );
}

function renderTopValues(column: ColumnProfile): string {
  if (column.topValues.length === 0) return "No repeated values";

  return column.topValues
    .map((item) => `${item.value} (${item.count})`)
    .join(", ");
}

function getDuplicateCount(column: ColumnProfile): number {
  return Math.max(
    0,
    column.totalValues - column.missingCount - column.uniqueCount,
  );
}

function MissingMetric({ column }: { column: ColumnProfile }) {
  return (
    <Metric
      label="Missing"
      value={`${column.missingCount} (${column.missingPercentage.toFixed(1)}%)`}
      intent={column.missingCount > 0 ? "warning" : "default"}
    />
  );
}

function ColumnMetrics({ column }: { column: ColumnProfile }) {
  if (column.type === "text") {
    return (
      <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
        <MissingMetric column={column} />
      </div>
    );
  }

  if (NUMERIC_TYPES.includes(column.type)) {
    if (!column.numericSummary) {
      return (
        <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
          <MissingMetric column={column} />
          <Metric label="Summary" value="No numeric summary" />
        </div>
      );
    }

    return (
      <div className="grid max-w-4xl grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-5">
        <MissingMetric column={column} />
        <Metric label="Mean" value={formatNumber(column.numericSummary.mean)} />
        <Metric
          label="Median"
          value={formatNumber(column.numericSummary.median)}
        />
        <Metric label="Min" value={formatNumber(column.numericSummary.min)} />
        <Metric label="Max" value={formatNumber(column.numericSummary.max)} />
        <Metric
          label="Std dev"
          value={formatNumber(column.numericSummary.standardDeviation)}
        />
        <Metric label="Q1" value={formatNumber(column.numericSummary.q1)} />
        <Metric label="Q3" value={formatNumber(column.numericSummary.q3)} />
        <Metric
          label="Outliers"
          value={String(column.outliers?.count ?? 0)}
          intent={(column.outliers?.count ?? 0) > 0 ? "danger" : "default"}
        />
      </div>
    );
  }

  if (column.type === "date" || column.type === "datetime") {
    if (!column.dateSummary) {
      return (
        <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
          <MissingMetric column={column} />
          <Metric label="Unique" value={`${column.uniqueCount}`} />
        </div>
      );
    }

    return (
      <div className="grid max-w-2xl grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
        <MissingMetric column={column} />
        <Metric label="Earliest" value={column.dateSummary.min} />
        <Metric label="Latest" value={column.dateSummary.max} />
        <Metric label="Unique" value={`${column.uniqueCount}`} />
      </div>
    );
  }

  if (column.type === "category") {
    return (
      <div className="space-y-1">
        <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
          <MissingMetric column={column} />
          <Metric label="Unique" value={`${column.uniqueCount}`} />
        </div>

        <p className="max-w-3xl truncate text-xs text-muted-foreground">
          Top: {renderTopValues(column)}
        </p>
      </div>
    );
  }

  if (column.type === "boolean") {
    return (
      <div className="space-y-1">
        <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
          <MissingMetric column={column} />
          <Metric label="Unique" value={`${column.uniqueCount}`} />
        </div>

        <p className="max-w-3xl truncate text-xs text-muted-foreground">
          Values: {renderTopValues(column)}
        </p>
      </div>
    );
  }

  if (IDENTITY_TYPES.includes(column.type)) {
    const duplicateCount = getDuplicateCount(column);

    return (
      <div className="grid max-w-2xl grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-3">
        <MissingMetric column={column} />
        <Metric label="Unique" value={`${column.uniqueCount}`} />
        <Metric
          label="Duplicates"
          value={`${duplicateCount}`}
          intent={duplicateCount > 0 ? "warning" : "default"}
        />
      </div>
    );
  }

  if (
    column.type === "country_code" ||
    column.type === "postal_code" ||
    column.type === "time"
  ) {
    return (
      <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
        <MissingMetric column={column} />
        <Metric label="Unique" value={`${column.uniqueCount}`} />
      </div>
    );
  }

  return (
    <div className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1">
      <MissingMetric column={column} />
      <Metric label="Unique" value={`${column.uniqueCount}`} />
    </div>
  );
}

function Metric({
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
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`truncate text-xs font-semibold ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-muted/25 px-3 py-2 shadow-sm">
      <span className="flex size-7 items-center justify-center rounded-xl border bg-background">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>

      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function SchemaEditor() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const updateColumnType = useWorkspaceStore((state) => state.updateColumnType);

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

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border bg-background">
      <div className="shrink-0 border-b px-5 py-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/30">
                <Columns3 className="size-5 text-foreground" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Schema
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Rename columns, correct inferred types, and review
                  type-specific metrics.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SummaryChip
                label="Columns"
                value={columns.length.toLocaleString()}
                icon={Database}
              />
              <SummaryChip
                label="Numeric"
                value={numericColumnCount.toLocaleString()}
                icon={Sigma}
              />
              <SummaryChip
                label="With missing"
                value={columnsWithMissingCount.toLocaleString()}
                icon={TriangleAlert}
              />
            </div>
          </div>

          <SchemaToolsBar />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1180px] table-auto text-left text-sm">
          <thead className="sticky top-0 z-20 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-30 w-[320px] border-b border-r bg-muted px-4 py-3 font-semibold">
                Column
              </th>
              <th className="w-[220px] border-b border-r px-4 py-3 font-semibold">
                Type
              </th>
              <th className="border-b px-4 py-3 font-semibold">Metrics</th>
            </tr>
          </thead>

          <tbody>
            {columns.map((column) => (
              <tr key={column.name} className="group border-b hover:bg-muted/35">
                <td className="sticky left-0 z-10 border-r bg-background px-4 py-3 align-top group-hover:bg-muted/35">
                  <RenameInput column={column} columnNames={columnNames} />
                </td>

                <td className="border-r px-4 py-3 align-top">
                  <TypeSelect
                    value={column.type}
                    onChange={(nextType) =>
                      updateColumnType(column.name, nextType)
                    }
                  />
                </td>

                <td className="px-4 py-4 align-top">
                  <ColumnMetrics column={column} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}