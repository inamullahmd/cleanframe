export type MissingValueStrategy =
  | "leave"
  | "drop_rows"
  | "fill_custom"
  | "fill_unknown"
  | "fill_zero"
  | "fill_mean"
  | "fill_median"
  | "fill_mode"
  | "fill_min"
  | "fill_max"
  | "fill_previous"
  | "fill_next";

export type CleaningStep = {
  id: string;
  type: "missing_values";
  columnName: string;
  strategy: MissingValueStrategy;
  customValue?: string;
  affectedRows: number;
  createdAt: string;
};