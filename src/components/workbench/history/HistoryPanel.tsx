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
  ShieldCheck,
  Sigma,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { WorkspaceHistoryAction } from "@/types/history";
import type { DatasetProfile } from "@/types/profile";

const NUMERIC_TYPES = [
  "integer",
  "decimal",
  "number",
  "percentage",
  "currency",
  "latitude",
  "longitude",
];

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

function MetricChip({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 shadow-sm">
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

function HeaderMetrics({
  profile,
  numericColumnCount,
  columnsWithMissingCount,
}: {
  profile: DatasetProfile;
  numericColumnCount: number;
  columnsWithMissingCount: number;
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      <MetricChip icon={Rows3} label="Rows" value={formatCount(profile.rowCount)} />
      <MetricChip icon={Columns3} label="Columns" value={formatCount(profile.columnCount)} />
      <MetricChip icon={Sigma} label="Numeric" value={formatCount(numericColumnCount)} />
      <MetricChip icon={TriangleAlert} label="With missing" value={formatCount(columnsWithMissingCount)} />
      <MetricChip icon={Copy} label="Duplicates" value={formatCount(profile.duplicateRowCount)} />
      <MetricChip icon={AlertTriangle} label="Warnings" value={formatCount(profile.parseErrors.length)} />

      <div className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 shadow-sm">
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
          <Gauge className="size-3.5" />
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Quality
        </span>
        <span className="text-sm font-bold text-foreground">
          {profile.qualityScore}/100
        </span>
        <Badge variant={getQualityBadgeVariant(profile.qualityScore)}>
          {getQualityLabel(profile.qualityScore)}
        </Badge>
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
  return (
    <span className="inline-flex h-8 items-center rounded-2xl border border-border/70 bg-background px-3 text-xs text-muted-foreground shadow-sm">
      {label}: <span className="ml-1 font-semibold text-foreground">{value}</span>
    </span>
  );
}

export function HistoryPanel() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const revertToHistoryPoint = useWorkspaceStore(
    (state) => state.revertToHistoryPoint,
  );

  if (!workspace) return null;

  const history = workspace.history;
  const currentHistoryId = history.at(-1)?.id;

  const numericColumnCount = workspace.profile.columns.filter((column) =>
    NUMERIC_TYPES.includes(column.type),
  ).length;

  const columnsWithMissingCount = workspace.profile.columns.filter(
    (column) => column.missingCount > 0,
  ).length;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background shadow-sm">
      <div className="shrink-0 border-b border-border/70 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/35 text-foreground">
              <History className="size-5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
                History
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Review restore points and revert the workspace to any previous
                state.
              </p>
            </div>
          </div>

          <HeaderMetrics
            profile={workspace.profile}
            numericColumnCount={numericColumnCount}
            columnsWithMissingCount={columnsWithMissingCount}
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-border/70 bg-muted/[0.18] px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolChip label="Restore points" value={history.length} />
          <ToolChip label="Working rows" value={workspace.workingRows.length.toLocaleString()} />
          <ToolChip label="Original rows" value={workspace.rawRows.length.toLocaleString()} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-4">
        {history.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-background">
            <div className="max-w-md text-center">
              <Clock3 className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-bold text-foreground">
                No history yet
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Restore points will appear here after workspace changes.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {history
              .slice()
              .reverse()
              .map((entry, reverseIndex) => {
                const isCurrent = entry.id === currentHistoryId;
                const originalIndex = history.length - reverseIndex;

                return (
                  <article
                    key={entry.id}
                    className={`rounded-2xl border bg-background p-4 shadow-sm transition hover:shadow-md ${
                      isCurrent ? "border-primary/30 ring-2 ring-primary/5" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex size-7 items-center justify-center rounded-xl border border-border/70 bg-muted/35 text-xs font-bold text-muted-foreground">
                            #{originalIndex}
                          </span>

                          <span className="inline-flex h-7 items-center rounded-xl border border-border bg-muted/30 px-2.5 text-[11px] font-bold text-foreground">
                            {getActionLabel(entry.action)}
                          </span>

                          {isCurrent ? (
                            <span className="inline-flex h-7 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700">
                              Current
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 text-sm font-bold tracking-[-0.01em] text-foreground">
                          {entry.label}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {entry.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                          <span>Rows: {entry.rowCount.toLocaleString()}</span>
                          <span>Columns: {entry.columnCount.toLocaleString()}</span>
                          <span>Quality: {entry.qualityScore}/100</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant={isCurrent ? "outline" : "default"}
                        disabled={isCurrent}
                        onClick={() => revertToHistoryPoint(entry.id)}
                        className="h-8 shrink-0 rounded-xl px-3 text-xs"
                      >
                        {isCurrent ? (
                          <>
                            <ShieldCheck className="mr-1.5 size-3.5" />
                            Current point
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-1.5 size-3.5" />
                            Revert here
                          </>
                        )}
                      </Button>
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </div>
    </section>
  );
}