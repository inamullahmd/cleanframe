"use client";

import type { ElementType } from "react";
import {
  AlertTriangle,
  Clock3,
  Columns3,
  Copy,
  Gauge,
  History,
  RotateCcw,
  Rows3,
  Sigma,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { WorkspaceHistoryAction } from "@/types/history";
import type { DatasetProfile } from "@/types/profile";

const NUMERIC_TYPES = ["integer", "decimal", "number", "percentage", "currency", "latitude", "longitude"];

function formatCount(value: number): string {
  return value.toLocaleString();
}
function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Review";
  return "Risk";
}
function getQualityBadgeVariant(score: number) {
  return score >= 75 ? "secondary" : "destructive";
}
function MetricChip({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-muted/35 px-3">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="!text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className="!text-[13px] font-bold text-foreground">{value}</span>
    </div>
  );
}
function HeaderMetrics({ profile, numericColumnCount, columnsWithMissingCount }: { profile: DatasetProfile; numericColumnCount: number; columnsWithMissingCount: number }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <MetricChip icon={Rows3} label="Rows" value={formatCount(profile.rowCount)} />
      <MetricChip icon={Columns3} label="Columns" value={formatCount(profile.columnCount)} />
      <MetricChip icon={Sigma} label="Numeric" value={formatCount(numericColumnCount)} />
      <MetricChip icon={TriangleAlert} label="Missing cols" value={formatCount(columnsWithMissingCount)} />
      <div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-muted/35 px-3">
        <Gauge className="size-3.5 text-muted-foreground" />
        <span className="!text-[12px] font-medium text-muted-foreground">Quality</span>
        <span className="!text-[13px] font-bold text-foreground">{profile.qualityScore}/100</span>
        <Badge variant={getQualityBadgeVariant(profile.qualityScore)} className="h-5 rounded-lg px-1.5 !text-[11px]">{getQualityLabel(profile.qualityScore)}</Badge>
      </div>
    </div>
  );
}
function getActionLabel(action: WorkspaceHistoryAction): string {
  const labels: Record<WorkspaceHistoryAction, string> = {
    dataset_loaded: "Dataset",
    column_renamed: "Schema",
    column_names_transformed: "Schema",
    column_type_changed: "Schema",
    column_added: "Schema",
    column_deleted: "Schema",
    missing_values_fixed: "Clean",
    cleaning_reset: "Clean",
    settings_changed: "Settings",
    history_reverted: "Revert",
  };
  return labels[action];
}
function ToolChip({ label, value }: { label: string; value: string | number }) {
  return <span className="inline-flex h-8 items-center rounded-2xl bg-muted/35 px-3 !text-[13px] text-muted-foreground">{label}: <span className="ml-1 font-bold text-foreground">{value}</span></span>;
}

export function HistoryPanel() {
  const { settings } = useCleanframeSettings();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const revertToHistoryPoint = useWorkspaceStore((state) => state.revertToHistoryPoint);

  if (!workspace) return null;

  const historyLimit = Number(settings.maxHistoryPoints);
  const history = workspace.history.slice(-historyLimit);
  const currentHistoryId = history.at(-1)?.id;
  const numericColumnCount = workspace.profile.columns.filter((column) => NUMERIC_TYPES.includes(column.type)).length;
  const columnsWithMissingCount = workspace.profile.columns.filter((column) => column.missingCount > 0).length;

  function handleRestore(historyId: string, label: string) {
    if (settings.confirmBeforeRestore) {
      const confirmed = window.confirm(`Restore workspace to "${label}"? Your current state will become a new history point.`);
      if (!confirmed) return;
    }
    revertToHistoryPoint(historyId);
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="shrink-0 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/45 text-foreground"><History className="size-4" /></span>
            <div className="min-w-0"><h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">History</h2><p className="mt-1 !text-[13px] leading-5 text-muted-foreground">Review restore points and revert the workspace to any previous state.</p></div>
          </div>
          <HeaderMetrics profile={workspace.profile} numericColumnCount={numericColumnCount} columnsWithMissingCount={columnsWithMissingCount} />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 bg-muted/[0.18] px-4 py-2">
        <ToolChip label="Restore points" value={history.length} />
        <ToolChip label="Limit" value={settings.maxHistoryPoints} />
        <ToolChip label="Confirm restore" value={settings.confirmBeforeRestore ? "On" : "Off"} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-3">
        {history.length === 0 ? (
          <div className="rounded-2xl bg-background p-6 text-center"><AlertTriangle className="mx-auto size-7 text-muted-foreground" /><h3 className="mt-3 !text-[13px] font-bold text-foreground">No history yet</h3><p className="mt-1 !text-[13px] text-muted-foreground">Restore points will appear here after workspace changes.</p></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {history.slice().reverse().map((entry, reverseIndex) => {
              const isCurrent = entry.id === currentHistoryId;
              const originalIndex = history.length - reverseIndex;
              return (
                <article key={entry.id} className="rounded-2xl bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="rounded-lg !text-[11px]">#{originalIndex}</Badge><Badge variant="outline" className="rounded-lg !text-[11px]">{getActionLabel(entry.action)}</Badge>{isCurrent ? <Badge className="rounded-lg !text-[11px]">Current</Badge> : null}</div><h3 className="mt-3 !text-[13px] font-bold text-foreground">{entry.label}</h3></div>
                    <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="mt-2 !text-[13px] leading-5 text-muted-foreground">{entry.description}</p>
                  <div className="mt-3 space-y-1 !text-[12px] text-muted-foreground"><p>{new Date(entry.createdAt).toLocaleString()}</p><p>Rows: {entry.rowCount.toLocaleString()} · Columns: {entry.columnCount.toLocaleString()} · Quality: {entry.qualityScore}/100</p></div>
                  <Button type="button" variant={isCurrent ? "secondary" : "outline"} disabled={isCurrent} onClick={() => handleRestore(entry.id, entry.label)} className="mt-4 h-8 rounded-xl px-3 !text-[13px]">{isCurrent ? <>Current point</> : <><RotateCcw className="mr-1.5 size-3.5" />Revert here</>}</Button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
