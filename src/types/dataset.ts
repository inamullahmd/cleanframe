export type DatasetRow = Record<string, string>;

export type ColumnType =
  | "integer"
  | "decimal"
  | "number"
  | "percentage"
  | "currency"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "category"
  | "text"
  | "id"
  | "uuid"
  | "email"
  | "phone"
  | "url"
  | "postal_code"
  | "country_code"
  | "latitude"
  | "longitude"
  | "json";