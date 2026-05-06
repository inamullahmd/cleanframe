import type { DatasetRow } from "@/types/dataset";

export function detectDuplicateRows(
  rows: DatasetRow[],
  fields: string[],
): number {
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const row of rows) {
    const signature = fields
      .map((field) => String(row[field] ?? "").trim())
      .join("\u241F");

    if (seen.has(signature)) {
      duplicateCount += 1;
    } else {
      seen.add(signature);
    }
  }

  return duplicateCount;
}