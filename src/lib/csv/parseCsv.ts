import Papa from "papaparse";
import type { DatasetRow } from "@/types/dataset";

export type ParsedCsv = {
  rows: DatasetRow[];
  fields: string[];
  errors: string[];
};

function normalizeHeader(header: string): string {
  return header.trim();
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value);
}

export function parseCsv(csvText: string): ParsedCsv {
  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: normalizeHeader,
  });

  const fields = result.meta.fields?.filter(Boolean) ?? [];

  const rows: DatasetRow[] = result.data
    .map((row) => {
      const normalizedRow: DatasetRow = {};

      for (const field of fields) {
        normalizedRow[field] = normalizeCell(row[field]);
      }

      return normalizedRow;
    })
    .filter((row) =>
      Object.values(row).some((value) => value.trim().length > 0),
    );

  const errors = result.errors.map((error) => {
    const rowPrefix =
      typeof error.row === "number" ? `Row ${error.row}: ` : "";

    return `${rowPrefix}${error.message}`;
  });

  return {
    rows,
    fields,
    errors,
  };
}