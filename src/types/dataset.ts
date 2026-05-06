export type DatasetRow = Record<string, string>;

export type ColumnType =
  | "number"
  | "date"
  | "category"
  | "text"
  | "boolean"
  | "id"
  | "email"
  | "url"
  | "currency";