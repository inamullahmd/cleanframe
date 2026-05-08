"use client";

import {
    Clock3,
    Database,
    GitBranch,
    RotateCcw,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceHistoryAction } from "@/types/history";
import { useWorkspaceStore } from "@/store/workspaceStore";

function getActionLabel(action: WorkspaceHistoryAction): string {
    const labels: Record<WorkspaceHistoryAction, string> = {
        dataset_loaded: "Dataset",
        column_renamed: "Schema",
        column_names_transformed: "Schema",
        column_type_changed: "Schema",
        missing_values_fixed: "Clean",
        cleaning_reset: "Clean",
        settings_changed: "Settings",
        history_reverted: "Revert",
        column_added: "Schema",
    };

    return labels[action];
}

function getActionTone(action: WorkspaceHistoryAction): string {
    if (action === "history_reverted") {
        return "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100";
    }

    if (action === "missing_values_fixed" || action === "cleaning_reset") {
        return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
    }

    if (
        action === "column_renamed" ||
        action === "column_added" ||
        action === "column_names_transformed" ||
        action === "column_type_changed"
    ) {
        return "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100";
    }

    if (action === "settings_changed") {
        return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
    }

    return "border-border bg-muted/30 text-foreground";
}

export function HistoryPanel() {
    const workspace = useWorkspaceStore((state) => state.workspace);
    const revertToHistoryPoint = useWorkspaceStore(
        (state) => state.revertToHistoryPoint,
    );

    if (!workspace) return null;

    const history = workspace.history;
    const currentHistoryId = history.at(-1)?.id;

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border bg-background">
            <div className="shrink-0 border-b px-5 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/30">
                            <GitBranch className="size-5 text-foreground" />
                        </div>

                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                History
                            </h2>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Every schema, cleaning, and settings change creates a restore
                                point.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-2xl border bg-muted/25 px-3 py-2">
                            <Clock3 className="size-3.5" />
                            {history.length.toLocaleString()} restore points
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-2xl border bg-muted/25 px-3 py-2">
                            <Database className="size-3.5" />
                            {workspace.workingRows.length.toLocaleString()} working rows
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-2xl border bg-muted/25 px-3 py-2">
                            <ShieldCheck className="size-3.5" />
                            Original rows preserved
                        </span>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
                {history.length === 0 ? (
                    <div className="grid h-full min-h-[420px] place-items-center rounded-3xl border border-dashed bg-muted/10 p-8">
                        <div className="max-w-md text-center">
                            <GitBranch className="mx-auto mb-4 size-10 text-muted-foreground" />
                            <h3 className="text-lg font-semibold text-foreground">
                                No history yet
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Once you rename columns, change types, clean data, or update
                                settings, restore points will appear here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto max-w-5xl space-y-3">
                        {history
                            .slice()
                            .reverse()
                            .map((entry, reverseIndex) => {
                                const isCurrent = entry.id === currentHistoryId;
                                const originalIndex = history.length - reverseIndex;

                                return (
                                    <article
                                        key={entry.id}
                                        className={`rounded-3xl border bg-background p-4 shadow-sm ${isCurrent ? "ring-2 ring-primary/15" : ""
                                            }`}
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded-xl border bg-muted/30 px-2 py-1 text-xs font-semibold text-muted-foreground">
                                                        #{originalIndex}
                                                    </span>

                                                    <span
                                                        className={`rounded-xl border px-2 py-1 text-xs font-semibold ${getActionTone(
                                                            entry.action,
                                                        )}`}
                                                    >
                                                        {getActionLabel(entry.action)}
                                                    </span>

                                                    {isCurrent && (
                                                        <span className="rounded-xl border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="mt-3 text-sm font-semibold text-foreground">
                                                    {entry.label}
                                                </h3>

                                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                    {entry.description}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                                    <span>
                                                        {new Date(entry.createdAt).toLocaleString()}
                                                    </span>
                                                    <span>
                                                        Rows:{" "}
                                                        <strong className="font-semibold text-foreground">
                                                            {entry.rowCount.toLocaleString()}
                                                        </strong>
                                                    </span>
                                                    <span>
                                                        Columns:{" "}
                                                        <strong className="font-semibold text-foreground">
                                                            {entry.columnCount.toLocaleString()}
                                                        </strong>
                                                    </span>
                                                    <span>
                                                        Quality:{" "}
                                                        <strong className="font-semibold text-foreground">
                                                            {entry.qualityScore}/100
                                                        </strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant={isCurrent ? "secondary" : "outline"}
                                                disabled={isCurrent}
                                                onClick={() => revertToHistoryPoint(entry.id)}
                                                className="shrink-0 rounded-xl"
                                            >
                                                <RotateCcw className="mr-2 size-4" />
                                                {isCurrent ? "Current point" : "Revert here"}
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