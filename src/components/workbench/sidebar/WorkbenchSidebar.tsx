"use client";

import type { ElementType } from "react";
import {
  BarChart3,
  BrushCleaning,
  FileSpreadsheet,
  Layers3,
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
      id: "upload";
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
    id: "charts",
    label: "Charts",
    description: "Build and export visuals",
    icon: BarChart3,
    number: "05",
  },
];

function isWorkspacePanel(id: SidebarStep["id"]): id is WorkspacePanel {
  return id !== "upload";
}

export function WorkbenchSidebar() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);

  return (
    <aside className="hidden w-80 shrink-0 border-r bg-background lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Workspace
            </h2>

            <Badge variant="secondary">Local</Badge>
          </div>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Process CSV files temporarily in this browser session.
          </p>
        </div>

        <UploadZone />

        <nav className="space-y-1.5 p-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const isUpload = step.id === "upload";
            const isEnabled = isUpload || Boolean(workspace);
            const isActive = isWorkspacePanel(step.id)
              ? step.id === activePanel
              : false;

            return (
              <button
                key={step.label}
                type="button"
                disabled={!isEnabled || isUpload}
                onClick={() => {
                  if (isWorkspacePanel(step.id)) {
                    setActivePanel(step.id);
                  }
                }}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  isActive
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-transparent bg-transparent text-foreground hover:border-border hover:bg-muted/35"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-semibold ${
                    isActive
                      ? "border-primary/30 bg-background text-primary"
                      : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {step.number}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />

                    <span className="text-sm font-semibold text-foreground">
                      {step.label}
                    </span>
                  </span>

                  <span className="mt-0.5 block truncate text-xs leading-5 text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <Separator />

        <div className="mt-auto border-t p-4">
          <div className="rounded-2xl border bg-muted/25 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Export package
            </h3>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Report export will include schema, data quality, cleaning history,
              and chart outputs.
            </p>

            <Button className="mt-3 w-full" disabled>
              Coming soon
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}