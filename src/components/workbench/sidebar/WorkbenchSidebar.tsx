"use client";

import type { ElementType } from "react";
import {
  Archive,
  BarChart3,
  BrushCleaning,
  FileSpreadsheet,
  GitBranch,
  Layers3,
  Settings,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { UploadZone } from "@/components/workbench/upload/UploadZone";
import { cn } from "@/lib/utils";
import {
  useWorkspaceStore,
  type WorkspacePanel,
} from "@/store/workspaceStore";

type SidebarStep =
  | {
      id: "export";
      label: string;
      description: string;
      icon: ElementType;
      number: string;
    }
  | {
      id: WorkspacePanel;
      label: string;
      description: string;
      icon: ElementType;
      number: string;
    };

type WorkbenchSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

const steps: SidebarStep[] = [
  {
    id: "schema",
    label: "Schema",
    description: "Rename and type columns",
    icon: Layers3,
    number: "01",
  },
  {
    id: "data",
    label: "Data",
    description: "Search, sort, inspect rows",
    icon: FileSpreadsheet,
    number: "02",
  },
  {
    id: "clean",
    label: "Clean",
    description: "Fix missing values",
    icon: BrushCleaning,
    number: "03",
  },
  {
    id: "history",
    label: "History",
    description: "Review and revert changes",
    icon: GitBranch,
    number: "04",
  },
  {
    id: "charts",
    label: "Charts",
    description: "Build and save visuals",
    icon: BarChart3,
    number: "05",
  },
  {
    id: "export",
    label: "Export package",
    description: "Download ZIP package",
    icon: Archive,
    number: "06",
  },
];

function isWorkspacePanel(id: SidebarStep["id"]): id is WorkspacePanel {
  return id !== "export";
}

export function WorkbenchSidebar({
  className,
  onNavigate,
}: WorkbenchSidebarProps) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);

  function goToPanel(panel: WorkspacePanel) {
    setActivePanel(panel);
    onNavigate?.();
  }

  return (
    <aside
      className={cn(
        "flex h-dvh w-[280px] shrink-0 flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-4">
          <div className="min-w-0">
            <h2 className="!text-[13px] font-bold text-foreground">
              Workspace
            </h2>
            <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
              Process CSV files in a browser-first workspace.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="!text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Source
          </p>
          <p className="mt-1 !text-[13px] text-muted-foreground">
            Upload a CSV file.
          </p>

          <div className="mt-3 min-w-0">
            <UploadZone />
          </div>
        </div>

        <Separator className="my-3" />

        <nav className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isEnabled = Boolean(workspace);
            const isActive = isWorkspacePanel(step.id)
              ? step.id === activePanel
              : activePanel === "export";

            return (
              <button
                key={step.id}
                type="button"
                disabled={!isEnabled}
                onClick={() => {
                  if (isWorkspacePanel(step.id)) {
                    goToPanel(step.id);
                    return;
                  }

                  goToPanel("export");
                }}
                className={cn(
                  "group flex h-auto w-full items-center justify-start gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/70 bg-background text-foreground hover:bg-muted/35",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted/35",
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate !text-[13px] font-bold">
                      {step.label}
                    </span>
                    <span className="shrink-0 !text-[11px] font-bold text-muted-foreground">
                      {step.number}
                    </span>
                  </span>

                  <span className="mt-0.5 block truncate !text-[12px] leading-4 text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <button
          type="button"
          onClick={() => goToPanel("settings")}
          className={cn(
            "group flex h-auto w-full items-center justify-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
            activePanel === "settings"
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-border/70 bg-background text-foreground hover:bg-muted/35",
          )}
        >
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
              activePanel === "settings"
                ? "bg-primary/10 text-primary"
                : "bg-muted/35",
            )}
          >
            <Settings className="size-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate !text-[13px] font-bold">
              Settings
            </span>
            <span className="mt-0.5 block truncate !text-[12px] leading-4 text-muted-foreground">
              Workspace preferences
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}