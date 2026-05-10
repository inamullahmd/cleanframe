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
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ColumnType, DatasetRow } from "@/types/dataset";
import type { ColumnProfile, DatasetProfile } from "@/types/profile";

type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TEXT_SIZE_STORAGE_KEY = "cleanframe-data-grid-text-size";
const MIN_GRID_TEXT_SIZE = 10;
const MAX_GRID_TEXT_SIZE = 16;
const DEFAULT_GRID_TEXT_SIZE = 12;

const NUMERIC_COLUMN_TYPES: ColumnType[] = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

function clampGridTextSize(value: number) {
  return Math.min(MAX_GRID_TEXT_SIZE, Math.max(MIN_GRID_TEXT_SIZE, value));
}

function getGridTextClasses(textSize: number) {
  if (textSize <= 10) {
    return {
      cell: "!text-[10px] leading-4",
      header: "!text-[10px] leading-4",
      rowNumber: "!text-[10px]",
      cellPadding: "px-2 py-1.5",
      headerPadding: "px-2 py-2",
    };
  }

  if (textSize === 11) {
    return {
      cell: "!text-[11px] leading-4",
      header: "!text-[10px] leading-4",
      rowNumber: "!text-[10px]",
      cellPadding: "px-2 py-1.5",
      headerPadding: "px-2 py-2",
    };
  }

  if (textSize === 13) {
    return {
      cell: "!text-[13px] leading-5",
      header: "!text-[12px] leading-4",
      rowNumber: "!text-[12px]",
      cellPadding: "px-3 py-2.5",
      headerPadding: "px-3 py-2.5",
    };
  }

  if (textSize === 14) {
    return {
      cell: "!text-[14px] leading-5",
      header: "!text-[13px] leading-5",
      rowNumber: "!text-[13px]",
      cellPadding: "px-3 py-2.5",
      headerPadding: "px-3 py-2.5",
    };
  }

  if (textSize === 15) {
    return {
      cell: "!text-[15px] leading-6",
      header: "!text-[13px] leading-5",
      rowNumber: "!text-[13px]",
      cellPadding: "px-3.5 py-3",
      headerPadding: "px-3.5 py-3",
    };
  }

  if (textSize >= 16) {
    return {
      cell: "!text-[16px] leading-6",
      header: "!text-[14px] leading-5",
      rowNumber: "!text-[14px]",
      cellPadding: "px-4 py-3",
      headerPadding: "px-4 py-3",
    };
  }

  return {
    cell: "!text-[12px] leading-4",
    header: "!text-[11px] leading-4",
    rowNumber: "!text-[11px]",
    cellPadding: "px-2.5 py-2",
    headerPadding: "px-2.5 py-2",
  };
}

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
  textSize,
}: {
  missing: boolean;
  outlier: boolean;
  textSize: number;
}) {
  const textClasses = getGridTextClasses(textSize);

  const baseClass = cn(
    "max-w-[320px] truncate whitespace-nowrap border-r last:border-r-0",
    textClasses.cell,
    textClasses.cellPadding,
  );

  if (missing) {
    return cn(
      baseClass,
      "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
    );
  }

  if (outlier) {
    return cn(
      baseClass,
      "bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100",
    );
  }

  return cn(baseClass, "text-foreground");
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
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="!text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("!text-[13px] font-bold", valueClassName)}>
        {value}
      </span>
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
    <div className="flex flex-wrap items-center gap-2">
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
        icon={AlertTriangle}
        label="Missing cols"
        value={formatCount(columnsWithMissingCount)}
        intent={columnsWithMissingCount > 0 ? "warning" : "default"}
      />

      <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
        <Gauge className="size-3.5 text-muted-foreground" />
        <span className="!text-[13px] text-muted-foreground">Quality</span>
        <span className="!text-[13px] font-bold text-foreground">
          {profile.qualityScore}/100
        </span>
        <Badge
          variant={getQualityBadgeVariant(profile.qualityScore)}
          className="h-5 rounded-lg px-1.5 !text-[11px]"
        >
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
    <span className="inline-flex items-center gap-1.5 !text-[13px] text-muted-foreground">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
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
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 min-w-[108px] items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold leading-none text-foreground shadow-sm transition hover:bg-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        {value} rows
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-30 w-36 rounded-2xl border border-border bg-background p-1.5 shadow-xl">
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
                className={cn(
                  "flex h-8 w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 !text-[13px] font-semibold transition",
                  selected
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {size} rows
                {selected ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TextSizeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const canDecrease = value > MIN_GRID_TEXT_SIZE;
  const canIncrease = value < MAX_GRID_TEXT_SIZE;

  function decrease() {
    onChange(clampGridTextSize(value - 1));
  }

  function increase() {
    onChange(clampGridTextSize(value + 1));
  }

  function reset() {
    onChange(DEFAULT_GRID_TEXT_SIZE);
  }

  return (
    <div className="inline-flex h-8 items-center rounded-xl border border-border bg-background p-1 shadow-sm">
      <button
        type="button"
        onClick={decrease}
        disabled={!canDecrease}
        className={cn(
          "flex h-6 min-w-8 items-center justify-center rounded-lg px-2 !text-[12px] font-bold leading-none transition",
          canDecrease
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "cursor-not-allowed text-muted-foreground/35",
        )}
        title={`Decrease grid text size. Minimum ${MIN_GRID_TEXT_SIZE}px.`}
      >
        A-
      </button>

      <button
        type="button"
        onClick={reset}
        className={cn(
          "flex h-6 min-w-[48px] items-center justify-center rounded-lg px-2 !text-[12px] font-bold leading-none transition",
          value === DEFAULT_GRID_TEXT_SIZE
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        title={`Reset grid text size to ${DEFAULT_GRID_TEXT_SIZE}px.`}
      >
        {value}px
      </button>

      <button
        type="button"
        onClick={increase}
        disabled={!canIncrease}
        className={cn(
          "flex h-6 min-w-8 items-center justify-center rounded-lg px-2 !text-[13px] font-bold leading-none transition",
          canIncrease
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "cursor-not-allowed text-muted-foreground/35",
        )}
        title={`Increase grid text size. Maximum ${MAX_GRID_TEXT_SIZE}px.`}
      >
        A+
      </button>
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
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-xl border px-3 !text-[13px] font-semibold shadow-sm transition",
        checked
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-pressed={checked}
    >
      {checked ? <Check className="size-3.5" /> : null}
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
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-2 rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold text-foreground shadow-sm transition hover:bg-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
      >
        <Columns3 className="size-3.5 text-muted-foreground" />
        Columns {visibleFields.length}/{fields.length}
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-30 w-[320px] rounded-2xl border border-border bg-background p-3 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="!text-[13px] font-bold text-foreground">
                Visible columns
              </p>
              <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">
                Choose which columns appear in the data grid.
              </p>
            </div>

            <Badge variant="secondary" className="rounded-lg !text-[11px]">
              {visibleFields.length}/{fields.length}
            </Badge>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onShowAllColumns}
              className="h-7 rounded-lg px-2 !text-[12px]"
            >
              Show all
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onHideAllColumns}
              className="h-7 rounded-lg px-2 !text-[12px]"
            >
              Hide all
            </Button>
          </div>

          <div className="mt-3 max-h-72 space-y-1 overflow-auto pr-1">
            {fields.map((field) => {
              const checked = !hiddenColumnNames.includes(field);

              return (
                <label
                  key={field}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    {checked ? <Check className="size-3" /> : null}
                  </span>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleColumn(field)}
                    className="sr-only"
                  />

                  <span className="min-w-0 truncate !text-[13px] font-medium text-foreground">
                    {field}
                  </span>
                </label>
              );
            })}
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
  const [gridTextSize, setGridTextSize] = useState(DEFAULT_GRID_TEXT_SIZE);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTextSize = Number(
      window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY),
    );

    if (Number.isFinite(savedTextSize)) {
      setGridTextSize(clampGridTextSize(savedTextSize));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(gridTextSize));
  }, [gridTextSize]);

  const textClasses = getGridTextClasses(gridTextSize);

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
  }, [
    rows,
    visibleFields,
    columnProfileByName,
    searchTerm,
    showFormattedValues,
  ]);

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
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="shrink-0 border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">
                Data
              </h2>

              {hiddenColumnNames.length > 0 ? (
                <Badge variant="secondary" className="rounded-lg !text-[11px]">
                  <EyeOff className="mr-1 size-3" />
                  {hiddenColumnNames.length} hidden
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
              Search, sort, paginate, and inspect every row in the working
              dataset.
            </p>
          </div>

          <HeaderMetrics
            profile={workspace.profile}
            numericColumnCount={numericColumnCount}
            columnsWithMissingCount={columnsWithMissingCount}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search rows or columns"
              className="h-9 w-full rounded-xl border border-border bg-background pl-10 pr-3 !text-[13px] outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <TextSizeControl
              value={gridTextSize}
              onChange={setGridTextSize}
            />

            <CompactSelect value={pageSize} onChange={setPageSize} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="!text-[13px] leading-5 text-muted-foreground">
            Showing{" "}
            <span className="font-bold text-foreground">
              {totalRows === 0 ? 0 : startIndex + 1}
            </span>{" "}
            –{" "}
            <span className="font-bold text-foreground">
              {Math.min(endIndex, totalRows)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-foreground">
              {totalRows.toLocaleString()}
            </span>{" "}
            matching rows from{" "}
            <span className="font-bold text-foreground">
              {rows.length.toLocaleString()}
            </span>
            .
          </p>

          <div className="flex items-center gap-3">
            <LegendItem label="Missing" className="bg-amber-400" />
            <LegendItem label="Outlier" className="bg-rose-400" />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.04]">
        {visibleFields.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm rounded-2xl border border-dashed border-border bg-background p-6 text-center">
              <Table2 className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 !text-[13px] font-bold text-foreground">
                All columns are hidden
              </h3>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Open Columns and show at least one column to view the data grid.
              </p>

              <Button
                type="button"
                onClick={showAllColumns}
                className="mt-4 h-8 rounded-xl px-3 !text-[13px]"
              >
                Show all columns
              </Button>
            </div>
          </div>
        ) : (
          <table className="min-w-full table-auto border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
              <tr>
                <th
                  className={cn(
                    "w-[74px] border-r bg-muted/35 text-left font-bold uppercase tracking-[0.12em] text-muted-foreground",
                    textClasses.header,
                    textClasses.headerPadding,
                  )}
                >
                  #
                </th>

                {visibleFields.map((field) => (
                  <th
                    key={field}
                    className={cn(
                      "min-w-[160px] border-r bg-muted/35 text-left last:border-r-0",
                      textClasses.headerPadding,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(field)}
                      className={cn(
                        "flex max-w-[260px] items-center gap-1.5 truncate font-bold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground",
                        textClasses.header,
                      )}
                      title={field}
                    >
                      <span className="truncate">{field}</span>
                      <span className="shrink-0">
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
                    className="px-4 py-10 text-center"
                  >
                    <TriangleAlert className="mx-auto size-7 text-muted-foreground" />
                    <p className="mt-3 !text-[13px] font-bold text-foreground">
                      No rows match your search.
                    </p>
                    <p className="mt-1 !text-[13px] text-muted-foreground">
                      Try a different keyword or show more columns.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIndex) => (
                  <tr
                    key={`${startIndex + rowIndex}-${JSON.stringify(row)}`}
                    className="border-b transition hover:bg-muted/35"
                  >
                    <td
                      className={cn(
                        "border-r border-b bg-muted/20 font-mono text-muted-foreground",
                        textClasses.rowNumber,
                        textClasses.cellPadding,
                      )}
                    >
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
                          key={`${startIndex + rowIndex}-${field}`}
                          title={missing ? "Missing" : displayValue}
                          className={cn(
                            "border-b",
                            getCellClassName({
                              missing,
                              outlier,
                              textSize: gridTextSize,
                            }),
                          )}
                        >
                          {missing ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              <AlertTriangle className="size-3.5" />
                              Missing
                            </span>
                          ) : (
                            displayValue
                          )}
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
        <p className="!text-[13px] text-muted-foreground">
          Page{" "}
          <span className="font-bold text-foreground">
            {currentPageIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-bold text-foreground">
            {totalPages.toLocaleString()}
          </span>
        </p>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPageIndex(0)}
            disabled={currentPageIndex === 0}
            className="size-8 rounded-xl p-0"
          >
            <ChevronsLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setPageIndex((current) => Math.max(0, current - 1))
            }
            disabled={currentPageIndex === 0}
            className="size-8 rounded-xl p-0"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setPageIndex((current) => Math.min(totalPages - 1, current + 1))
            }
            disabled={currentPageIndex >= totalPages - 1}
            className="size-8 rounded-xl p-0"
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setPageIndex(totalPages - 1)}
            disabled={currentPageIndex >= totalPages - 1}
            className="size-8 rounded-xl p-0"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}