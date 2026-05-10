"use client";

import { useEffect, useRef } from "react";

import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { useWorkspaceStore, type WorkspacePanel } from "@/store/workspaceStore";
import type { DatasetWorkspace } from "@/types/workspace";
import type { OutlierConfig } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";

const PERSISTED_WORKSPACE_KEY = "cleanframe-persisted-workspace-v1";
const MAX_PERSISTED_WORKSPACE_BYTES = 4 * 1024 * 1024;

export type PersistedWorkspaceSession = {
  version: 1;
  savedAt: string;
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
  activePanel: WorkspacePanel;
};

function getApproxByteSize(value: string) {
  return new TextEncoder().encode(value).length;
}

export function loadPersistedWorkspaceSession(): PersistedWorkspaceSession | null {
  if (typeof window === "undefined") return null;

  const rawSession = window.localStorage.getItem(PERSISTED_WORKSPACE_KEY);
  if (!rawSession) return null;

  try {
    const parsedSession = JSON.parse(rawSession) as PersistedWorkspaceSession;

    if (!parsedSession.workspace || parsedSession.version !== 1) {
      window.localStorage.removeItem(PERSISTED_WORKSPACE_KEY);
      return null;
    }

    return parsedSession;
  } catch {
    window.localStorage.removeItem(PERSISTED_WORKSPACE_KEY);
    return null;
  }
}

export function clearPersistedWorkspaceSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PERSISTED_WORKSPACE_KEY);
  window.dispatchEvent(new CustomEvent("cleanframe-persisted-session-cleared"));
}

function savePersistedWorkspaceSession(session: PersistedWorkspaceSession) {
  if (typeof window === "undefined") return false;

  try {
    const serializedSession = JSON.stringify(session);

    if (getApproxByteSize(serializedSession) > MAX_PERSISTED_WORKSPACE_BYTES) {
      window.localStorage.removeItem(PERSISTED_WORKSPACE_KEY);
      return false;
    }

    window.localStorage.setItem(PERSISTED_WORKSPACE_KEY, serializedSession);
    return true;
  } catch {
    return false;
  }
}

export function WorkspacePersistenceBridge() {
  const { settings, hydrated } = useCleanframeSettings();
  const workspace = useWorkspaceStore((state) => state.workspace);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const activePanel = useWorkspaceStore((state) => state.activePanel);
  const hasHydratedPersistedSession = useRef(false);

  useEffect(() => {
    if (!hydrated || hasHydratedPersistedSession.current) return;
    hasHydratedPersistedSession.current = true;

    if (!settings.persistWorkspaceLocally) return;

    const persistedSession = loadPersistedWorkspaceSession();
    if (!persistedSession) return;

    useWorkspaceStore.setState({
      workspace: persistedSession.workspace,
      outlierConfig: persistedSession.outlierConfig,
      csvEncoding: persistedSession.csvEncoding,
      activePanel: persistedSession.activePanel,
      status: "ready",
      error: null,
    });
  }, [hydrated, settings.persistWorkspaceLocally]);

  useEffect(() => {
    if (!hydrated) return;

    if (!settings.persistWorkspaceLocally) {
      clearPersistedWorkspaceSession();
      return;
    }

    if (!settings.autoSaveWorkspaceState || !workspace) return;

    savePersistedWorkspaceSession({
      version: 1,
      savedAt: new Date().toISOString(),
      workspace,
      outlierConfig,
      csvEncoding,
      activePanel,
    });
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
