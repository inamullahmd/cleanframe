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
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import {
  formatConfiguredBoolean,
  getGridNumberDecimalPlaces,
  parseConfiguredDate,
  parseConfiguredNumber,
} from "@/lib/settings/valueParsers";
import type { CleanframeSettings } from "@/types/cleanframeSettings";
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
  return Math.min(MAX_GRID_TEXT_SIZE, Math.max(MIN_GRID_TEXT_SIZE, Math.round(value)));
}

function getGridTextClasses(textSize: number, rowDensity: "compact" | "comfortable") {
  const comfortable = rowDensity === "comfortable";

  if (textSize <= 10) {
    return {
      cell: "!text-[10px] leading-4",
      header: "!text-[10px] leading-4",
      rowNumber: "!text-[10px]",
      cellPadding: comfortable ? "px-2.5 py-2" : "px-2 py-1.5",
      headerPadding: comfortable ? "px-2.5 py-2.5" : "px-2 py-2",
    };
  }

  if (textSize === 11) {
    return {
      cell: "!text-[11px] leading-4",
      header: "!text-[10px] leading-4",
      rowNumber: "!text-[10px]",
      cellPadding: comfortable ? "px-2.5 py-2" : "px-2 py-1.5",
      headerPadding: comfortable ? "px-2.5 py-2.5" : "px-2 py-2",
    };
  }

  if (textSize === 13) {
    return {
      cell: "!text-[13px] leading-5",
      header: "!text-[12px] leading-4",
      rowNumber: "!text-[12px]",
      cellPadding: comfortable ? "px-3.5 py-3" : "px-3 py-2.5",
      headerPadding: comfortable ? "px-3.5 py-3" : "px-3 py-2.5",
    };
  }

  if (textSize === 14) {
    return {
      cell: "!text-[14px] leading-5",
      header: "!text-[13px] leading-5",
      rowNumber: "!text-[13px]",
      cellPadding: comfortable ? "px-4 py-3.5" : "px-3 py-2.5",
      headerPadding: comfortable ? "px-4 py-3.5" : "px-3 py-2.5",
    };
  }

  if (textSize === 15) {
    return {
      cell: "!text-[15px] leading-6",
      header: "!text-[13px] leading-5",
      rowNumber: "!text-[13px]",
      cellPadding: comfortable ? "px-4 py-4" : "px-3.5 py-3",
      headerPadding: comfortable ? "px-4 py-4" : "px-3.5 py-3",
    };
  }

  if (textSize >= 16) {
    return {
      cell: "!text-[16px] leading-6",
      header: "!text-[14px] leading-5",
      rowNumber: "!text-[14px]",
      cellPadding: comfortable ? "px-5 py-4" : "px-4 py-3",
      headerPadding: comfortable ? "px-5 py-4" : "px-4 py-3",
    };
  }

  return {
    cell: "!text-[12px] leading-4",
    header: "!text-[11px] leading-4",
    rowNumber: "!text-[11px]",
    cellPadding: comfortable ? "px-3 py-2.5" : "px-2.5 py-2",
    headerPadding: comfortable ? "px-3 py-2.5" : "px-2.5 py-2",
  };
}

function parseSortableNumber(
  value: unknown,
  settings: CleanframeSettings,
): number | null {
  return parseConfiguredNumber(value, {
    numberParsingMode: settings.numberParsingMode,
    emptyValueTokens: settings.emptyValueTokens,
  });
}

function parseDisplayNumber(
  value: unknown,
  settings: CleanframeSettings,
): number | null {
  return parseConfiguredNumber(value, {
    numberParsingMode: settings.numberParsingMode,
    emptyValueTokens: settings.emptyValueTokens,
  });
}

function formatNumberValue(
  value: unknown,
  settings: CleanframeSettings,
  maximumFractionDigits = 2,
): string {
  const parsed = parseDisplayNumber(value, settings);
  if (parsed === null) return String(value ?? "");
  return parsed.toLocaleString(undefined, { maximumFractionDigits });
}

function formatDateValue(value: unknown, settings: CleanframeSettings): string {
  if (isMissingValue(value, settings.emptyValueTokens)) return "";
  const rawValue = String(value ?? "").trim();
  const parsedDate = parseConfiguredDate(rawValue, {
    dateParsingMode: settings.dateParsingMode,
    emptyValueTokens: settings.emptyValueTokens,
  });
  if (!parsedDate) return rawValue;
  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTimeValue(value: unknown, settings: CleanframeSettings): string {
  if (isMissingValue(value, settings.emptyValueTokens)) return "";
  const rawValue = String(value ?? "").trim();
  const parsedDate = parseConfiguredDate(rawValue, {
    dateParsingMode: settings.dateParsingMode,
    emptyValueTokens: settings.emptyValueTokens,
  });
  if (!parsedDate) return rawValue;
  return parsedDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCellValue({
  value,
  column,
  showFormattedValues,
  settings,
}: {
  value: unknown;
  column?: ColumnProfile;
  showFormattedValues: boolean;
  settings: CleanframeSettings;
}): string {
  if (!showFormattedValues) return String(value ?? "");
  if (isMissingValue(value, settings.emptyValueTokens)) return "";
  const columnType = column?.type;
  if (!columnType) return String(value ?? "");

  const decimals = getGridNumberDecimalPlaces(settings);

  if (columnType === "currency") {
    const parsed = parseDisplayNumber(value, settings);
    if (parsed === null) return String(value ?? "");
    try {
      return parsed.toLocaleString(undefined, {
        style: "currency",
        currency: settings.currencyCode || "USD",
        maximumFractionDigits: decimals.currency,
      });
    } catch {
      return parsed.toLocaleString(undefined, {
        maximumFractionDigits: decimals.currency,
      });
    }
  }
  if (columnType === "percentage") {
    const parsed = parseDisplayNumber(value, settings);
    if (parsed === null) return String(value ?? "");
    if (Math.abs(parsed) <= 1) {
      return `${(parsed * 100).toLocaleString(undefined, {
        maximumFractionDigits: decimals.percentage,
      })}%`;
    }
    return `${parsed.toLocaleString(undefined, {
      maximumFractionDigits: decimals.percentage,
    })}%`;
  }
  if (columnType === "integer") return formatNumberValue(value, settings, 0);
  if (columnType === "decimal" || columnType === "number") {
    return formatNumberValue(value, settings, decimals.number);
  }
  if (columnType === "latitude" || columnType === "longitude") {
    return formatNumberValue(value, settings, decimals.coordinate);
  }
  if (columnType === "date") return formatDateValue(value, settings);
  if (columnType === "datetime") return formatDateTimeValue(value, settings);
  if (columnType === "boolean") return formatConfiguredBoolean(value, settings);
  return String(value ?? "");
}

function includesSearchValue({
  row,
  fields,
  columnProfileByName,
  searchTerm,
  showFormattedValues,
  settings,
}: {
  row: DatasetRow;
  fields: string[];
  columnProfileByName: Map<string, ColumnProfile>;
  searchTerm: string;
  showFormattedValues: boolean;
  settings: CleanframeSettings;
}) {
  if (!searchTerm) return true;
  const normalizedSearch = searchTerm.toLowerCase();
  return fields.some((field) => {
    const columnMatches = field.toLowerCase().includes(normalizedSearch);
    const rawValueMatches = String(row[field] ?? "").toLowerCase().includes(normalizedSearch);
    const formattedValueMatches = formatCellValue({ value: row[field], column: columnProfileByName.get(field), showFormattedValues, settings }).toLowerCase().includes(normalizedSearch);
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
  rowDensity,
  highlightMissing,
  highlightOutliers,
}: {
  missing: boolean;
  outlier: boolean;
  textSize: number;
  rowDensity: "compact" | "comfortable";
  highlightMissing: boolean;
  highlightOutliers: boolean;
}) {
  const textClasses = getGridTextClasses(textSize, rowDensity);
  const baseClass = cn("max-w-[320px] truncate whitespace-nowrap border-r last:border-r-0", textClasses.cell, textClasses.cellPadding);
  if (missing && highlightMissing) return cn(baseClass, "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100");
  if (outlier && highlightOutliers) return cn(baseClass, "bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100");
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

function MetricChip({ icon: Icon, label, value, intent = "default" }: { icon: ElementType; label: string; value: string; intent?: "default" | "warning" | "danger" }) {
  const valueClassName = intent === "danger" ? "text-rose-700 dark:text-rose-300" : intent === "warning" ? "text-amber-700 dark:text-amber-300" : "text-foreground";
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="!text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("!text-[13px] font-bold", valueClassName)}>{value}</span>
    </div>
  );
}

function HeaderMetrics({ profile, numericColumnCount, columnsWithMissingCount }: { profile: DatasetProfile; numericColumnCount: number; columnsWithMissingCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MetricChip icon={Rows3} label="Rows" value={formatCount(profile.rowCount)} />
      <MetricChip icon={Columns3} label="Columns" value={formatCount(profile.columnCount)} />
      <MetricChip icon={Sigma} label="Numeric" value={formatCount(numericColumnCount)} />
      <MetricChip icon={AlertTriangle} label="Missing cols" value={formatCount(columnsWithMissingCount)} intent={columnsWithMissingCount > 0 ? "warning" : "default"} />
      <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2">
        <Gauge className="size-3.5 text-muted-foreground" />
        <span className="!text-[13px] text-muted-foreground">Quality</span>
        <span className="!text-[13px] font-bold text-foreground">{profile.qualityScore}/100</span>
        <Badge variant={getQualityBadgeVariant(profile.qualityScore)} className="h-5 rounded-lg px-1.5 !text-[11px]">{getQualityLabel(profile.qualityScore)}</Badge>
      </div>
    </div>
  );
}

function LegendItem({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 !text-[13px] text-muted-foreground">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}

function CompactSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    }
    if (!open) return;
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-8 min-w-[108px] items-center justify-between gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold leading-none text-foreground shadow-sm transition hover:bg-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20">
        {value} rows
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-30 w-36 rounded-2xl border border-border bg-background p-1.5 shadow-xl">
          {PAGE_SIZE_OPTIONS.map((size) => {
            const selected = size === value;
            return (
              <button key={size} type="button" onClick={() => { onChange(size); setOpen(false); }} className={cn("flex h-8 w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 !text-[13px] font-semibold transition", selected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
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

function TextSizeControl({ value, onChange, defaultValue }: { value: number; onChange: (value: number) => void; defaultValue: number }) {
  const canDecrease = value > MIN_GRID_TEXT_SIZE;
  const canIncrease = value < MAX_GRID_TEXT_SIZE;
  return (
    <div className="inline-flex h-8 items-center rounded-xl border border-border bg-background p-1 shadow-sm">
      <button type="button" onClick={() => onChange(clampGridTextSize(value - 1))} disabled={!canDecrease} className={cn("flex h-6 min-w-8 items-center justify-center rounded-lg px-2 !text-[12px] font-bold leading-none transition", canDecrease ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "cursor-not-allowed text-muted-foreground/35")} title={`Decrease grid text size. Minimum ${MIN_GRID_TEXT_SIZE}px.`}>A-</button>
      <button type="button" onClick={() => onChange(clampGridTextSize(defaultValue))} className={cn("flex h-6 min-w-[48px] items-center justify-center rounded-lg px-2 !text-[12px] font-bold leading-none transition", value === defaultValue ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")} title={`Reset grid text size to ${defaultValue}px.`}>{value}px</button>
      <button type="button" onClick={() => onChange(clampGridTextSize(value + 1))} disabled={!canIncrease} className={cn("flex h-6 min-w-8 items-center justify-center rounded-lg px-2 !text-[13px] font-bold leading-none transition", canIncrease ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "cursor-not-allowed text-muted-foreground/35")} title={`Increase grid text size. Maximum ${MAX_GRID_TEXT_SIZE}px.`}>A+</button>
    </div>
  );
}

function FormattedValuesToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={cn("inline-flex h-8 items-center gap-2 rounded-xl border px-3 !text-[13px] font-semibold shadow-sm transition", checked ? "border-primary/30 bg-primary/10 text-foreground" : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground")} aria-pressed={checked}>
      {checked ? <Check className="size-3.5" /> : null}
      Formatted values
    </button>
  );
}

function ColumnsPopover({ fields, visibleFields, hiddenColumnNames, onToggleColumn, onShowAllColumns, onHideAllColumns }: { fields: string[]; visibleFields: string[]; hiddenColumnNames: string[]; onToggleColumn: (field: string) => void; onShowAllColumns: () => void; onHideAllColumns: () => void }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) setOpen(false);
    }
    if (!open) return;
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-8 items-center gap-2 rounded-xl border border-border bg-background px-3 !text-[13px] font-semibold text-foreground shadow-sm transition hover:bg-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20">
        <Columns3 className="size-3.5 text-muted-foreground" />
        Columns {visibleFields.length}/{fields.length}
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-30 w-[320px] rounded-2xl border border-border bg-background p-3 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="!text-[13px] font-bold text-foreground">Visible columns</p>
              <p className="mt-0.5 !text-[13px] leading-5 text-muted-foreground">Choose which columns appear in the data grid.</p>
            </div>
            <Badge variant="secondary" className="rounded-lg !text-[11px]">{visibleFields.length}/{fields.length}</Badge>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onShowAllColumns} className="h-7 rounded-lg px-2 !text-[12px]">Show all</Button>
            <Button type="button" variant="outline" onClick={onHideAllColumns} className="h-7 rounded-lg px-2 !text-[12px]">Hide all</Button>
          </div>
          <div className="mt-3 max-h-72 space-y-1 overflow-auto pr-1">
            {fields.map((field) => {
              const checked = !hiddenColumnNames.includes(field);
              return (
                <label key={field} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-muted">
                  <span className={cn("flex size-4 items-center justify-center rounded border", checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>{checked ? <Check className="size-3" /> : null}</span>
                  <input type="checkbox" checked={checked} onChange={() => onToggleColumn(field)} className="sr-only" />
                  <span className="min-w-0 truncate !text-[13px] font-medium text-foreground">{field}</span>
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
  const { settings, hydrated } = useCleanframeSettings();
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
  const [gridTextSize, setGridTextSize] = useState(12);

  useEffect(() => {
    if (!hydrated) return;
    setPageSize(Number(settings.defaultPageSize));
    setShowFormattedValues(settings.defaultValueDisplay === "formatted");
    setGridTextSize(clampGridTextSize(settings.defaultGridTextSize));
  }, [hydrated, settings.defaultPageSize, settings.defaultValueDisplay, settings.defaultGridTextSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTextSize = Number(window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY));
    if (Number.isFinite(savedTextSize)) setGridTextSize(clampGridTextSize(savedTextSize));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(gridTextSize));
  }, [gridTextSize]);

  const textClasses = getGridTextClasses(gridTextSize, settings.rowDensity);
  const columnProfileByName = useMemo(() => new Map(columns.map((column) => [column.name, column])), [columns]);
  const visibleFields = useMemo(() => fields.filter((field) => !hiddenColumnNames.includes(field)), [fields, hiddenColumnNames]);
  const numericColumnCount = useMemo(() => columns.filter((column) => NUMERIC_COLUMN_TYPES.includes(column.type)).length, [columns]);
  const columnsWithMissingCount = useMemo(() => columns.filter((column) => column.missingCount > 0).length, [columns]);

  useEffect(() => {
    setHiddenColumnNames((current) => current.filter((columnName) => fields.includes(columnName)));
  }, [fields]);

  useEffect(() => {
    setSortColumn((current) => (visibleFields.includes(current) ? current : visibleFields[0] ?? ""));
  }, [visibleFields]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, sortColumn, sortDirection, pageSize, rows, visibleFields, showFormattedValues]);

  const filteredRows = useMemo(() => rows.filter((row) => includesSearchValue({ row, fields: visibleFields, columnProfileByName, searchTerm, showFormattedValues, settings })), [rows, visibleFields, columnProfileByName, searchTerm, showFormattedValues, settings]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const rawA = a[sortColumn] ?? "";
      const rawB = b[sortColumn] ?? "";
      const column = columnProfileByName.get(sortColumn);
      const numberA = column && NUMERIC_COLUMN_TYPES.includes(column.type) ? parseSortableNumber(rawA, settings) : null;
      const numberB = column && NUMERIC_COLUMN_TYPES.includes(column.type) ? parseSortableNumber(rawB, settings) : null;
      if (numberA !== null && numberB !== null) return (numberA - numberB) * directionMultiplier;
      return String(rawA).localeCompare(String(rawB), undefined, { numeric: true, sensitivity: "base" }) * directionMultiplier;
    });
  }, [filteredRows, sortColumn, sortDirection, columnProfileByName, settings]);

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
    setHiddenColumnNames((current) => current.includes(field) ? current.filter((columnName) => columnName !== field) : [...current, field]);
  }
  function showAllColumns() { setHiddenColumnNames([]); }
  function hideAllColumns() { setHiddenColumnNames(fields); }

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="shrink-0 border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">Data</h2>
              {hiddenColumnNames.length > 0 ? <Badge variant="secondary" className="rounded-lg !text-[11px]"><EyeOff className="mr-1 size-3" />{hiddenColumnNames.length} hidden</Badge> : null}
            </div>
            <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">Search, sort, paginate, and inspect every row in the working dataset.</p>
          </div>
          <HeaderMetrics profile={workspace.profile} numericColumnCount={numericColumnCount} columnsWithMissingCount={columnsWithMissingCount} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search rows or columns" className="h-9 w-full rounded-xl border border-border bg-background pl-10 pr-3 !text-[13px] outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FormattedValuesToggle checked={showFormattedValues} onChange={setShowFormattedValues} />
            <ColumnsPopover fields={fields} visibleFields={visibleFields} hiddenColumnNames={hiddenColumnNames} onToggleColumn={toggleColumnVisibility} onShowAllColumns={showAllColumns} onHideAllColumns={hideAllColumns} />
            <TextSizeControl value={gridTextSize} onChange={setGridTextSize} defaultValue={clampGridTextSize(settings.defaultGridTextSize)} />
            <CompactSelect value={pageSize} onChange={setPageSize} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="!text-[13px] leading-5 text-muted-foreground">
            Showing <span className="font-bold text-foreground">{totalRows === 0 ? 0 : startIndex + 1}</span> – <span className="font-bold text-foreground">{Math.min(endIndex, totalRows)}</span> of <span className="font-bold text-foreground">{totalRows.toLocaleString()}</span> matching rows from <span className="font-bold text-foreground">{rows.length.toLocaleString()}</span>.
          </p>
          <div className="flex items-center gap-3">
            {settings.highlightMissingValues ? <LegendItem label="Missing" className="bg-amber-400" /> : null}
            {settings.highlightOutliers ? <LegendItem label="Outlier" className="bg-rose-400" /> : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.04]">
        {visibleFields.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm rounded-2xl border border-dashed border-border bg-background p-6 text-center">
              <Table2 className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 !text-[13px] font-bold text-foreground">All columns are hidden</h3>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">Open Columns and show at least one column to view the data grid.</p>
              <Button type="button" onClick={showAllColumns} className="mt-4 h-8 rounded-xl px-3 !text-[13px]">Show all columns</Button>
            </div>
          </div>
        ) : (
          <table className="min-w-full table-auto border-separate border-spacing-0">
            <thead className={cn(settings.stickyTableHeader && "sticky top-0 z-10", "bg-background shadow-[0_1px_0_0_hsl(var(--border))]")}> 
              <tr>
                {settings.showRowNumbers ? <th className={cn("w-[74px] border-r bg-muted/35 text-left font-bold uppercase tracking-[0.12em] text-muted-foreground", textClasses.header, textClasses.headerPadding)}>#</th> : null}
                {visibleFields.map((field) => (
                  <th key={field} className={cn("min-w-[160px] border-r bg-muted/35 text-left last:border-r-0", textClasses.headerPadding)}>
                    <button type="button" onClick={() => toggleSort(field)} className={cn("flex max-w-[260px] items-center gap-1.5 truncate font-bold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground", textClasses.header)} title={field}>
                      <span className="truncate">{field}</span><span className="shrink-0">{getSortIndicator(field)}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr><td colSpan={visibleFields.length + (settings.showRowNumbers ? 1 : 0)} className="px-4 py-10 text-center"><TriangleAlert className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 !text-[13px] font-bold text-foreground">No rows match your search.</p><p className="mt-1 !text-[13px] text-muted-foreground">Try a different keyword or show more columns.</p></td></tr>
              ) : visibleRows.map((row, rowIndex) => (
                <tr key={`${startIndex + rowIndex}-${JSON.stringify(row)}`} className="border-b transition hover:bg-muted/35">
                  {settings.showRowNumbers ? <td className={cn("border-r border-b bg-muted/20 font-mono text-muted-foreground", textClasses.rowNumber, textClasses.cellPadding)}>{(startIndex + rowIndex + 1).toLocaleString()}</td> : null}
                  {visibleFields.map((field) => {
                    const value = row[field];
                    const column = columnProfileByName.get(field);
                    const missing = isMissingValue(value, settings.emptyValueTokens);
                    const outlier = !missing && isOutlierCell(value, column);
                    const displayValue = formatCellValue({ value, column, showFormattedValues, settings });
                    return (
                      <td key={`${startIndex + rowIndex}-${field}`} title={missing ? "Missing" : displayValue} className={cn("border-b", getCellClassName({ missing, outlier, textSize: gridTextSize, rowDensity: settings.rowDensity, highlightMissing: settings.highlightMissingValues, highlightOutliers: settings.highlightOutliers }))}>
                        {missing && settings.highlightMissingValues ? <span className="inline-flex items-center gap-1.5 font-semibold"><AlertTriangle className="size-3.5" />Missing</span> : displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
        <p className="!text-[13px] text-muted-foreground">Page <span className="font-bold text-foreground">{currentPageIndex + 1}</span> of <span className="font-bold text-foreground">{totalPages.toLocaleString()}</span></p>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" onClick={() => setPageIndex(0)} disabled={currentPageIndex === 0} className="size-8 rounded-xl p-0"><ChevronsLeft className="size-4" /></Button>
          <Button type="button" variant="outline" onClick={() => setPageIndex((current) => Math.max(0, current - 1))} disabled={currentPageIndex === 0} className="size-8 rounded-xl p-0"><ChevronLeft className="size-4" /></Button>
          <Button type="button" variant="outline" onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))} disabled={currentPageIndex >= totalPages - 1} className="size-8 rounded-xl p-0"><ChevronRight className="size-4" /></Button>
          <Button type="button" variant="outline" onClick={() => setPageIndex(totalPages - 1)} disabled={currentPageIndex >= totalPages - 1} className="size-8 rounded-xl p-0"><ChevronsRight className="size-4" /></Button>
        </div>
      </div>
    </section>
  );
}
