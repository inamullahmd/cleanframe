import { create } from "zustand";

import type { ColumnType, DatasetRow } from "@/types/dataset";
import type { DatasetWorkspace } from "@/types/workspace";
import type {
  CleaningStep,
  MissingValueStrategy,
} from "@/types/cleaning";
import type {
  WorkspaceHistoryAction,
  WorkspaceHistoryEntry,
  WorkspaceHistorySnapshot,
} from "@/types/history";
import type { OutlierConfig } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";
import { DEFAULT_CSV_ENCODING } from "@/types/settings";
import { profileDataset } from "@/lib/profile/profileDataset";
import { isMissingValue } from "@/lib/profile/detectMissingValues";

export type WorkspacePanel =
  | "schema"
  | "data"
  | "clean"
  | "history"
  | "charts";

export type ColumnNameTransform =
  | "title_case_spaces"
  | "replace_underscores"
  | "lowercase_spaces"
  | "uppercase"
  | "snake_case"
  | "camel_case"
  | "trim";

export type AddColumnSourceMode = "custom_value" | "from_columns";

type WorkspaceStatus = "idle" | "loading" | "ready" | "error";

type ApplyMissingValueFixOptions = {
  columnName: string;
  strategy: MissingValueStrategy;
  customValue?: string;
};

type AddColumnOptions = {
  columnName: string;
  columnType: ColumnType;
  defaultValue?: string;
  sourceMode?: AddColumnSourceMode;
  sourceColumns?: string[];
  expression?: string;
};

type WorkspaceState = {
  workspace: DatasetWorkspace | null;
  status: WorkspaceStatus;
  error: string | null;
  activePanel: WorkspacePanel;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;

  setWorkspace: (workspace: DatasetWorkspace) => void;
  hydrateWorkspaceFromSession: () => void;
  setLoading: () => void;
  setError: (error: string) => void;
  resetWorkspace: () => void;
  setActivePanel: (panel: WorkspacePanel) => void;

  updateOutlierConfig: (nextConfig: Partial<OutlierConfig>) => void;
  updateCsvEncoding: (encoding: CsvEncoding) => void;
  resetSettings: () => void;

  renameColumn: (oldName: string, newName: string) => void;
  transformColumnNames: (transform: ColumnNameTransform) => void;
  addColumn: (options: AddColumnOptions) => void;
  deleteColumn: (columnName: string) => void;
  updateColumnType: (columnName: string, nextType: ColumnType) => void;

  applyMissingValueFix: (options: ApplyMissingValueFixOptions) => void;
  resetCleaning: () => void;

  revertToHistoryPoint: (historyId: string) => void;
};

const SESSION_STORAGE_KEY = "cleanframe-workspace";
const MAX_SESSION_WORKSPACE_BYTES = 2 * 1024 * 1024;

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

const BLOCKED_EXPRESSION_TOKENS = [
  "window",
  "document",
  "globalThis",
  "constructor",
  "prototype",
  "__proto__",
  "function",
  "Function",
  "eval",
  "import",
  "require",
  "fetch",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "process",
  "while",
  "for",
  "class",
  "=>",
];

function getApproxByteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeWorkspaceStructure(
  workspace: DatasetWorkspace,
): DatasetWorkspace {
  return {
    ...workspace,
    workingRows: workspace.workingRows ?? workspace.rawRows,
    cleaningSteps: workspace.cleaningSteps ?? [],
    history: workspace.history ?? [],
  };
}

function persistWorkspace(workspace: DatasetWorkspace): boolean {
  if (typeof window === "undefined") return false;

  try {
    const serializedWorkspace = JSON.stringify(workspace);
    const sizeBytes = getApproxByteSize(serializedWorkspace);

    if (sizeBytes > MAX_SESSION_WORKSPACE_BYTES) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }

    sessionStorage.setItem(SESSION_STORAGE_KEY, serializedWorkspace);
    return true;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return false;
  }
}

function createWorkspaceSnapshot({
  workspace,
  outlierConfig,
  csvEncoding,
}: {
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
}): WorkspaceHistorySnapshot {
  return {
    fields: workspace.fields,
    rawRows: workspace.rawRows,
    workingRows: workspace.workingRows,
    cleaningSteps: workspace.cleaningSteps,
    profile: workspace.profile,
    outlierConfig,
    csvEncoding,
  };
}

function createHistoryEntry({
  workspace,
  outlierConfig,
  csvEncoding,
  action,
  label,
  description,
}: {
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
  action: WorkspaceHistoryAction;
  label: string;
  description: string;
}): WorkspaceHistoryEntry {
  return {
    id: createId(),
    action,
    label,
    description,
    createdAt: new Date().toISOString(),
    rowCount: workspace.profile.rowCount,
    columnCount: workspace.profile.columnCount,
    qualityScore: workspace.profile.qualityScore,
    snapshot: createWorkspaceSnapshot({
      workspace,
      outlierConfig,
      csvEncoding,
    }),
  };
}

function appendHistory({
  workspace,
  outlierConfig,
  csvEncoding,
  action,
  label,
  description,
}: {
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
  action: WorkspaceHistoryAction;
  label: string;
  description: string;
}): DatasetWorkspace {
  const historyEntry = createHistoryEntry({
    workspace,
    outlierConfig,
    csvEncoding,
    action,
    label,
    description,
  });

  return {
    ...workspace,
    history: [...workspace.history, historyEntry],
  };
}

function ensureWorkspaceHasInitialHistory({
  workspace,
  outlierConfig,
  csvEncoding,
}: {
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
}): DatasetWorkspace {
  if (workspace.history.length > 0) return workspace;

  return appendHistory({
    workspace,
    outlierConfig,
    csvEncoding,
    action: "dataset_loaded",
    label: "Loaded dataset",
    description: `Loaded ${workspace.file.name}.`,
  });
}

function splitColumnNameIntoWords(name: string): string[] {
  const spacedName = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");

  if (!spacedName) return ["Column"];

  return spacedName.split(" ").filter(Boolean);
}

function toTitleWord(word: string): string {
  const normalized = word.toLowerCase();

  if (ACRONYM_WORDS.has(normalized)) {
    return normalized.toUpperCase();
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toCamelWord(word: string): string {
  const normalized = word.toLowerCase();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function transformColumnName(
  name: string,
  transform: ColumnNameTransform,
): string {
  const trimmedName = name.trim();

  if (transform === "trim") {
    return trimmedName || "Column";
  }

  if (transform === "replace_underscores") {
    return (
      trimmedName.replace(/_/g, " ").replace(/\s+/g, " ").trim() || "Column"
    );
  }

  const words = splitColumnNameIntoWords(trimmedName);

  if (transform === "title_case_spaces") {
    return words.map(toTitleWord).join(" ");
  }

  if (transform === "lowercase_spaces") {
    return words.map((word) => word.toLowerCase()).join(" ");
  }

  if (transform === "uppercase") {
    return words.join(" ").toUpperCase();
  }

  if (transform === "snake_case") {
    return words.map((word) => word.toLowerCase()).join("_");
  }

  if (transform === "camel_case") {
    const [firstWord, ...restWords] = words;

    return [
      (firstWord ?? "column").toLowerCase(),
      ...restWords.map(toCamelWord),
    ].join("");
  }

  return trimmedName || "Column";
}

function formatColumnNameTransformLabel(transform: ColumnNameTransform): string {
  const labels: Record<ColumnNameTransform, string> = {
    title_case_spaces: "Title Case + Spaces",
    replace_underscores: "Replace Underscores",
    lowercase_spaces: "Lowercase + Spaces",
    uppercase: "Uppercase",
    snake_case: "Snake Case",
    camel_case: "Camel Case",
    trim: "Trim Whitespace",
  };

  return labels[transform];
}

function makeUniqueColumnNames(names: string[]): string[] {
  const seen = new Map<string, number>();

  return names.map((name) => {
    const baseName = name.trim() || "Column";
    const normalizedBaseName = baseName.toLowerCase();
    const currentCount = seen.get(normalizedBaseName) ?? 0;

    if (currentCount === 0) {
      seen.set(normalizedBaseName, 1);
      return baseName;
    }

    let suffix = currentCount + 1;
    let candidate = `${baseName} ${suffix}`;
    let normalizedCandidate = candidate.toLowerCase();

    while (seen.has(normalizedCandidate)) {
      suffix += 1;
      candidate = `${baseName} ${suffix}`;
      normalizedCandidate = candidate.toLowerCase();
    }

    seen.set(normalizedBaseName, suffix);
    seen.set(normalizedCandidate, 1);

    return candidate;
  });
}

function renameRowKey(
  row: DatasetRow,
  fields: string[],
  oldName: string,
  newName: string,
): DatasetRow {
  const renamedRow: DatasetRow = {};

  for (const field of fields) {
    const nextFieldName = field === oldName ? newName : field;
    renamedRow[nextFieldName] = row[field] ?? "";
  }

  return renamedRow;
}

function renameRowKeysUsingMap(
  row: DatasetRow,
  fields: string[],
  nameMap: Map<string, string>,
): DatasetRow {
  const renamedRow: DatasetRow = {};

  for (const field of fields) {
    const nextFieldName = nameMap.get(field) ?? field;
    renamedRow[nextFieldName] = row[field] ?? "";
  }

  return renamedRow;
}

function createTypeOverrides(
  workspace: DatasetWorkspace,
): Partial<Record<string, ColumnType>> {
  return Object.fromEntries(
    workspace.profile.columns.map((column) => [column.name, column.type]),
  );
}

function rebuildWorkspaceProfile({
  workspace,
  outlierConfig,
  columnTypeOverrides,
}: {
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  columnTypeOverrides?: Partial<Record<string, ColumnType>>;
}): DatasetWorkspace {
  const normalizedWorkspace = normalizeWorkspaceStructure(workspace);

  const profile = profileDataset(
    normalizedWorkspace.workingRows,
    normalizedWorkspace.fields,
    {
      fileName: normalizedWorkspace.file.name,
      fileSizeBytes: normalizedWorkspace.file.sizeBytes,
      parseErrors: normalizedWorkspace.profile.parseErrors,
      outlierConfig,
      columnTypeOverrides:
        columnTypeOverrides ?? createTypeOverrides(normalizedWorkspace),
    },
  );

  return {
    ...normalizedWorkspace,
    profile,
  };
}

function stringifyExpressionResult(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeFormulaExpression(expression: string): string {
  const trimmedExpression = expression.trim();

  if (trimmedExpression.startsWith("=")) {
    return trimmedExpression.slice(1).trim();
  }

  return trimmedExpression;
}

function isExpressionSafe(expression: string): boolean {
  const lowerExpression = expression.toLowerCase();

  return !BLOCKED_EXPRESSION_TOKENS.some((token) =>
    lowerExpression.includes(token.toLowerCase()),
  );
}

function parseFormulaNumber(value: unknown): number {
  if (isMissingValue(value)) return 0;

  const normalized = String(value)
    .trim()
    .replaceAll(",", "")
    .replace("%", "")
    .replace(/^[^\d.-]+/, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function titleCaseValue(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFormulaColumnReferences(expression: string): string[] {
  const references = new Set<string>();
  const regex = /\{([^}]+)\}/g;

  let match = regex.exec(expression);

  while (match) {
    const columnName = match[1]?.trim();

    if (columnName) {
      references.add(columnName);
    }

    match = regex.exec(expression);
  }

  return [...references];
}

function evaluateColumnExpression({
  row,
  fields,
  expression,
}: {
  row: DatasetRow;
  fields: string[];
  expression: string;
}): string {
  const normalizedExpression = normalizeFormulaExpression(expression);

  if (!normalizedExpression || !isExpressionSafe(normalizedExpression)) {
    return "";
  }

  const referencedColumns = getFormulaColumnReferences(normalizedExpression);

  const hasInvalidReference = referencedColumns.some(
    (columnName) => !fields.includes(columnName),
  );

  if (hasInvalidReference) {
    return "";
  }

  const jsExpression = normalizedExpression.replace(
    /\{([^}]+)\}/g,
    (_match, columnName: string) => {
      return `value(${JSON.stringify(columnName.trim())})`;
    },
  );

  const value = (columnName: string) => row[columnName] ?? "";

  const helpers = {
    value,
    text: (input: unknown) => String(input ?? ""),
    number: parseFormulaNumber,
    concat: (...parts: unknown[]) =>
      parts.map((part) => String(part ?? "")).join(""),
    upper: (input: unknown) => String(input ?? "").toUpperCase(),
    lower: (input: unknown) => String(input ?? "").toLowerCase(),
    trim: (input: unknown) => String(input ?? "").trim(),
    title: titleCaseValue,
    abs: (input: unknown) => Math.abs(parseFormulaNumber(input)),
    round: (input: unknown, digits = 0) => {
      const numericValue = parseFormulaNumber(input);
      const precision = Number.isFinite(Number(digits)) ? Number(digits) : 0;
      const multiplier = 10 ** precision;

      return Math.round(numericValue * multiplier) / multiplier;
    },
    min: (...values: unknown[]) => Math.min(...values.map(parseFormulaNumber)),
    max: (...values: unknown[]) => Math.max(...values.map(parseFormulaNumber)),
    coalesce: (...values: unknown[]) =>
      values.find((item) => !isMissingValue(item)) ?? "",
  };

  try {
    const evaluator = new Function(
      "helpers",
      `
        "use strict";

        const {
          value,
          text,
          number,
          concat,
          upper,
          lower,
          trim,
          title,
          abs,
          round,
          min,
          max,
          coalesce
        } = helpers;

        return (${jsExpression});
      `,
    );

    return stringifyExpressionResult(evaluator(helpers));
  } catch {
    return "";
  }
}

function getAddedColumnValue({
  row,
  fields,
  sourceMode,
  sourceColumns,
  expression,
  defaultValue,
}: {
  row: DatasetRow;
  fields: string[];
  sourceMode: AddColumnSourceMode;
  sourceColumns: string[];
  expression: string;
  defaultValue: string;
}): string {
  if (sourceMode === "custom_value") {
    return defaultValue;
  }

  const validSourceColumns = sourceColumns.filter((columnName) =>
    fields.includes(columnName),
  );

  if (validSourceColumns.length === 0) {
    return "";
  }

  const normalizedExpression = normalizeFormulaExpression(expression);

  if (normalizedExpression) {
    return evaluateColumnExpression({
      row,
      fields,
      expression: normalizedExpression,
    });
  }

  if (validSourceColumns.length === 1) {
    return String(row[validSourceColumns[0]] ?? "");
  }

  return validSourceColumns
    .map((columnName) => String(row[columnName] ?? ""))
    .join(" ");
}

function getColumnReplacementValue({
  rowIndex,
  rows,
  columnName,
  strategy,
  customValue,
  workspace,
}: {
  rowIndex: number;
  rows: DatasetRow[];
  columnName: string;
  strategy: MissingValueStrategy;
  customValue?: string;
  workspace: DatasetWorkspace;
}): string {
  const column = workspace.profile.columns.find(
    (item) => item.name === columnName,
  );

  if (strategy === "fill_custom") return customValue ?? "";
  if (strategy === "fill_unknown") return "Unknown";
  if (strategy === "fill_zero") return "0";

  if (strategy === "fill_mean") {
    return String(column?.numericSummary?.mean ?? "");
  }

  if (strategy === "fill_median") {
    return String(column?.numericSummary?.median ?? "");
  }

  if (strategy === "fill_min") {
    return String(column?.numericSummary?.min ?? "");
  }

  if (strategy === "fill_max") {
    return String(column?.numericSummary?.max ?? "");
  }

  if (strategy === "fill_mode") {
    return column?.topValues[0]?.value ?? "";
  }

  if (strategy === "fill_previous") {
    for (let index = rowIndex - 1; index >= 0; index -= 1) {
      const value = rows[index]?.[columnName];

      if (!isMissingValue(value)) {
        return String(value);
      }
    }

    return "";
  }

  if (strategy === "fill_next") {
    for (let index = rowIndex + 1; index < rows.length; index += 1) {
      const value = rows[index]?.[columnName];

      if (!isMissingValue(value)) {
        return String(value);
      }
    }

    return "";
  }

  return "";
}

function createCleaningStep({
  columnName,
  strategy,
  customValue,
  affectedRows,
}: {
  columnName: string;
  strategy: MissingValueStrategy;
  customValue?: string;
  affectedRows: number;
}): CleaningStep {
  return {
    id: createId(),
    type: "missing_values",
    columnName,
    strategy,
    customValue,
    affectedRows,
    createdAt: new Date().toISOString(),
  };
}

function restoreWorkspaceFromSnapshot({
  currentWorkspace,
  snapshot,
}: {
  currentWorkspace: DatasetWorkspace;
  snapshot: WorkspaceHistorySnapshot;
}): DatasetWorkspace {
  return {
    ...currentWorkspace,
    fields: snapshot.fields,
    rawRows: snapshot.rawRows,
    workingRows: snapshot.workingRows,
    cleaningSteps: snapshot.cleaningSteps,
    profile: snapshot.profile,
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  status: "idle",
  error: null,
  activePanel: "schema",
  outlierConfig: DEFAULT_OUTLIER_CONFIG,
  csvEncoding: DEFAULT_CSV_ENCODING,

  setWorkspace: (workspace) => {
    const normalizedWorkspace = ensureWorkspaceHasInitialHistory({
      workspace: normalizeWorkspaceStructure(workspace),
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
    });

    persistWorkspace(normalizedWorkspace);

    set({
      workspace: normalizedWorkspace,
      status: "ready",
      error: null,
      activePanel: "schema",
    });
  },

  hydrateWorkspaceFromSession: () => {
    if (typeof window === "undefined") return;

    const storedWorkspace = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedWorkspace) return;

    try {
      const workspace = ensureWorkspaceHasInitialHistory({
        workspace: normalizeWorkspaceStructure(
          JSON.parse(storedWorkspace) as DatasetWorkspace,
        ),
        outlierConfig: get().outlierConfig,
        csvEncoding: get().csvEncoding,
      });

      set({
        workspace,
        status: "ready",
        error: null,
      });
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },

  setLoading: () =>
    set({
      status: "loading",
      error: null,
    }),

  setError: (error) =>
    set({
      status: "error",
      error,
    }),

  resetWorkspace: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    set({
      workspace: null,
      status: "idle",
      error: null,
      activePanel: "schema",
      outlierConfig: DEFAULT_OUTLIER_CONFIG,
      csvEncoding: DEFAULT_CSV_ENCODING,
    });
  },

  setActivePanel: (panel) =>
    set({
      activePanel: panel,
    }),

  updateOutlierConfig: (nextConfig) => {
    const current = get().workspace;

    const outlierConfig: OutlierConfig = {
      ...get().outlierConfig,
      ...nextConfig,
    };

    if (!current) {
      set({ outlierConfig });
      return;
    }

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: current,
      outlierConfig,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "settings_changed",
      label: "Updated outlier settings",
      description: "Changed workspace outlier detection settings.",
    });

    persistWorkspace(nextWorkspace);

    set({
      outlierConfig,
      workspace: nextWorkspace,
    });
  },

  updateCsvEncoding: (encoding) =>
    set({
      csvEncoding: encoding,
    }),

  resetSettings: () => {
    const current = get().workspace;

    if (!current) {
      set({
        outlierConfig: DEFAULT_OUTLIER_CONFIG,
        csvEncoding: DEFAULT_CSV_ENCODING,
      });

      return;
    }

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: current,
      outlierConfig: DEFAULT_OUTLIER_CONFIG,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: DEFAULT_OUTLIER_CONFIG,
      csvEncoding: DEFAULT_CSV_ENCODING,
      action: "settings_changed",
      label: "Reset settings",
      description: "Restored default CSV and outlier settings.",
    });

    persistWorkspace(nextWorkspace);

    set({
      outlierConfig: DEFAULT_OUTLIER_CONFIG,
      csvEncoding: DEFAULT_CSV_ENCODING,
      workspace: nextWorkspace,
    });
  },

  renameColumn: (oldName, newName) => {
    const trimmedName = newName.trim();
    const current = get().workspace;

    if (!current || !trimmedName || oldName === trimmedName) return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);

    const duplicateExists = normalizedCurrent.fields.some(
      (field) =>
        field !== oldName && field.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicateExists) return;

    const previousFields = normalizedCurrent.fields;

    const nextFields = previousFields.map((field) =>
      field === oldName ? trimmedName : field,
    );

    const nextRawRows = normalizedCurrent.rawRows.map((row) =>
      renameRowKey(row, previousFields, oldName, trimmedName),
    );

    const nextWorkingRows = normalizedCurrent.workingRows.map((row) =>
      renameRowKey(row, previousFields, oldName, trimmedName),
    );

    const previousOverrides = createTypeOverrides(normalizedCurrent);
    const nextOverrides: Partial<Record<string, ColumnType>> = {};

    for (const [field, type] of Object.entries(previousOverrides)) {
      nextOverrides[field === oldName ? trimmedName : field] = type;
    }

    const renamedWorkspace: DatasetWorkspace = {
      ...normalizedCurrent,
      fields: nextFields,
      rawRows: nextRawRows,
      workingRows: nextWorkingRows,
      profile: {
        ...normalizedCurrent.profile,
        columns: normalizedCurrent.profile.columns.map((column) =>
          column.name === oldName ? { ...column, name: trimmedName } : column,
        ),
        previewRows: nextWorkingRows.slice(0, 25),
      },
      cleaningSteps: normalizedCurrent.cleaningSteps.map((step) =>
        step.columnName === oldName
          ? { ...step, columnName: trimmedName }
          : step,
      ),
    };

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: renamedWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: nextOverrides,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "column_renamed",
      label: "Renamed column",
      description: `Renamed "${oldName}" to "${trimmedName}".`,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
    });
  },

  transformColumnNames: (transform) => {
    const current = get().workspace;

    if (!current) return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);
    const previousFields = normalizedCurrent.fields;

    const transformedFields = previousFields.map((field) =>
      transformColumnName(field, transform),
    );

    const nextFields = makeUniqueColumnNames(transformedFields);

    const changed = previousFields.some(
      (field, index) => field !== nextFields[index],
    );

    if (!changed) return;

    const nameMap = new Map<string, string>();

    previousFields.forEach((field, index) => {
      nameMap.set(field, nextFields[index] ?? field);
    });

    const nextRawRows = normalizedCurrent.rawRows.map((row) =>
      renameRowKeysUsingMap(row, previousFields, nameMap),
    );

    const nextWorkingRows = normalizedCurrent.workingRows.map((row) =>
      renameRowKeysUsingMap(row, previousFields, nameMap),
    );

    const previousOverrides = createTypeOverrides(normalizedCurrent);
    const nextOverrides: Partial<Record<string, ColumnType>> = {};

    for (const [field, type] of Object.entries(previousOverrides)) {
      nextOverrides[nameMap.get(field) ?? field] = type;
    }

    const renamedWorkspace: DatasetWorkspace = {
      ...normalizedCurrent,
      fields: nextFields,
      rawRows: nextRawRows,
      workingRows: nextWorkingRows,
      profile: {
        ...normalizedCurrent.profile,
        columns: normalizedCurrent.profile.columns.map((column) => ({
          ...column,
          name: nameMap.get(column.name) ?? column.name,
        })),
        previewRows: nextWorkingRows.slice(0, 25),
      },
      cleaningSteps: normalizedCurrent.cleaningSteps.map((step) => ({
        ...step,
        columnName: nameMap.get(step.columnName) ?? step.columnName,
      })),
    };

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: renamedWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: nextOverrides,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "column_names_transformed",
      label: "Formatted column names",
      description: `Applied ${formatColumnNameTransformLabel(
        transform,
      )} to all column names.`,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
      activePanel: "schema",
    });
  },

  addColumn: ({
    columnName,
    columnType,
    defaultValue = "",
    sourceMode = "custom_value",
    sourceColumns = [],
    expression = "",
  }) => {
    const current = get().workspace;
    const trimmedName = columnName.trim();

    if (!current || !trimmedName) return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);

    const duplicateExists = normalizedCurrent.fields.some(
      (field) => field.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicateExists) return;

    const safeSourceMode: AddColumnSourceMode =
      sourceMode === "from_columns" ? "from_columns" : "custom_value";

    const validSourceColumns = sourceColumns.filter((columnName) =>
      normalizedCurrent.fields.includes(columnName),
    );

    if (safeSourceMode === "from_columns" && validSourceColumns.length === 0) {
      return;
    }

    const nextFields = [...normalizedCurrent.fields, trimmedName];

    const nextRawRows = normalizedCurrent.rawRows.map((row) => ({
      ...row,
      [trimmedName]: getAddedColumnValue({
        row,
        fields: normalizedCurrent.fields,
        sourceMode: safeSourceMode,
        sourceColumns: validSourceColumns,
        expression,
        defaultValue,
      }),
    }));

    const nextWorkingRows = normalizedCurrent.workingRows.map((row) => ({
      ...row,
      [trimmedName]: getAddedColumnValue({
        row,
        fields: normalizedCurrent.fields,
        sourceMode: safeSourceMode,
        sourceColumns: validSourceColumns,
        expression,
        defaultValue,
      }),
    }));

    const nextOverrides: Partial<Record<string, ColumnType>> = {
      ...createTypeOverrides(normalizedCurrent),
      [trimmedName]: columnType,
    };

    const dirtyWorkspace: DatasetWorkspace = {
      ...normalizedCurrent,
      fields: nextFields,
      rawRows: nextRawRows,
      workingRows: nextWorkingRows,
      profile: {
        ...normalizedCurrent.profile,
        previewRows: nextWorkingRows.slice(0, 25),
      },
    };

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: dirtyWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: nextOverrides,
    });

    const description =
      safeSourceMode === "from_columns"
        ? `Added "${trimmedName}" as ${columnType} from ${validSourceColumns
            .map((columnName) => `"${columnName}"`)
            .join(", ")}.`
        : `Added "${trimmedName}" as ${columnType}.`;

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "column_added",
      label: "Added column",
      description,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
      activePanel: "schema",
    });
  },

  deleteColumn: (columnName) => {
  const current = get().workspace;

  if (!current) return;

  const normalizedCurrent = normalizeWorkspaceStructure(current);

  if (!normalizedCurrent.fields.includes(columnName)) return;
  if (normalizedCurrent.fields.length <= 1) return;

  const nextFields = normalizedCurrent.fields.filter(
    (field) => field !== columnName,
  );

  function removeColumnFromRow(row: DatasetRow): DatasetRow {
    const nextRow: DatasetRow = {};

    for (const field of nextFields) {
      nextRow[field] = row[field] ?? "";
    }

    return nextRow;
  }

  const nextRawRows = normalizedCurrent.rawRows.map(removeColumnFromRow);
  const nextWorkingRows = normalizedCurrent.workingRows.map(removeColumnFromRow);

  const nextOverrides = createTypeOverrides(normalizedCurrent);
  delete nextOverrides[columnName];

  const dirtyWorkspace: DatasetWorkspace = {
    ...normalizedCurrent,
    fields: nextFields,
    rawRows: nextRawRows,
    workingRows: nextWorkingRows,
    cleaningSteps: normalizedCurrent.cleaningSteps.filter(
      (step) => step.columnName !== columnName,
    ),
    profile: {
      ...normalizedCurrent.profile,
      previewRows: nextWorkingRows.slice(0, 25),
    },
  };

  const rebuiltWorkspace = rebuildWorkspaceProfile({
    workspace: dirtyWorkspace,
    outlierConfig: get().outlierConfig,
    columnTypeOverrides: nextOverrides,
  });

  const nextWorkspace = appendHistory({
    workspace: rebuiltWorkspace,
    outlierConfig: get().outlierConfig,
    csvEncoding: get().csvEncoding,
    action: "column_deleted",
    label: "Deleted column",
    description: `Deleted "${columnName}" from the workspace.`,
  });

  persistWorkspace(nextWorkspace);

  set({
    workspace: nextWorkspace,
    activePanel: "schema",
  });
},

  updateColumnType: (columnName, nextType) => {
    const current = get().workspace;

    if (!current) return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);

    const previousType =
      normalizedCurrent.profile.columns.find(
        (column) => column.name === columnName,
      )?.type ?? "unknown";

    if (previousType === nextType) return;

    const overrides: Partial<Record<string, ColumnType>> = {
      ...createTypeOverrides(normalizedCurrent),
      [columnName]: nextType,
    };

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: normalizedCurrent,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: overrides,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "column_type_changed",
      label: "Changed column type",
      description: `Changed "${columnName}" from ${previousType} to ${nextType}.`,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
    });
  },

  applyMissingValueFix: ({ columnName, strategy, customValue }) => {
    const current = get().workspace;

    if (!current) return;
    if (strategy === "leave") return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);
    const rows = normalizedCurrent.workingRows;

    const affectedRows = rows.filter((row) =>
      isMissingValue(row[columnName]),
    ).length;

    if (affectedRows === 0) return;

    const typeOverrides = createTypeOverrides(normalizedCurrent);

    let nextWorkingRows: DatasetRow[];

    if (strategy === "drop_rows") {
      nextWorkingRows = rows.filter(
        (row) => !isMissingValue(row[columnName]),
      );
    } else {
      nextWorkingRows = rows.map((row, rowIndex) => {
        if (!isMissingValue(row[columnName])) return row;

        return {
          ...row,
          [columnName]: getColumnReplacementValue({
            rowIndex,
            rows,
            columnName,
            strategy,
            customValue,
            workspace: normalizedCurrent,
          }),
        };
      });
    }

    const cleaningStep = createCleaningStep({
      columnName,
      strategy,
      customValue,
      affectedRows,
    });

    const dirtyWorkspace: DatasetWorkspace = {
      ...normalizedCurrent,
      workingRows: nextWorkingRows,
      cleaningSteps: [...normalizedCurrent.cleaningSteps, cleaningStep],
    };

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: dirtyWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: typeOverrides,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "missing_values_fixed",
      label: "Fixed missing values",
      description: `Applied ${strategy} to "${columnName}" and affected ${affectedRows.toLocaleString()} rows.`,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
      activePanel: "clean",
    });
  },

  resetCleaning: () => {
    const current = get().workspace;

    if (!current) return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);
    const typeOverrides = createTypeOverrides(normalizedCurrent);

    const dirtyWorkspace: DatasetWorkspace = {
      ...normalizedCurrent,
      workingRows: normalizedCurrent.rawRows,
      cleaningSteps: [],
    };

    const rebuiltWorkspace = rebuildWorkspaceProfile({
      workspace: dirtyWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: typeOverrides,
    });

    const nextWorkspace = appendHistory({
      workspace: rebuiltWorkspace,
      outlierConfig: get().outlierConfig,
      csvEncoding: get().csvEncoding,
      action: "cleaning_reset",
      label: "Reset cleaning",
      description: "Restored the working dataset from the original imported rows.",
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
      activePanel: "clean",
    });
  },

  revertToHistoryPoint: (historyId) => {
    const current = get().workspace;

    if (!current) return;

    const normalizedCurrent = normalizeWorkspaceStructure(current);

    const targetEntry = normalizedCurrent.history.find(
      (entry) => entry.id === historyId,
    );

    if (!targetEntry) return;

    const restoredWorkspace = restoreWorkspaceFromSnapshot({
      currentWorkspace: normalizedCurrent,
      snapshot: targetEntry.snapshot,
    });

    const nextWorkspace = appendHistory({
      workspace: restoredWorkspace,
      outlierConfig: targetEntry.snapshot.outlierConfig,
      csvEncoding: targetEntry.snapshot.csvEncoding,
      action: "history_reverted",
      label: "Reverted workspace",
      description: `Reverted to "${targetEntry.label}" from ${new Date(
        targetEntry.createdAt,
      ).toLocaleString()}.`,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
      outlierConfig: targetEntry.snapshot.outlierConfig,
      csvEncoding: targetEntry.snapshot.csvEncoding,
      activePanel: "history",
    });
  },
}));