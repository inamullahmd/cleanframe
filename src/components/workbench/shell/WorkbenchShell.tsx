"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { ChartBuilder } from "@/components/workbench/analytics/ChartBuilder";
import { CleanPanel } from "@/components/workbench/clean/CleanPanel";
import { ExportPackagePanel } from "@/components/workbench/export/ExportPackagePanel";
import { WorkbenchHeader } from "@/components/workbench/header/WorkbenchHeader";
import { HistoryPanel } from "@/components/workbench/history/HistoryPanel";
import { WorkspacePersistenceBridge } from "@/components/workbench/persistence/WorkspacePersistenceBridge";
import { EmptyWorkspace } from "@/components/workbench/profiling/EmptyWorkspace";
import { SchemaEditor } from "@/components/workbench/schema/SchemaEditor";
import { SettingsPanel } from "@/components/workbench/settings/SettingsPanel";
import { WorkbenchSidebar } from "@/components/workbench/sidebar/WorkbenchSidebar";
import { DataGrid } from "@/components/workbench/table/DataGrid";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";

function getPanelContainerWidth(panel: string, hasWorkspace: boolean) {
  if (!hasWorkspace) return "max-w-[1180px]";
  if (panel === "data") return "max-w-none";
  if (panel === "charts") return "max-w-[1680px]";
  if (panel === "export") return "max-w-[1500px]";
  if (panel === "settings") return "max-w-[1220px]";
  if (panel === "history") return "max-w-[1400px]";

  return "max-w-[1500px]";
}

export function WorkbenchShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { settings, hydrated } = useCleanframeSettings();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);
  const hydrateWorkspaceFromSession = useWorkspaceStore(
    (state) => state.hydrateWorkspaceFromSession,
  );

  useEffect(() => {
    hydrateWorkspaceFromSession();
  }, [hydrateWorkspaceFromSession]);

  useEffect(() => {
    if (!hydrated) return;
    if (workspace) return;

    const landingPanel =
      settings.defaultLandingModule === "upload"
        ? "schema"
        : settings.defaultLandingModule;

    setActivePanel(landingPanel as Parameters<typeof setActivePanel>[0]);
  }, [hydrated, settings.defaultLandingModule, setActivePanel, workspace]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activePanel]);

  function renderPanel() {
    if (!workspace) return <EmptyWorkspace />;

    if (activePanel === "schema") return <SchemaEditor />;
    if (activePanel === "data") return <DataGrid />;
    if (activePanel === "clean") return <CleanPanel />;
    if (activePanel === "history") return <HistoryPanel />;
    if (activePanel === "charts") return <ChartBuilder />;
    if (String(activePanel) === "export") return <ExportPackagePanel />;
    if (activePanel === "settings") return <SettingsPanel />;

    return <SchemaEditor />;
  }

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex lg:h-dvh lg:overflow-hidden">
      <WorkspacePersistenceBridge />

      <div className="hidden lg:flex">
        <WorkbenchSidebar />
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[min(86vw,320px)] border-r border-border bg-background shadow-2xl">
            <div className="flex h-12 items-center justify-between border-b border-border px-3">
              <div className="min-w-0">
                <p className="truncate !text-[13px] font-bold text-foreground">
                  Cleanframe
                </p>
                <p className="truncate !text-[11px] text-muted-foreground">
                  CSV workspace
                </p>
              </div>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <WorkbenchSidebar
              className="h-[calc(100dvh-3rem)] border-r-0"
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 lg:flex lg:flex-1 lg:flex-col">
        <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Menu className="size-4" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate !text-[13px] font-bold text-foreground">
              Cleanframe
            </p>
            <p className="truncate !text-[11px] text-muted-foreground">
              {workspace ? workspace.file.name : "Start with a CSV dataset"}
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <WorkbenchHeader />
        </div>

        <main className="bg-muted/[0.04] p-2 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:p-3">
          <div
            className={cn(
              "mx-auto min-h-0 w-full transition-[max-width] duration-200 lg:h-full",
              activePanel === "data" ? "px-0" : "",
              getPanelContainerWidth(String(activePanel), Boolean(workspace)),
            )}
          >
            {renderPanel()}
          </div>
        </main>
      </div>
    </div>
  );
}
