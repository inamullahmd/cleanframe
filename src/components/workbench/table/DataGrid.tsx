"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  EyeOff,
  Gauge,
  Rows3,
  Search,
  Sigma,
  Table2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import { isValueOutlier } from "@/lib/profile/detectOutliers";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ColumnType, DatasetRow } from "@/types/dataset";
import type { ColumnProfile, DatasetProfile } from "@/types/profile";

type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const NUMERIC_COLUMN_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

function parseSortableNumber(value: unknown): number | null {
  const normalized = String(value ?? "")
    .trim()
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDisplayNumber(value: unknown): number | null {
  if (isMissingValue(value)) return null;

  const normalized = String(value ?? "")
    .trim()
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumberValue(value: unknown, maximumFractionDigits = 2): string {
  const parsed = parseDisplayNumber(value);
  if (parsed === null) return String(value ?? "");

  return parsed.toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

function formatDateValue(value: unknown): string {
  if (isMissingValue(value)) return "";

  const rawValue = String(value ?? "").trim();
  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) return rawValue;

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTimeValue(value: unknown): string {
  if (isMissingValue(value)) return "";

  const rawValue = String(value ?? "").trim();
  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) return rawValue;

  return parsedDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBooleanValue(value: unknown): string {
  if (isMissingValue(value)) return "";

  const normalized = String(value ?? "").trim().toLowerCase();

  if (["true", "1", "yes", "y"].includes(normalized)) return "Yes";
  if (["false", "0", "no", "n"].includes(normalized)) return "No";

  return String(value ?? "");
}

function formatCellValue({
  value,
  column,
  showFormattedValues,
}: {
  value: unknown;
  column?: ColumnProfile;
  showFormattedValues: boolean;
}): string {
  if (!showFormattedValues) return String(value ?? "");
  if (isMissingValue(value)) return "";

  const columnType = column?.type;
  if (!columnType) return String(value ?? "");

  if (columnType === "currency") {
    const parsed = parseDisplayNumber(value);
    if (parsed === null) return String(value ?? "");

    return parsed.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  if (columnType === "percentage") {
    const parsed = parseDisplayNumber(value);
    if (parsed === null) return String(value ?? "");

    if (Math.abs(parsed) <= 1) {
      return `${(parsed * 100).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}%`;
    }

    return `${parsed.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}%`;
  }

  if (columnType === "integer") return formatNumberValue(value, 0);
  if (columnType === "decimal" || columnType === "number") {
    return formatNumberValue(value, 2);
  }
  if (columnType === "latitude" || columnType === "longitude") {
    return formatNumberValue(value, 5);
  }
  if (columnType === "date") return formatDateValue(value);
  if (columnType === "datetime") return formatDateTimeValue(value);
  if (columnType === "boolean") return formatBooleanValue(value);

  return String(value ?? "");
}

function includesSearchValue({
  row,
  fields,
  columnProfileByName,
  searchTerm,
  showFormattedValues,
}: {
  row: DatasetRow;
  fields: string[];
  columnProfileByName: Map<string, ColumnProfile>;
  searchTerm: string;
  showFormattedValues: boolean;
}) {
  if (!searchTerm) return true;

  const normalizedSearch = searchTerm.toLowerCase();

  return fields.some((field) => {
    const columnMatches = field.toLowerCase().includes(normalizedSearch);

    const rawValueMatches = String(row[field] ?? "")
      .toLowerCase()
      .includes(normalizedSearch);

    const formattedValueMatches = formatCellValue({
      value: row[field],
      column: columnProfileByName.get(field),
      showFormattedValues,
    })
      .toLowerCase()
      .includes(normalizedSearch);

    return columnMatches || rawValueMatches || formattedValueMatches;
  });
}

function isOutlierCell(value: unknown, column?: ColumnProfile): boolean {
  if (!column?.outliers) return false;
  return isValueOutlier(value, column.outliers);
}

function getCellClassName({
  missing,
  outlier,
}: {
  missing: boolean;
  outlier: boolean;
}) {
  const baseClass =
    "max-w-[280px] truncate whitespace-nowrap border-r px-2.5 py-2 text-[11px] leading-4 last:border-r-0";

  if (missing) {
    return `${baseClass} bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100`;
  }

  if (outlier) {
    return `${baseClass} bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100`;
  }

  return `${baseClass} text-foreground`;
}

function formatCount(value: number): string {
  return value.toLocaleString();
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

function LegendItem({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-3 rounded-sm border ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function CompactSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (!open) return;

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 min-w-[108px] items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-3 text-xs font-semibold leading-none text-foreground shadow-sm transition hover:bg-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        <span className="whitespace-nowrap">{value} rows</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-9 w-[120px] overflow-hidden rounded-xl border border-border bg-background p-1 shadow-xl">
          {PAGE_SIZE_OPTIONS.map((size) => {
            const selected = size === value;

            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  onChange(size);
                  setOpen(false);
                }}
                className={`flex h-8 w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="whitespace-nowrap">{size} rows</span>
                {selected ? <Check className="size-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FormattedValuesToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${
        checked
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-flex size-4 items-center justify-center rounded border ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        }`}
      >
        {checked ? <Check className="size-3" /> : null}
      </span>
      Formatted values
    </button>
  );
}

function ColumnsPopover({
  fields,
  visibleFields,
  hiddenColumnNames,
  onToggleColumn,
  onShowAllColumns,
  onHideAllColumns,
}: {
  fields: string[];
  visibleFields: string[];
  hiddenColumnNames: string[];
  onToggleColumn: (field: string) => void;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (!open) return;

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-xl px-3 text-xs"
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 className="mr-1.5 size-3.5" />
        Columns {visibleFields.length}/{fields.length}
        <ChevronDown
          className={`ml-1 size-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </Button>

      {open ? (
        <div className="absolute left-0 z-30 mt-2 w-[320px] overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:left-auto sm:right-0">
          <div className="border-b border-border/70 p-3">
            <div className="text-sm font-bold text-foreground">
              Visible columns
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose which columns appear in the data grid.
            </p>
          </div>

          <div className="p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-muted-foreground">
                Showing {visibleFields.length} of {fields.length}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-border/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={onShowAllColumns}
                >
                  Show all
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={onHideAllColumns}
                >
                  Hide all
                </button>
              </div>
            </div>

            <div className="max-h-72 space-y-1 overflow-auto pr-1">
              {fields.map((field) => {
                const checked = !hiddenColumnNames.includes(field);

                return (
                  <label
                    key={field}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-muted/60"
                  >
                    <span
                      className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </span>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleColumn(field)}
                      className="sr-only"
                    />

                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {field}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DataGrid() {
  const workspace = useWorkspaceStore((state) => state.workspace);

  const rows = workspace?.workingRows ?? [];
  const fields = workspace?.fields ?? [];
  const columns = workspace?.profile.columns ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState(fields[0] ?? "");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [showFormattedValues, setShowFormattedValues] = useState(true);
  const [hiddenColumnNames, setHiddenColumnNames] = useState<string[]>([]);

  const columnProfileByName = useMemo(() => {
    return new Map(columns.map((column) => [column.name, column]));
  }, [columns]);

  const visibleFields = useMemo(() => {
    return fields.filter((field) => !hiddenColumnNames.includes(field));
  }, [fields, hiddenColumnNames]);

  const numericColumnCount = useMemo(
    () =>
      columns.filter((column) => NUMERIC_COLUMN_TYPES.includes(column.type))
        .length,
    [columns],
  );

  const columnsWithMissingCount = useMemo(
    () => columns.filter((column) => column.missingCount > 0).length,
    [columns],
  );

  useEffect(() => {
    setHiddenColumnNames((current) =>
      current.filter((columnName) => fields.includes(columnName)),
    );
  }, [fields]);

  useEffect(() => {
    setSortColumn((current) => {
      if (visibleFields.includes(current)) return current;
      return visibleFields[0] ?? "";
    });
  }, [visibleFields]);

  useEffect(() => {
    setPageIndex(0);
  }, [
    searchTerm,
    sortColumn,
    sortDirection,
    pageSize,
    rows,
    visibleFields,
    showFormattedValues,
  ]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      includesSearchValue({
        row,
        fields: visibleFields,
        columnProfileByName,
        searchTerm,
        showFormattedValues,
      }),
    );
  }, [rows, visibleFields, columnProfileByName, searchTerm, showFormattedValues]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((a, b) => {
      const rawA = a[sortColumn] ?? "";
      const rawB = b[sortColumn] ?? "";

      const column = columnProfileByName.get(sortColumn);

      const numberA =
        column && NUMERIC_COLUMN_TYPES.includes(column.type)
          ? parseSortableNumber(rawA)
          : null;

      const numberB =
        column && NUMERIC_COLUMN_TYPES.includes(column.type)
          ? parseSortableNumber(rawB)
          : null;

      if (numberA !== null && numberB !== null) {
        return (numberA - numberB) * directionMultiplier;
      }

      return (
        String(rawA).localeCompare(String(rawB), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * directionMultiplier
      );
    });
  }, [filteredRows, sortColumn, sortDirection, columnProfileByName]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);
  const startIndex = currentPageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleRows = sortedRows.slice(startIndex, endIndex);

  function toggleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }

  function getSortIndicator(column: string) {
    if (sortColumn !== column) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function toggleColumnVisibility(field: string) {
    setHiddenColumnNames((current) => {
      if (current.includes(field)) {
        return current.filter((columnName) => columnName !== field);
      }
      return [...current, field];
    });
  }

  function showAllColumns() {
    setHiddenColumnNames([]);
  }

  function hideAllColumns() {
    setHiddenColumnNames(fields);
  }

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-sm">
      <div className="shrink-0 border-b border-border/70 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground">
              <Table2 className="size-5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
                Data
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Search, sort, paginate, and inspect every row in the working
                dataset.
              </p>
            </div>
          </div>

          <HeaderMetrics
            profile={workspace.profile}
            numericColumnCount={numericColumnCount}
            columnsWithMissingCount={columnsWithMissingCount}
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-border/70 bg-muted/[0.18] px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <FormattedValuesToggle
              checked={showFormattedValues}
              onChange={setShowFormattedValues}
            />

            <ColumnsPopover
              fields={fields}
              visibleFields={visibleFields}
              hiddenColumnNames={hiddenColumnNames}
              onToggleColumn={toggleColumnVisibility}
              onShowAllColumns={showAllColumns}
              onHideAllColumns={hideAllColumns}
            />

            {hiddenColumnNames.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-xl px-3 text-xs"
                onClick={showAllColumns}
              >
                <EyeOff className="mr-1.5 size-3.5" />
                {hiddenColumnNames.length} hidden
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LegendItem
              label="Missing"
              className="border-amber-300 bg-amber-100"
            />
            <LegendItem
              label="Outlier"
              className="border-rose-300 bg-rose-100"
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[280px] lg:max-w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search rows or columns"
              className="h-9 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CompactSelect value={pageSize} onChange={setPageSize} />

            <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-1.5 text-[11px] text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {totalRows === 0 ? 0 : startIndex + 1}
              </span>{" "}
              –{" "}
              <span className="font-semibold text-foreground">
                {Math.min(endIndex, totalRows)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalRows}
              </span>{" "}
              matching rows from{" "}
              <span className="font-semibold text-foreground">
                {rows.length}
              </span>
              .
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-1.5 text-[11px] text-muted-foreground">
              Columns{" "}
              <span className="font-semibold text-foreground">
                {visibleFields.length}
              </span>{" "}
              /{" "}
              <span className="font-semibold text-foreground">
                {fields.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-border/70">
        {visibleFields.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center p-6">
            <div className="max-w-sm rounded-2xl border border-dashed border-border bg-muted/[0.18] p-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                All columns are hidden
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Open Columns and show at least one column to view the data grid.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-8 rounded-xl px-3 text-xs"
                onClick={showAllColumns}
              >
                Show all columns
              </Button>
            </div>
          </div>
        ) : (
          <table className="min-w-full border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr className="border-b border-border/70">
                <th className="w-[56px] border-r px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  #
                </th>

                {visibleFields.map((field) => (
                  <th
                    key={field}
                    className="min-w-[140px] border-r px-2.5 py-2 last:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(field)}
                      className="flex max-w-[220px] items-center gap-1.5 truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
                      title={field}
                    >
                      <span className="truncate">{field}</span>
                      <span className="shrink-0 text-[9px]">
                        {getSortIndicator(field)}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleFields.length + 1}
                    className="px-4 py-12 text-center text-xs text-muted-foreground"
                  >
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIndex) => (
                  <tr
                    key={`${startIndex + rowIndex}-${JSON.stringify(row)}`}
                    className="border-b border-border/70 transition hover:bg-muted/30"
                  >
                    <td className="w-[56px] border-r px-2.5 py-2 text-[10px] font-semibold text-muted-foreground">
                      {(startIndex + rowIndex + 1).toLocaleString()}
                    </td>

                    {visibleFields.map((field) => {
                      const value = row[field];
                      const column = columnProfileByName.get(field);
                      const missing = isMissingValue(value);
                      const outlier = !missing && isOutlierCell(value, column);
                      const displayValue = formatCellValue({
                        value,
                        column,
                        showFormattedValues,
                      });

                      return (
                        <td
                          key={field}
                          className={getCellClassName({ missing, outlier })}
                          title={
                            showFormattedValues
                              ? `Formatted: ${displayValue}\nRaw: ${String(
                                  value ?? "",
                                )}`
                              : String(value ?? "")
                          }
                        >
                          {missing ? "Missing" : displayValue}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
        <div className="text-xs text-muted-foreground">
          Page{" "}
          <span className="font-semibold text-foreground">
            {currentPageIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setPageIndex(0)}
            disabled={currentPageIndex === 0}
            className="size-8 rounded-xl"
          >
            <ChevronsLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setPageIndex((current) => Math.max(0, current - 1))
            }
            disabled={currentPageIndex === 0}
            className="size-8 rounded-xl"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setPageIndex((current) => Math.min(totalPages - 1, current + 1))
            }
            disabled={currentPageIndex >= totalPages - 1}
            className="size-8 rounded-xl"
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setPageIndex(totalPages - 1)}
            disabled={currentPageIndex >= totalPages - 1}
            className="size-8 rounded-xl"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}