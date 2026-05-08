import { create } from "zustand";
import type { ColumnType, DatasetRow } from "@/types/dataset";
import type { DatasetWorkspace } from "@/types/workspace";
import type {
  CleaningStep,
  MissingValueStrategy,
} from "@/types/cleaning";
import type { OutlierConfig } from "@/types/outlier";
import { DEFAULT_OUTLIER_CONFIG } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";
import { DEFAULT_CSV_ENCODING } from "@/types/settings";
import { profileDataset } from "@/lib/profile/profileDataset";
import { isMissingValue } from "@/lib/profile/detectMissingValues";

export type WorkspacePanel = "schema" | "data" | "clean" | "charts";

export type ColumnNameTransform =
  | "title_case_spaces"
  | "replace_underscores"
  | "lowercase_spaces"
  | "uppercase"
  | "snake_case"
  | "camel_case"
  | "trim";

type WorkspaceStatus = "idle" | "loading" | "ready" | "error";

type ApplyMissingValueFixOptions = {
  columnName: string;
  strategy: MissingValueStrategy;
  customValue?: string;
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
  updateColumnType: (columnName: string, nextType: ColumnType) => void;

  applyMissingValueFix: (options: ApplyMissingValueFixOptions) => void;
  resetCleaning: () => void;
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

function getApproxByteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function normalizeWorkspace(workspace: DatasetWorkspace): DatasetWorkspace {
  return {
    ...workspace,
    workingRows: workspace.workingRows ?? workspace.rawRows,
    cleaningSteps: workspace.cleaningSteps ?? [],
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
    return trimmedName.replace(/_/g, " ").replace(/\s+/g, " ").trim() || "Column";
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
  const normalizedWorkspace = normalizeWorkspace(workspace);

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
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "missing_values",
    columnName,
    strategy,
    customValue,
    affectedRows,
    createdAt: new Date().toISOString(),
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
    const normalizedWorkspace = normalizeWorkspace(workspace);

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
      const workspace = normalizeWorkspace(
        JSON.parse(storedWorkspace) as DatasetWorkspace,
      );

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

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: current,
      outlierConfig,
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

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: current,
      outlierConfig: DEFAULT_OUTLIER_CONFIG,
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

    const normalizedCurrent = normalizeWorkspace(current);

    const duplicateExists = normalizedCurrent.fields.some(
      (field) =>
        field !== oldName &&
        field.toLowerCase() === trimmedName.toLowerCase(),
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

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: renamedWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: nextOverrides,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
    });
  },

  transformColumnNames: (transform) => {
    const current = get().workspace;

    if (!current) return;

    const normalizedCurrent = normalizeWorkspace(current);
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

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: renamedWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: nextOverrides,
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

    const normalizedCurrent = normalizeWorkspace(current);

    const overrides = {
      ...createTypeOverrides(normalizedCurrent),
      [columnName]: nextType,
    };

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: normalizedCurrent,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: overrides,
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

    const normalizedCurrent = normalizeWorkspace(current);
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

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: dirtyWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: typeOverrides,
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

    const normalizedCurrent = normalizeWorkspace(current);
    const typeOverrides = createTypeOverrides(normalizedCurrent);

    const dirtyWorkspace: DatasetWorkspace = {
      ...normalizedCurrent,
      workingRows: normalizedCurrent.rawRows,
      cleaningSteps: [],
    };

    const nextWorkspace = rebuildWorkspaceProfile({
      workspace: dirtyWorkspace,
      outlierConfig: get().outlierConfig,
      columnTypeOverrides: typeOverrides,
    });

    persistWorkspace(nextWorkspace);

    set({
      workspace: nextWorkspace,
      activePanel: "clean",
    });
  },
}));