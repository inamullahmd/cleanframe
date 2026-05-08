import { NextResponse } from "next/server";
import Papa from "papaparse";
import type { DatasetRow } from "@/types/dataset";
import type { DatasetWorkspace } from "@/types/workspace";
import type { CsvEncoding } from "@/types/settings";
import { DEFAULT_CSV_ENCODING } from "@/types/settings";
import { profileDataset } from "@/lib/profile/profileDataset";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_ENCODINGS: CsvEncoding[] = [
  "utf-8",
  "utf-8-sig",
  "iso-8859-1",
  "windows-1252",
];

type ParsedCsvResult = {
  fields: string[];
  rows: DatasetRow[];
  parseErrors: string[];
};

function normalizeEncoding(value: FormDataEntryValue | null): CsvEncoding {
  const encoding = String(value ?? DEFAULT_CSV_ENCODING);

  if (ALLOWED_ENCODINGS.includes(encoding as CsvEncoding)) {
    return encoding as CsvEncoding;
  }

  return DEFAULT_CSV_ENCODING;
}

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Only .csv files are supported.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File is too large. Maximum size is 10MB.";
  }

  return null;
}

async function decodeCsvText(
  file: File,
  encoding: CsvEncoding,
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const decoderEncoding = encoding === "utf-8-sig" ? "utf-8" : encoding;

  let csvText = new TextDecoder(decoderEncoding).decode(buffer);

  if (encoding === "utf-8-sig") {
    csvText = csvText.replace(/^\uFEFF/, "");
  }

  return csvText;
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  return String(value);
}

function parseCsv(csvText: string): ParsedCsvResult {
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

  const parseErrors = result.errors.map((error) => {
    const rowLabel =
      typeof error.row === "number" ? `Row ${error.row + 1}: ` : "";

    return `${rowLabel}${error.message}`;
  });

  return {
    fields,
    rows,
    parseErrors,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const encoding = normalizeEncoding(formData.get("encoding"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "CSV file is required." },
        { status: 400 },
      );
    }

    const validationError = validateFile(file);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const csvText = await decodeCsvText(file, encoding);
    const { fields, rows, parseErrors } = parseCsv(csvText);

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "CSV must contain a header row." },
        { status: 400 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV does not contain any data rows." },
        { status: 400 },
      );
    }

    const profile = profileDataset(rows, fields, {
      fileName: file.name,
      fileSizeBytes: file.size,
      parseErrors,
    });

    const workspace: DatasetWorkspace = {
      file: {
        name: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      },
      fields,
      rawRows: rows,
      workingRows: rows,
      cleaningSteps: [],
      profile,
    };

    return NextResponse.json({
      workspace,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to profile CSV file.",
      },
      { status: 500 },
    );
  }
}