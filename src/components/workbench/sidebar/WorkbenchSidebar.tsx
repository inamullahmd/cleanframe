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
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UploadZone } from "@/components/workbench/upload/UploadZone";
import {
  useWorkspaceStore,
  type WorkspacePanel,
} from "@/store/workspaceStore";

type SidebarStep =
  | {
      id: "upload" | "export";
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

const steps: SidebarStep[] = [
  {
    id: "upload",
    label: "Upload",
    description: "Load a CSV file",
    icon: Upload,
    number: "01",
  },
  {
    id: "schema",
    label: "Schema",
    description: "Rename and type columns",
    icon: Layers3,
    number: "02",
  },
  {
    id: "data",
    label: "Data",
    description: "Search, sort, inspect rows",
    icon: FileSpreadsheet,
    number: "03",
  },
  {
    id: "clean",
    label: "Clean",
    description: "Fix missing values",
    icon: BrushCleaning,
    number: "04",
  },
  {
    id: "history",
    label: "History",
    description: "Review and revert changes",
    icon: GitBranch,
    number: "05",
  },
  {
    id: "charts",
    label: "Charts",
    description: "Build and export visuals",
    icon: BarChart3,
    number: "06",
  },
  {
    id: "export",
    label: "Export package",
    description: "Export report assets",
    icon: Archive,
    number: "07",
  },
];

function isWorkspacePanel(id: SidebarStep["id"]): id is WorkspacePanel {
  return id !== "upload" && id !== "export";
}

export function WorkbenchSidebar() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-background">
      <div className="shrink-0 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Workspace</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Process CSV files temporarily in this browser session.
            </p>
          </div>

          <Badge variant="secondary" className="shrink-0">
            Local
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="shrink-0 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-foreground">Source</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Upload a CSV file.
            </p>
          </div>
        </div>

        <UploadZone />

        {workspace ? (
          <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-foreground">
                  {workspace.file.name}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {workspace.profile.rowCount.toLocaleString()} rows ·{" "}
                  {workspace.profile.columnCount.toLocaleString()} columns
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isUpload = step.id === "upload";
            const isExport = step.id === "export";
            const isEnabled = isUpload || Boolean(workspace);
            const isActive = isWorkspacePanel(step.id)
              ? step.id === activePanel
              : false;

            return (
              <Button
                key={step.id}
                type="button"
                variant="ghost"
                disabled={!isEnabled || isExport}
                onClick={() => {
                  if (isWorkspacePanel(step.id)) {
                    setActivePanel(step.id);
                  }
                }}
                className={`group flex h-auto w-full items-center justify-start gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  isActive
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/70 bg-background text-foreground hover:bg-muted/35"
                }`}
              >

                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
                  <Icon className="size-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-4 text-foreground">
                    {step.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {isExport ? "Coming soon" : step.description}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <Button
          type="button"
          variant="ghost"
          disabled={!workspace}
          onClick={() => setActivePanel("settings")}
          className={`group flex h-auto w-full items-center justify-start gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
            activePanel === "settings"
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-border/70 bg-background text-foreground hover:bg-muted/35"
          }`}
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl text-muted-foreground">
            <Settings className="size-4" />
          </span>

          <span className="min-w-0">
            <span className="block text-xs font-bold leading-4 text-foreground">
              Settings
            </span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
              Workspace preferences
            </span>
          </span>
        </Button>
      </div>
    </aside>
  );
}