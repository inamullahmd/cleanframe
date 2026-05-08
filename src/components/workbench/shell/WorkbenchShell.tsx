"use client";

import { useEffect } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartBuilder } from "@/components/workbench/analytics/ChartBuilder";
import { CleanPanel } from "@/components/workbench/clean/CleanPanel";
import { DataGrid } from "@/components/workbench/table/DataGrid";
import { EmptyWorkspace } from "@/components/workbench/profiling/EmptyWorkspace";
import { HistoryPanel } from "@/components/workbench/history/HistoryPanel";
import { MetricsBar } from "@/components/workbench/profiling/MetricsBar";
import { SchemaEditor } from "@/components/workbench/schema/SchemaEditor";
import { WorkbenchHeader } from "@/components/workbench/header/WorkbenchHeader";
import { WorkbenchSidebar } from "@/components/workbench/sidebar/WorkbenchSidebar";
import { useWorkspaceStore } from "@/store/workspaceStore";

function getPanelLabel(panel: string) {
  if (panel === "schema") return "Schema";
  if (panel === "data") return "Data";
  if (panel === "clean") return "Clean";
  if (panel === "history") return "History";
  if (panel === "charts") return "Charts";

  return "Workspace";
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

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <WorkbenchHeader />

      <div className="flex h-[calc(100vh-3.5rem)]">
        <WorkbenchSidebar />

        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="flex h-[4.25rem] shrink-0 items-center justify-between border-b bg-background px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="hidden size-8 items-center justify-center rounded-xl border bg-muted/25 sm:flex">
                    <FileSpreadsheet className="size-4 text-foreground" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h1 className="truncate text-sm font-semibold text-foreground">
                        {workspace
                          ? workspace.profile.fileName
                          : "Untitled workspace"}
                      </h1>

                      <Badge variant={workspace ? "secondary" : "outline"}>
                        {workspace ? getPanelLabel(activePanel) : "No file"}
                      </Badge>
                    </div>

                    {!workspace && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Upload a CSV or load the sample dataset to begin.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!workspace}
                  title="Report/export package will be added later"
                  className="hidden sm:inline-flex"
                >
                  <Download className="mr-2 size-4" />
                  Export package
                </Button>
              </div>
            </div>

            {workspace && <MetricsBar />}

            <section className="min-h-0 flex-1 overflow-hidden bg-muted/10 p-4">
              {!workspace && <EmptyWorkspace />}

              {workspace && activePanel === "schema" && <SchemaEditor />}

              {workspace && activePanel === "data" && <DataGrid />}

              {workspace && activePanel === "clean" && <CleanPanel />}

              {workspace && activePanel === "history" && <HistoryPanel />}

              {workspace && activePanel === "charts" && <ChartBuilder />}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}