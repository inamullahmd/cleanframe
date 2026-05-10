import { NextResponse } from "next/server";
import Papa from "papaparse";

import type { DatasetRow } from "@/types/dataset";
import type { DatasetWorkspace } from "@/types/workspace";
import type { CsvEncoding } from "@/types/settings";
import { DEFAULT_CSV_ENCODING } from "@/types/settings";
import {
  DEFAULT_CLEANFRAME_SETTINGS,
  type CleanframeSettings,
  type ColumnNameFormat,
  type DuplicateColumnStrategy,
} from "@/types/cleanframeSettings";
import { profileDataset } from "@/lib/profile/profileDataset";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ENCODINGS: CsvEncoding[] = [
  "utf-8",
  "utf-8-sig",
  "iso-8859-1",
  "windows-1252",
];

const ACRONYM_WORDS = new Set([
  "id",
  "uuid",
  "url",
  "uri",
  "json",
  "csv",
  "api",
  "ip",
  "html",
  "xml",
  "sql",
  "sku",
  "ssn",
  "dob",
]);

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

function normalizeSettings(value: FormDataEntryValue | null): CleanframeSettings {
  if (!value) return DEFAULT_CLEANFRAME_SETTINGS;

  try {
    return {
      ...DEFAULT_CLEANFRAME_SETTINGS,
      ...(JSON.parse(String(value)) as Partial<CleanframeSettings>),
    };
  } catch {
    return DEFAULT_CLEANFRAME_SETTINGS;
  }
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

async function decodeCsvText(file: File, encoding: CsvEncoding): Promise<string> {
  const buffer = await file.arrayBuffer();
  const decoderEncoding = encoding === "utf-8-sig" ? "utf-8" : encoding;
  let csvText = new TextDecoder(decoderEncoding).decode(buffer);

  if (encoding === "utf-8-sig") {
    csvText = csvText.replace(/^\uFEFF/, "");
  }

  return csvText;
}

function getDelimiter(delimiter: CleanframeSettings["delimiter"]) {
  if (delimiter === "comma") return ",";
  if (delimiter === "semicolon") return ";";
  if (delimiter === "tab") return "\t";
  if (delimiter === "pipe") return "|";
  return "";
}

function splitColumnNameIntoWords(name: string) {
  const spacedName = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");

  if (!spacedName) return ["Column"];
  return spacedName.split(" ").filter(Boolean);
}

function toTitleWord(word: string) {
  const normalized = word.toLowerCase();
  if (ACRONYM_WORDS.has(normalized)) return normalized.toUpperCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toCamelWord(word: string) {
  const normalized = word.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatColumnName(name: string, format: ColumnNameFormat) {
  const trimmedName = name.trim();
  if (format === "original") return trimmedName || "Column";

  const words = splitColumnNameIntoWords(trimmedName);

  if (format === "title_case_spaces") return words.map(toTitleWord).join(" ");
  if (format === "lowercase_spaces") return words.map((word) => word.toLowerCase()).join(" ");
  if (format === "snake_case") return words.map((word) => word.toLowerCase()).join("_");
  if (format === "camel_case") {
    const [firstWord, ...restWords] = words;
    return [(firstWord ?? "column").toLowerCase(), ...restWords.map(toCamelWord)].join("");
  }

  return trimmedName || "Column";
}

function cleanHeader(header: string, settings: CleanframeSettings) {
  let nextHeader = header.trim();

  if (settings.replaceUnderscores) {
    nextHeader = nextHeader.replace(/_/g, " ");
  }

  if (settings.removeSpecialCharacters) {
    nextHeader = nextHeader.replace(/[^\w\s-]/g, "");
  }

  if (settings.autoCleanColumnNames) {
    nextHeader = formatColumnName(nextHeader, settings.columnNameFormat);
  }

  return nextHeader.replace(/\s+/g, " ").trim() || "Column";
}

function makeUniqueColumnNames(names: string[], strategy: DuplicateColumnStrategy) {
  const seen = new Map<string, number>();

  return names.map((name) => {
    const baseName = name.trim() || "Column";
    const normalizedBaseName = baseName.toLowerCase();
    const currentCount = seen.get(normalizedBaseName) ?? 0;

    if (currentCount === 0) {
      seen.set(normalizedBaseName, 1);
      return baseName;
    }

    if (strategy === "keep_first") {
      let hiddenSuffix = currentCount + 1;
      let hiddenName = `${baseName} ${hiddenSuffix}`;
      while (seen.has(hiddenName.toLowerCase())) {
        hiddenSuffix += 1;
        hiddenName = `${baseName} ${hiddenSuffix}`;
      }
      seen.set(normalizedBaseName, hiddenSuffix);
      seen.set(hiddenName.toLowerCase(), 1);
      return hiddenName;
    }

    let suffix = currentCount + 1;
    let candidate = strategy === "make_unique" ? `${baseName} ${suffix}` : `${baseName}_${suffix}`;

    while (seen.has(candidate.toLowerCase())) {
      suffix += 1;
      candidate = strategy === "make_unique" ? `${baseName} ${suffix}` : `${baseName}_${suffix}`;
    }

    seen.set(normalizedBaseName, suffix);
    seen.set(candidate.toLowerCase(), 1);
    return candidate;
  });
}

function getEmptyTokens(settings: CleanframeSettings) {
  return new Set(
    settings.emptyValueTokens
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token && token !== "empty"),
  );
}

function normalizeCellValue(
  value: unknown,
  settings: CleanframeSettings,
  emptyTokens: Set<string>,
): string {
  if (value === null || value === undefined) return "";

  const rawValue = String(value);
  const nextValue = settings.trimCellsOnImport ? rawValue.trim() : rawValue;

  if (emptyTokens.has(nextValue.toLowerCase())) return "";
  return nextValue;
}

function parseCsv(csvText: string, settings: CleanframeSettings): ParsedCsvResult {
  const delimiter = getDelimiter(settings.delimiter);
  const emptyTokens = getEmptyTokens(settings);

  if (!settings.hasHeaderRow) {
    const result = Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      delimiter,
    });

    const maxColumnCount = Math.max(...result.data.map((row) => row.length), 0);
    const fields = Array.from({ length: maxColumnCount }, (_item, index) => `Column ${index + 1}`);
    const rows = result.data
      .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
      .map((row) => {
        const normalizedRow: DatasetRow = {};
        fields.forEach((field, index) => {
          normalizedRow[field] = normalizeCellValue(row[index], settings, emptyTokens);
        });
        return normalizedRow;
      });

    return {
      fields,
      rows,
      parseErrors: result.errors.map((error) => error.message),
    };
  }

  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    delimiter,
    transformHeader: (header) => cleanHeader(header, settings),
  });

  const rawFields = (result.meta.fields ?? []).filter(Boolean);
  const fields = makeUniqueColumnNames(rawFields, settings.duplicateColumnStrategy);
  const fieldMap = new Map(rawFields.map((field, index) => [field, fields[index] ?? field]));

  const rows: DatasetRow[] = result.data
    .filter((row) => rawFields.some((field) => String(row[field] ?? "").trim() !== ""))
    .map((row) => {
      const normalizedRow: DatasetRow = {};
      for (const rawField of rawFields) {
        const field = fieldMap.get(rawField) ?? rawField;
        normalizedRow[field] = normalizeCellValue(row[rawField], settings, emptyTokens);
      }
      return normalizedRow;
    });

  const parseErrors = result.errors.map((error) => {
    const rowLabel = typeof error.row === "number" ? `Row ${error.row + 1}: ` : "";
    return `${rowLabel}${error.message}`;
  });

  return { fields, rows, parseErrors };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const encoding = normalizeEncoding(formData.get("encoding"));
    const settings = normalizeSettings(formData.get("settings"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }

    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const csvText = await decodeCsvText(file, encoding);
    const { fields, rows, parseErrors } = parseCsv(csvText, settings);

    if (fields.length === 0) {
      return NextResponse.json({ error: "CSV must contain at least one column." }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV does not contain any data rows." }, { status: 400 });
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
      history: [],
      profile,
    };

    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to profile CSV file.",
      },
      { status: 500 },
    );
  }
}
