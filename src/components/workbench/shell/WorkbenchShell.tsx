"use client";

import { useEffect } from "react";

import { ChartBuilder } from "@/components/workbench/analytics/ChartBuilder";
import { CleanPanel } from "@/components/workbench/clean/CleanPanel";
import { WorkbenchHeader } from "@/components/workbench/header/WorkbenchHeader";
import { HistoryPanel } from "@/components/workbench/history/HistoryPanel";
import { EmptyWorkspace } from "@/components/workbench/profiling/EmptyWorkspace";
import { SchemaEditor } from "@/components/workbench/schema/SchemaEditor";
import { SettingsPanel } from "@/components/workbench/settings/SettingsPanel";
import { WorkbenchSidebar } from "@/components/workbench/sidebar/WorkbenchSidebar";
import { DataGrid } from "@/components/workbench/table/DataGrid";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";

function getPanelContainerWidth(panel: string, hasWorkspace: boolean) {
  if (!hasWorkspace) {
    return "max-w-[1180px]";
  }

  if (panel === "data") {
    return "max-w-none";
  }

  if (panel === "schema") {
    return "max-w-[1500px]";
  }

  if (panel === "clean") {
    return "max-w-[1500px]";
  }

  if (panel === "history") {
    return "max-w-[1400px]";
  }

  if (panel === "charts") {
    return "max-w-[1680px]";
  }

  if (panel === "settings") {
    return "max-w-[1220px]";
  }

  return "max-w-[1500px]";
}

export function WorkbenchShell() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const hydrateWorkspaceFromSession = useWorkspaceStore(
    (state) => state.hydrateWorkspaceFromSession,
  );

  useEffect(() => {
    hydrateWorkspaceFromSession();
  }, [hydrateWorkspaceFromSession]);

  function renderPanel() {
    if (!workspace) return <EmptyWorkspace />;

    if (activePanel === "schema") return <SchemaEditor />;

    if (activePanel === "data") return <DataGrid />;

    if (activePanel === "clean") return <CleanPanel />;

    if (activePanel === "history") return <HistoryPanel />;

    if (activePanel === "charts") return <ChartBuilder />;

    if (activePanel === "settings") return <SettingsPanel />;

    return <SchemaEditor />;
  }

  const panelContainerWidth = getPanelContainerWidth(
    activePanel,
    Boolean(workspace),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <WorkbenchSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkbenchHeader />

        <main className="min-h-0 flex-1 overflow-hidden bg-muted/[0.04] p-3">
          <div
            className={cn(
              "mx-auto h-full min-h-0 w-full transition-[max-width] duration-200",
              activePanel === "data" ? "px-0" : "",
              panelContainerWidth,
            )}
          >
            {renderPanel()}
          </div>
        </main>
      </div>
    </div>
  );
}