"use client";

import { useEffect, useRef } from "react";

import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  clearPersistedWorkspaceSession,
  loadPersistedWorkspaceSession,
  savePersistedWorkspaceSession,
} from "@/lib/persistence/workspaceSession";

const SAVE_DEBOUNCE_MS = 450;

export { clearPersistedWorkspaceSession, loadPersistedWorkspaceSession };

export function WorkspacePersistenceBridge() {
  const { settings, hydrated } = useCleanframeSettings();

  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const activePanel = useWorkspaceStore((state) => state.activePanel);

  const hasLoadedPersistedSession = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated || hasLoadedPersistedSession.current) return;

    hasLoadedPersistedSession.current = true;

    if (!settings.persistWorkspaceLocally) return;

    let cancelled = false;

    async function loadSession() {
      const persistedSession = await loadPersistedWorkspaceSession();

      if (cancelled || !persistedSession) return;

      useWorkspaceStore.setState({
        workspace: persistedSession.workspace,
        outlierConfig: persistedSession.outlierConfig,
        csvEncoding: persistedSession.csvEncoding,
        activePanel: persistedSession.activePanel,
        status: "ready",
        error: null,
      });
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [hydrated, settings.persistWorkspaceLocally]);

  useEffect(() => {
    if (!hydrated) return;

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (!settings.persistWorkspaceLocally) {
      void clearPersistedWorkspaceSession();
      return;
    }

    if (!settings.autoSaveWorkspaceState || !workspace) return;

    saveTimerRef.current = window.setTimeout(() => {
      void savePersistedWorkspaceSession({
        version: 1,
        savedAt: new Date().toISOString(),
        workspace,
        outlierConfig,
        csvEncoding,
        activePanel,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    hydrated,
    settings.persistWorkspaceLocally,
    settings.autoSaveWorkspaceState,
    workspace,
    outlierConfig,
    csvEncoding,
    activePanel,
  ]);

  return null;
}