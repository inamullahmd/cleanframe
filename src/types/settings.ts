export type CsvEncoding =
  | "utf-8"
  | "utf-8-sig"
  | "iso-8859-1"
  | "windows-1252";

export const CSV_ENCODINGS: {
  value: CsvEncoding;
  label: string;
  description: string;
}[] = [
  {
    value: "utf-8",
    label: "UTF-8",
    description: "Best default for modern CSV files.",
  },
  {
    value: "utf-8-sig",
    label: "UTF-8 with BOM",
    description: "Useful for CSVs exported from Excel.",
  },
  {
    value: "iso-8859-1",
    label: "ISO-8859-1",
    description: "Older Western European encoding.",
  },
  {
    value: "windows-1252",
    label: "Windows-1252",
    description: "Common for legacy Windows/Excel exports.",
  },
];

export const DEFAULT_CSV_ENCODING: CsvEncoding = "utf-8";