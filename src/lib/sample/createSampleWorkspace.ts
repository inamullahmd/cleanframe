import Papa from "papaparse";
import type { DatasetRow } from "@/types/dataset";
import type { DatasetWorkspace } from "@/types/workspace";
import type { OutlierConfig } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import { profileDataset } from "@/lib/profile/profileDataset";

const SAMPLE_DATASET_URL = "/datasets/AB_NYC_2019.csv";
const SAMPLE_DATASET_NAME = "AB_NYC_2019.csv";

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value);
}

function getParseErrors(errors: Papa.ParseError[]): string[] {
  return errors.map((error) => {
    const rowLabel =
      typeof error.row === "number" ? `Row ${error.row + 1}: ` : "";

    return `${rowLabel}${error.message}`;
  });
}

export async function createSampleWorkspace(
  outlierConfig: OutlierConfig = DEFAULT_OUTLIER_CONFIG,
): Promise<DatasetWorkspace> {
  const response = await fetch(SAMPLE_DATASET_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not load sample CSV from ${SAMPLE_DATASET_URL}. Make sure the file exists at public/datasets/AB_NYC_2019.csv.`,
    );
  }

  const csvText = await response.text();

  if (!csvText.trim()) {
    throw new Error("Sample CSV file is empty.");
  }

  if (csvText.trimStart().startsWith("<!DOCTYPE html")) {
    throw new Error(
      `Sample CSV URL returned an HTML page instead of CSV. Check that public/datasets/AB_NYC_2019.csv exists.`,
    );
  }

  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });

  const fields = (result.meta.fields ?? [])
    .map((field) => field.trim())
    .filter(Boolean);

  const rows: DatasetRow[] = result.data
    .filter((row) => {
      return fields.some((field) => {
        const value = row[field];

        return value !== null && value !== undefined && String(value) !== "";
      });
    })
    .map((row) => {
      const normalizedRow: DatasetRow = {};

      for (const field of fields) {
        normalizedRow[field] = normalizeCellValue(row[field]);
      }

      return normalizedRow;
    });

  if (fields.length === 0) {
    throw new Error("Sample dataset must contain a header row.");
  }

  if (rows.length === 0) {
    throw new Error("Sample dataset does not contain any data rows.");
  }

  const fileSizeBytes = new TextEncoder().encode(csvText).length;
  const parseErrors = getParseErrors(result.errors);

  const profile = profileDataset(rows, fields, {
    fileName: SAMPLE_DATASET_NAME,
    fileSizeBytes,
    parseErrors,
    outlierConfig,
  });

  return {
    file: {
      name: SAMPLE_DATASET_NAME,
      sizeBytes: fileSizeBytes,
      uploadedAt: new Date().toISOString(),
    },
    fields,
    rawRows: rows,
    workingRows: rows,
    cleaningSteps: [],
    profile,
  };
}