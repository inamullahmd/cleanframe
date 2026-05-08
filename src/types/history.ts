import type { DatasetRow } from "@/types/dataset";
import type { DatasetProfile } from "@/types/profile";
import type { CleaningStep } from "@/types/cleaning";
import type { OutlierConfig } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";

export type WorkspaceHistoryAction =
  | "dataset_loaded"
  | "column_renamed"
  | "column_added"
  | "column_names_transformed"
  | "column_type_changed"
  | "missing_values_fixed"
  | "cleaning_reset"
  | "settings_changed"
  | "history_reverted";

export type WorkspaceHistorySnapshot = {
  fields: string[];
  rawRows: DatasetRow[];
  workingRows: DatasetRow[];
  cleaningSteps: CleaningStep[];
  profile: DatasetProfile;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
};

export type WorkspaceHistoryEntry = {
  id: string;
  action: WorkspaceHistoryAction;
  label: string;
  description: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
  qualityScore: number;
  snapshot: WorkspaceHistorySnapshot;
};