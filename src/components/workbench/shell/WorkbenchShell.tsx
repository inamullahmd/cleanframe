"use client";

import { useEffect } from "react";

import { ChartBuilder } from "@/components/workbench/analytics/ChartBuilder";
import { CleanPanel } from "@/components/workbench/clean/CleanPanel";
import { WorkbenchHeader } from "@/components/workbench/header/WorkbenchHeader";
import { HistoryPanel } from "@/components/workbench/history/HistoryPanel";
import { EmptyWorkspace } from "@/components/workbench/profiling/EmptyWorkspace";
import { SchemaEditor } from "@/components/workbench/schema/SchemaEditor";
import { WorkbenchSidebar } from "@/components/workbench/sidebar/WorkbenchSidebar";
import { DataGrid } from "@/components/workbench/table/DataGrid";
import { useWorkspaceStore } from "@/store/workspaceStore";

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

    return <SchemaEditor />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <WorkbenchSidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <WorkbenchHeader />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

          <div className="min-h-0 flex-1 overflow-hidden p-3">
            {renderPanel()}
          </div>
        </div>
      </main>
    </div>
  );
}