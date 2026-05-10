"use client";

import type { ElementType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BrushCleaning,
  CheckCircle2,
  Copy,
  Gauge,
  History,
  Rows3,
  Sigma,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSelect, type CheckSelectOption } from "@/components/ui/check-select";
import { InputWithLabel } from "@/components/ui/input-with-label";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { isMissingValue } from "@/lib/profile/detectMissingValues";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { MissingValueStrategy } from "@/types/cleaning";
import type { ColumnType, DatasetRow } from "@/types/dataset";
import type { ColumnProfile, DatasetProfile } from "@/types/profile";

const NUMERIC_TYPES: ColumnType[] = ["integer", "decimal", "number", "currency", "percentage", "latitude", "longitude"];
const TEXT_LIKE_TYPES: ColumnType[] = ["text", "email", "phone", "url", "id", "uuid", "postal_code", "country_code", "json"];
const DATE_LIKE_TYPES: ColumnType[] = ["date", "datetime", "time"];

const BASE_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  { value: "leave", label: "Leave Missing", description: "Do not change this column." },
  { value: "drop_rows", label: "Drop Rows", description: "Remove rows where this column is missing." },
  { value: "fill_custom", label: "Fill Custom Value", description: "Use a value you provide." },
];
const NUMERIC_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  { value: "fill_zero", label: "Fill Zero", description: "Replace with 0." },
  { value: "fill_median", label: "Fill Median", description: "Safer default for skewed numeric data." },
  { value: "fill_mean", label: "Fill Mean", description: "Use the numeric average." },
  { value: "fill_min", label: "Fill Minimum", description: "Use the column minimum." },
  { value: "fill_max", label: "Fill Maximum", description: "Use the column maximum." },
];
const CATEGORY_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  { value: "fill_mode", label: "Fill Most Frequent", description: "Use the most common category." },
  { value: "fill_unknown", label: "Fill Unknown", description: 'Replace with "Unknown".' },
];
const TEXT_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  { value: "fill_unknown", label: "Fill Unknown", description: 'Replace with "Unknown".' },
];
const BOOLEAN_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  { value: "fill_mode", label: "Fill Most Frequent", description: "Use the most common boolean value." },
];
const DATE_STRATEGIES: CheckSelectOption<MissingValueStrategy>[] = [
  { value: "fill_previous", label: "Fill Previous", description: "Use the previous available value." },
  { value: "fill_next", label: "Fill Next", description: "Use the next available value." },
];

function formatColumnTypeLabel(type: ColumnType): string {
  const labels: Partial<Record<ColumnType, string>> = {
    integer: "Integer",
    decimal: "Decimal",
    number: "Number",
    percentage: "Percentage",
    currency: "Currency",
    date: "Date",
    datetime: "Date Time",
    time: "Time",
    boolean: "Boolean",
    category: "Category",
    text: "Text",
    id: "ID",
    uuid: "UUID",
    email: "Email",
    phone: "Phone",
    url: "URL",
    postal_code: "Postal Code",
    country_code: "Country Code",
    latitude: "Latitude",
    longitude: "Longitude",
    json: "JSON",
  };
  return labels[type] ?? type;
}
function getStrategyOptions(type: ColumnType): CheckSelectOption<MissingValueStrategy>[] {
  if (NUMERIC_TYPES.includes(type)) return [...BASE_STRATEGIES, ...NUMERIC_STRATEGIES];
  if (type === "category") return [...BASE_STRATEGIES, ...CATEGORY_STRATEGIES];
  if (type === "boolean") return [...BASE_STRATEGIES, ...BOOLEAN_STRATEGIES];
  if (DATE_LIKE_TYPES.includes(type)) return [...BASE_STRATEGIES, ...DATE_STRATEGIES];
  if (TEXT_LIKE_TYPES.includes(type)) return [...BASE_STRATEGIES, ...TEXT_STRATEGIES];
  return BASE_STRATEGIES;
}
function getSuggestedStrategy(column: ColumnProfile): MissingValueStrategy {
  if (NUMERIC_TYPES.includes(column.type)) return "fill_median";
  if (column.type === "category") return "fill_mode";
  if (column.type === "boolean") return "fill_mode";
  if (column.type === "text") return "fill_unknown";
  return "leave";
}
function getPreviewValue({ rowIndex, rows, column, strategy, customValue }: { rowIndex: number; rows: DatasetRow[]; column: ColumnProfile; strategy: MissingValueStrategy; customValue: string }) {
  if (strategy === "leave") return "";
  if (strategy === "drop_rows") return "Row removed";
  if (strategy === "fill_custom") return customValue;
  if (strategy === "fill_unknown") return "Unknown";
  if (strategy === "fill_zero") return "0";
  if (strategy === "fill_mean") return String(column.numericSummary?.mean ?? "");
  if (strategy === "fill_median") return String(column.numericSummary?.median ?? "");
  if (strategy === "fill_min") return String(column.numericSummary?.min ?? "");
  if (strategy === "fill_max") return String(column.numericSummary?.max ?? "");
  if (strategy === "fill_mode") return column.topValues[0]?.value ?? "";
  if (strategy === "fill_previous") {
    for (let index = rowIndex - 1; index >= 0; index -= 1) {
      const value = rows[index]?.[column.name];
      if (!isMissingValue(value)) return String(value);
    }
    return "";
  }
  if (strategy === "fill_next") {
    for (let index = rowIndex + 1; index < rows.length; index += 1) {
      const value = rows[index]?.[column.name];
      if (!isMissingValue(value)) return String(value);
    }
    return "";
  }
  return "";
}
function formatStrategyLabel(strategy: MissingValueStrategy) {
  const labels: Record<MissingValueStrategy, string> = {
    leave: "Leave Missing",
    drop_rows: "Drop Rows",
    fill_custom: "Fill Custom Value",
    fill_unknown: "Fill Unknown",
    fill_zero: "Fill Zero",
    fill_mean: "Fill Mean",
    fill_median: "Fill Median",
    fill_mode: "Fill Most Frequent",
    fill_min: "Fill Minimum",
    fill_max: "Fill Maximum",
    fill_previous: "Fill Previous",
    fill_next: "Fill Next",
  };
  return labels[strategy];
}
function getColumnOptionLabel(column: ColumnProfile) {
  return `${column.name} · ${column.missingCount.toLocaleString()} missing`;
}
function formatCount(value: number) { return value.toLocaleString(); }
function getQualityLabel(score: number) { if (score >= 90) return "Excellent"; if (score >= 75) return "Good"; if (score >= 60) return "Review"; return "Risk"; }
function getQualityBadgeVariant(score: number) { return score >= 75 ? "secondary" : "destructive"; }
function MetricChip({ icon: Icon, label, value, intent = "default" }: { icon: ElementType; label: string; value: string; intent?: "default" | "warning" | "danger" }) {
  const valueClassName = intent === "danger" ? "text-rose-700 dark:text-rose-300" : intent === "warning" ? "text-amber-700 dark:text-amber-300" : "text-foreground";
  return <div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-muted/35 px-3"><Icon className="size-3.5 text-muted-foreground" /><span className="!text-[12px] font-medium text-muted-foreground">{label}</span><span className={`!text-[13px] font-bold ${valueClassName}`}>{value}</span></div>;
}
function HeaderMetrics({ profile, numericColumnCount, columnsWithMissingCount }: { profile: DatasetProfile; numericColumnCount: number; columnsWithMissingCount: number }) {
  return <div className="flex flex-wrap items-center justify-end gap-2"><MetricChip icon={Rows3} label="Rows" value={formatCount(profile.rowCount)} /><MetricChip icon={Sigma} label="Numeric" value={formatCount(numericColumnCount)} /><MetricChip icon={TriangleAlert} label="Missing cols" value={formatCount(columnsWithMissingCount)} intent={columnsWithMissingCount > 0 ? "warning" : "default"} /><MetricChip icon={Copy} label="Duplicates" value={formatCount(profile.duplicateRowCount)} intent={profile.duplicateRowCount > 0 ? "warning" : "default"} /><div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-muted/35 px-3"><Gauge className="size-3.5 text-muted-foreground" /><span className="!text-[12px] font-medium text-muted-foreground">Quality</span><span className="!text-[13px] font-bold text-foreground">{profile.qualityScore}/100</span><Badge variant={getQualityBadgeVariant(profile.qualityScore)} className="h-5 rounded-lg px-1.5 !text-[11px]">{getQualityLabel(profile.qualityScore)}</Badge></div></div>;
}
function ToolChip({ label, value }: { label: string; value: string | number }) {
  return <span className="inline-flex h-8 items-center rounded-2xl bg-muted/35 px-3 !text-[13px] text-muted-foreground">{label}: <span className="ml-1 font-bold text-foreground">{value}</span></span>;
}
function InfoLine({ label, value }: { label: string; value: string | number }) {
  return <p className="!text-[13px] text-muted-foreground">{label}: <span className="font-bold text-foreground">{value}</span></p>;
}

export function CleanPanel() {
  const { settings } = useCleanframeSettings();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const applyMissingValueFix = useWorkspaceStore((state) => state.applyMissingValueFix);
  const resetCleaning = useWorkspaceStore((state) => state.resetCleaning);
  const columnsWithMissing = useMemo(() => workspace?.profile.columns.filter((column) => column.missingCount > 0) ?? [], [workspace]);
  const numericColumnCount = useMemo(() => workspace?.profile.columns.filter((column) => NUMERIC_TYPES.includes(column.type)).length ?? 0, [workspace]);
  const columnOptions: CheckSelectOption<string>[] = useMemo(() => columnsWithMissing.map((column) => ({ value: column.name, label: getColumnOptionLabel(column), description: `${formatColumnTypeLabel(column.type)} column` })), [columnsWithMissing]);
  const [selectedColumnName, setSelectedColumnName] = useState(columnsWithMissing[0]?.name ?? "");
  const selectedColumn = columnsWithMissing.find((column) => column.name === selectedColumnName) ?? columnsWithMissing[0];
  const [strategy, setStrategy] = useState<MissingValueStrategy>(selectedColumn ? getSuggestedStrategy(selectedColumn) : "leave");
  const [customValue, setCustomValue] = useState("");
  const rows = workspace?.workingRows ?? [];
  const strategyOptions = selectedColumn ? getStrategyOptions(selectedColumn.type) : BASE_STRATEGIES;
  const missingRowIndexes = useMemo(() => {
    if (!selectedColumn) return [];
    return rows.map((row, index) => ({ row, index })).filter((item) => isMissingValue(item.row[selectedColumn.name]));
  }, [rows, selectedColumn]);
  const previewRows = useMemo(() => {
    if (!selectedColumn) return [];
    return missingRowIndexes.slice(0, 8).map((item) => ({ rowIndex: item.index, before: String(item.row[selectedColumn.name] ?? ""), after: getPreviewValue({ rowIndex: item.index, rows, column: selectedColumn, strategy, customValue }) }));
  }, [missingRowIndexes, rows, selectedColumn, strategy, customValue]);

  if (!workspace) return null;

  function handleColumnChange(columnName: string) {
    const column = columnsWithMissing.find((item) => item.name === columnName);
    setSelectedColumnName(columnName);
    setStrategy(column ? getSuggestedStrategy(column) : "leave");
    setCustomValue("");
  }

  function applyFix() {
    if (!selectedColumn) return;
    if (settings.confirmDestructiveActions) {
      const confirmed = window.confirm(`Apply ${formatStrategyLabel(strategy)} to "${selectedColumn.name}"?`);
      if (!confirmed) return;
    }
    applyMissingValueFix({ columnName: selectedColumn.name, strategy, customValue });
  }

  function handleResetCleaning() {
    if (settings.confirmDestructiveActions) {
      const confirmed = window.confirm("Reset all cleaning steps and restore the working data to the original uploaded rows?");
      if (!confirmed) return;
    }
    resetCleaning();
  }

  const hasMissingValues = columnsWithMissing.length > 0;
  const canApply = Boolean(selectedColumn) && strategy !== "leave" && (strategy !== "fill_custom" || customValue.trim().length > 0);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="shrink-0 px-4 py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/45 text-foreground"><BrushCleaning className="size-4" /></span><div className="min-w-0"><h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">Clean missing values</h2><p className="mt-1 !text-[13px] leading-5 text-muted-foreground">Choose a strategy, preview the changes, and apply fixes to the working dataset.</p></div></div><HeaderMetrics profile={workspace.profile} numericColumnCount={numericColumnCount} columnsWithMissingCount={columnsWithMissing.length} /></div></div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 bg-muted/[0.18] px-4 py-2"><ToolChip label="Missing columns" value={columnsWithMissing.length} /><ToolChip label="Cleaning steps" value={workspace.cleaningSteps.length} /><ToolChip label="Confirm" value={settings.confirmDestructiveActions ? "On" : "Off"} /><ToolChip label="Preview" value={settings.previewCleaningChanges ? "On" : "Off"} />{workspace.cleaningSteps.length > 0 ? <Button type="button" variant="outline" onClick={handleResetCleaning} className="h-8 rounded-xl px-3 !text-[13px]"><History className="mr-1.5 size-3.5" />Reset cleaning</Button> : null}</div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-3">
        {!hasMissingValues ? <div className="rounded-2xl bg-background p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto size-8 text-muted-foreground" /><h3 className="mt-3 !text-[13px] font-bold text-foreground">No missing values found</h3><p className="mt-1 !text-[13px] leading-5 text-muted-foreground">Your current working dataset has no detected missing values.</p></div> : <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]"><aside className="rounded-2xl bg-background p-4 shadow-sm"><h3 className="!text-[13px] font-bold text-foreground">Fix settings</h3><div className="mt-4 space-y-4"><CheckSelect<string> label="Column" value={selectedColumn?.name ?? ""} options={columnOptions} onChange={handleColumnChange} triggerClassName="min-h-10 rounded-xl !text-[13px]" /><CheckSelect<MissingValueStrategy> label="Strategy" value={strategy} options={strategyOptions} onChange={setStrategy} triggerClassName="min-h-10 rounded-xl !text-[13px]" />{strategy === "fill_custom" ? <InputWithLabel label="Custom value" value={customValue} onChange={(event) => setCustomValue(event.target.value)} inputClassName="h-10 rounded-xl !text-[13px]" /> : null}{selectedColumn ? <div className="rounded-2xl bg-muted/[0.22] p-3"><InfoLine label="Selected" value={selectedColumn.name} /><InfoLine label="Type" value={formatColumnTypeLabel(selectedColumn.type)} /><InfoLine label="Missing" value={selectedColumn.missingCount.toLocaleString()} /></div> : null}<Button type="button" onClick={applyFix} disabled={!canApply} className="h-9 w-full rounded-xl !text-[13px]"><Wrench className="mr-1.5 size-3.5" />Apply fix</Button></div></aside><div className="rounded-2xl bg-background p-4 shadow-sm">{settings.previewCleaningChanges ? <><h3 className="!text-[13px] font-bold text-foreground">Affected row preview</h3><p className="mt-1 !text-[13px] leading-5 text-muted-foreground">The original imported rows are preserved. Fixes apply only to the working dataset.</p><div className="mt-4 overflow-hidden rounded-2xl border border-border"><table className="w-full text-left !text-[13px]"><thead className="bg-muted/35 text-muted-foreground"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Before</th><th className="px-3 py-2">After</th></tr></thead><tbody>{previewRows.map((row) => <tr key={row.rowIndex} className="border-t border-border"><td className="px-3 py-2 font-mono text-muted-foreground">{(row.rowIndex + 1).toLocaleString()}</td><td className="px-3 py-2">{row.before || "Empty"}</td><td className="px-3 py-2 font-semibold text-foreground">{row.after || "Empty"}</td></tr>)}</tbody></table></div>{missingRowIndexes.length > previewRows.length ? <p className="mt-3 !text-[13px] text-muted-foreground">Showing first {previewRows.length} affected rows from <span className="font-bold text-foreground">{missingRowIndexes.length.toLocaleString()}</span> total.</p> : null}</> : <div className="rounded-2xl bg-muted/[0.18] p-4"><AlertTriangle className="size-5 text-muted-foreground" /><h3 className="mt-3 !text-[13px] font-bold text-foreground">Preview disabled</h3><p className="mt-1 !text-[13px] text-muted-foreground">Enable preview changes in Settings to see affected rows before applying a fix.</p></div>}<div className="mt-5"><h3 className="!text-[13px] font-bold text-foreground">Cleaning history</h3>{workspace.cleaningSteps.length === 0 ? <p className="mt-2 !text-[13px] text-muted-foreground">No cleaning steps have been applied yet.</p> : <div className="mt-3 space-y-2">{workspace.cleaningSteps.slice().reverse().map((step) => <div key={step.id} className="rounded-xl bg-muted/[0.18] px-3 py-2"><p className="!text-[13px] font-bold text-foreground">{formatStrategyLabel(step.strategy)} · {step.columnName}</p><p className="mt-0.5 !text-[12px] text-muted-foreground">{step.affectedRows.toLocaleString()} rows affected · {new Date(step.createdAt).toLocaleString()}</p></div>)}</div>}</div></div></div>}
      </div>
    </section>
  );
}
