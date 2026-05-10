"use client";

import { Check, Database, X } from "lucide-react";
import { useEffect, useState } from "react";

import { StorageConsentDialog } from "@/components/workbench/settings/StorageConsentDialog";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import {
  clearPersistedWorkspaceSession,
  PERSISTED_WORKSPACE_CHANGE_EVENT,
  PERSISTED_WORKSPACE_CLEAR_EVENT,
  savePersistedWorkspaceSession,
} from "@/lib/persistence/workspaceSession";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function SessionPersistenceToggle() {
  const { settings, hydrated, updateSettings } = useCleanframeSettings();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const activePanel = useWorkspaceStore((state) => state.activePanel);

  const [showConsent, setShowConsent] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Session not saved");

  const enabled = hydrated && settings.persistWorkspaceLocally;

  useEffect(() => {
    setStatusLabel(enabled ? "Session saving on" : "Session not saved");
  }, [enabled]);

  useEffect(() => {
    function handleSessionChange() {
      if (settings.persistWorkspaceLocally) {
        setStatusLabel("Session saved");
        window.setTimeout(() => setStatusLabel("Session saving on"), 1400);
      }
    }

    function handleSessionClear() {
      setStatusLabel("Saved session cleared");
      window.setTimeout(() => setStatusLabel("Session not saved"), 1400);
    }

    window.addEventListener(
      PERSISTED_WORKSPACE_CHANGE_EVENT,
      handleSessionChange,
    );
    window.addEventListener(PERSISTED_WORKSPACE_CLEAR_EVENT, handleSessionClear);

    return () => {
      window.removeEventListener(
        PERSISTED_WORKSPACE_CHANGE_EVENT,
        handleSessionChange,
      );
      window.removeEventListener(
        PERSISTED_WORKSPACE_CLEAR_EVENT,
        handleSessionClear,
      );
    };
  }, [settings.persistWorkspaceLocally]);

  async function saveCurrentSessionNow() {
    if (!workspace) return;

    await savePersistedWorkspaceSession({
      version: 1,
      savedAt: new Date().toISOString(),
      workspace,
      outlierConfig,
      csvEncoding,
      activePanel,
    });
  }

  async function turnSessionSavingOff() {
    updateSettings({
      persistWorkspaceLocally: false,
    });

    await clearPersistedWorkspaceSession();
  }

  function handleToggleClick() {
    if (!hydrated) return;

    if (enabled) {
      void turnSessionSavingOff();
      return;
    }

    setShowConsent(true);
  }

  return (
    <>
      <StorageConsentDialog
        open={showConsent}
        onCancel={() => setShowConsent(false)}
        onAccept={() => {
          updateSettings({
            persistWorkspaceLocally: true,
            autoSaveWorkspaceState: true,
          });
          setShowConsent(false);
          void saveCurrentSessionNow();
        }}
      />

      <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/20 px-2 py-1 shadow-sm sm:inline-flex">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap !text-[12px] font-semibold text-muted-foreground">
          <Database className="size-3.5" />
          Save session
        </span>

        <button
          type="button"
          onClick={handleToggleClick}
          disabled={!hydrated}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn off saved session" : "Turn on saved session"}
          title={statusLabel}
          className={cn(
            "relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border p-1 transition focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60",
            enabled
              ? "border-primary/40 bg-primary/80"
              : "border-border bg-muted/55",
          )}
        >
          <span
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm transition-transform",
              enabled ? "translate-x-5 text-primary" : "translate-x-0",
            )}
          >
            {enabled ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleToggleClick}
        disabled={!hydrated}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn off saved session" : "Turn on saved session"}
        title={statusLabel}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 sm:hidden",
          enabled ? "bg-primary/15 text-primary" : "bg-background hover:bg-muted",
        )}
      >
        <Database className="size-4" />
      </button>
    </>
  );
}