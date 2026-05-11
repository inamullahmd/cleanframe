import type { CleanframeSettings, CsvDelimiter } from "@/types/cleanframeSettings";

export const DELIMITER_OPTIONS: {
  value: CsvDelimiter;
  label: string;
  symbol: string;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Auto-detect",
    symbol: "Auto",
    description: "Let the parser infer the delimiter.",
  },
  {
    value: "comma",
    label: "Comma",
    symbol: ",",
    description: "Comma-separated values.",
  },
  {
    value: "semicolon",
    label: "Semicolon",
    symbol: ";",
    description: "Common in European CSV exports.",
  },
  {
    value: "tab",
    label: "Tab",
    symbol: "⇥",
    description: "Tab-separated values.",
  },
  {
    value: "pipe",
    label: "Pipe",
    symbol: "|",
    description: "Pipe-delimited text files.",
  },
  {
    value: "custom",
    label: "Custom",
    symbol: "Custom",
    description: "Use any delimiter string, including multiple characters.",
  },
];

export function getResolvedDelimiter(settings: Pick<CleanframeSettings, "delimiter" | "customDelimiter">) {
  if (settings.delimiter === "auto") return undefined;
  if (settings.delimiter === "comma") return ",";
  if (settings.delimiter === "semicolon") return ";";
  if (settings.delimiter === "tab") return "\t";
  if (settings.delimiter === "pipe") return "|";

  const customDelimiter = settings.customDelimiter;
  return customDelimiter.length > 0 ? customDelimiter : undefined;
}

export function getDelimiterDisplay(settings: Pick<CleanframeSettings, "delimiter" | "customDelimiter">) {
  if (settings.delimiter === "custom") {
    return settings.customDelimiter ? `Custom: ${settings.customDelimiter}` : "Custom";
  }

  const option = DELIMITER_OPTIONS.find((item) => item.value === settings.delimiter);
  if (!option) return "Auto";
  if (option.value === "auto") return option.label;

  return `${option.label} (${option.symbol})`;
}
