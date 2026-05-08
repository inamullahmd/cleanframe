"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CheckSelect,
  type CheckSelectOption,
} from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import type { DatasetRow } from "@/types/dataset";
import type { ColumnProfile } from "@/types/profile";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import { isValueOutlier } from "@/lib/profile/detectOutliers";
import { useWorkspaceStore } from "@/store/workspaceStore";

type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS: CheckSelectOption<string>[] = [10, 25, 50, 100].map(
  (size) => ({
    value: String(size),
    label: `${size} rows`,
  }),
);

function parseSortableNumber(value: unknown): number | null {
  const normalized = String(value ?? "")
    .trim()
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function includesSearchValue(
  row: DatasetRow,
  fields: string[],
  searchTerm: string,
) {
  if (!searchTerm) return true;

  const normalizedSearch = searchTerm.toLowerCase();

  return fields.some((field) => {
    const columnMatches = field.toLowerCase().includes(normalizedSearch);

    const valueMatches = String(row[field] ?? "")
      .toLowerCase()
      .includes(normalizedSearch);

    return columnMatches || valueMatches;
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
    "max-w-[320px] truncate whitespace-nowrap border-r px-3 py-2.5 last:border-r-0";

  if (missing) {
    return `${baseClass} bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100`;
  }

  if (outlier) {
    return `${baseClass} bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100`;
  }

  return `${baseClass} text-foreground`;
}

function LegendItem({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded-sm border ${className}`} />
      <span>{label}</span>
    </span>
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

  const columnProfileByName = useMemo(() => {
    return new Map(columns.map((column) => [column.name, column]));
  }, [columns]);

  useEffect(() => {
    setSortColumn((current) => {
      if (fields.includes(current)) return current;
      return fields[0] ?? "";
    });
  }, [fields]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, sortColumn, sortDirection, pageSize, rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => includesSearchValue(row, fields, searchTerm));
  }, [rows, fields, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((a, b) => {
      const rawA = a[sortColumn] ?? "";
      const rawB = b[sortColumn] ?? "";

      const numberA = parseSortableNumber(rawA);
      const numberB = parseSortableNumber(rawB);

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
  }, [filteredRows, sortColumn, sortDirection]);

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

  if (!workspace) return null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border bg-background">
      <div className="shrink-0 border-b px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/30">
              <Table2 className="size-5 text-foreground" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground">Data</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Search, sort, paginate, and inspect every row in the working
                dataset.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <InputWithLabel
              hideLabel
              label="Search rows or columns"
              value={searchTerm}
              placeholder="Search rows or columns"
              leftIcon={<Search className="size-4" />}
              wrapperClassName="min-w-[280px]"
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <CheckSelect<string>
              hideLabel
              label="Rows per page"
              value={String(pageSize)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(value) => setPageSize(Number(value))}
              className="min-w-[130px]"
              triggerClassName="h-11"
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-b px-5 py-2.5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          Showing{" "}
          <span className="font-medium text-foreground">
            {totalRows === 0 ? 0 : startIndex + 1}
          </span>
          –
          <span className="font-medium text-foreground">
            {Math.min(endIndex, totalRows)}
          </span>{" "}
          of <span className="font-medium text-foreground">{totalRows}</span>{" "}
          matching rows from{" "}
          <span className="font-medium text-foreground">{rows.length}</span>.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <LegendItem
            label="Missing value"
            className="border-amber-300 bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40"
          />

          <LegendItem
            label="Numeric outlier"
            className="border-rose-300 bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-max table-auto text-left text-sm">
          <thead className="sticky top-0 z-20 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-30 w-16 border-b border-r bg-muted px-3 py-3 text-right font-semibold">
                #
              </th>

              {fields.map((field) => (
                <th
                  key={field}
                  className="whitespace-nowrap border-b border-r px-3 py-3 font-semibold last:border-r-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(field)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <span>{field}</span>
                    <span>{getSortIndicator(field)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="px-3 py-12 text-center text-sm text-muted-foreground"
                >
                  No rows match your search.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr
                  key={`${startIndex}-${rowIndex}`}
                  className="group border-b last:border-b-0 hover:bg-muted/35"
                >
                  <td className="sticky left-0 z-10 border-r bg-background px-3 py-2.5 text-right text-xs font-medium text-muted-foreground group-hover:bg-muted/35">
                    {(startIndex + rowIndex + 1).toLocaleString()}
                  </td>

                  {fields.map((field) => {
                    const value = row[field];
                    const column = columnProfileByName.get(field);
                    const missing = isMissingValue(value);
                    const outlier = !missing && isOutlierCell(value, column);

                    return (
                      <td
                        key={field}
                        title={String(value ?? "")}
                        className={getCellClassName({ missing, outlier })}
                      >
                        {String(value ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex h-14 shrink-0 items-center justify-between border-t px-5">
        <p className="text-xs text-muted-foreground">
          Page{" "}
          <span className="font-medium text-foreground">
            {currentPageIndex + 1}
          </span>{" "}
          of <span className="font-medium text-foreground">{totalPages}</span>
        </p>

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
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
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