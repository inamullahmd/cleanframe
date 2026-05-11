"use client";

import { Clock3, GitBranch, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";

type HistoryEntryLike = {
  id: string;
  action?: string;
  label?: string;
  description?: string;
  createdAt?: string;
  rowCount?: number;
  columnCount?: number;
  qualityScore?: number;
};

function formatDateTime(value?: string) {
  if (!value) return "Unknown time";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActionLabel(action?: string) {
  if (!action) return "Change";

  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActionTone(action?: string) {
  if (action === "dataset_loaded") return "bg-primary/10 text-primary";
  if (action === "history_reverted") return "bg-blue-500/10 text-blue-600 dark:text-blue-300";
  if (action === "missing_values_fixed") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  if (action === "column_deleted") return "bg-rose-500/10 text-rose-600 dark:text-rose-300";

  return "bg-muted text-muted-foreground";
}

export function HistoryPanel() {
  const { settings } = useCleanframeSettings();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const revertToHistoryPoint = useWorkspaceStore(
    (state) => state.revertToHistoryPoint,
  );

  if (!workspace) return null;

  const history = [...((workspace.history ?? []) as HistoryEntryLike[])].reverse();

  function restoreHistoryPoint(pointId: string) {
    if (
      settings.confirmBeforeRestore &&
      !window.confirm("Restore this history point?")
    ) {
      return;
    }

    revertToHistoryPoint(pointId);
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-border bg-background !text-[13px] shadow-sm">
      <div className="shrink-0 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/45 text-foreground">
              <GitBranch className="size-4" />
            </span>

            <div className="min-w-0">
              <h2 className="!text-[13px] font-bold tracking-[-0.02em] text-foreground">
                History
              </h2>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Review restore points and revert the workspace to an earlier state.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-muted/35 px-3">
              <Clock3 className="size-3.5 text-muted-foreground" />
              <span className="!text-[12px] font-medium text-muted-foreground">
                Points
              </span>
              <span className="!text-[13px] font-bold text-foreground">
                {history.length.toLocaleString()}
              </span>
            </div>

            <div className="inline-flex h-8 items-center gap-2 rounded-2xl bg-muted/35 px-3">
              <Sparkles className="size-3.5 text-muted-foreground" />
              <span className="!text-[12px] font-medium text-muted-foreground">
                Confirmation
              </span>
              <span className="!text-[13px] font-bold text-foreground">
                {settings.confirmBeforeRestore ? "On" : "Off"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/[0.06] p-3">
        {history.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl bg-background/70 p-6 text-center">
            <div className="max-w-sm">
              <GitBranch className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 !text-[13px] font-bold text-foreground">
                No history yet
              </h3>
              <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                Changes you make to schema, cleaning, and settings will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {history.map((point, index) => {
              const latest = index === 0;
              const title = point.label || formatActionLabel(point.action);

              return (
                <article
                  key={point.id}
                  className={cn(
                    "rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm transition hover:shadow-md",
                    latest && "border-primary/30 ring-2 ring-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "rounded-lg px-2 !text-[11px]",
                            getActionTone(point.action),
                          )}
                        >
                          {formatActionLabel(point.action)}
                        </Badge>

                        {latest ? (
                          <Badge className="rounded-lg px-2 !text-[11px]">
                            Latest
                          </Badge>
                        ) : null}
                      </div>

                      <h3 className="mt-3 truncate !text-[13px] font-bold text-foreground">
                        {title}
                      </h3>
                      <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                        {point.description || "Workspace restore point."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Metric label="Rows" value={point.rowCount ?? 0} />
                    <Metric label="Cols" value={point.columnCount ?? 0} />
                    <Metric label="Quality" value={point.qualityScore ?? 0} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate !text-[12px] text-muted-foreground">
                      {formatDateTime(point.createdAt)}
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => restoreHistoryPoint(point.id)}
                      className="h-8 shrink-0 rounded-xl px-3 !text-[13px]"
                    >
                      <RotateCcw className="mr-1.5 size-3.5" />
                      Restore
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/[0.2] px-2 py-2">
      <p className="!text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 !text-[13px] font-bold text-foreground">
        {Number(value).toLocaleString()}
      </p>
    </div>
  );
}
