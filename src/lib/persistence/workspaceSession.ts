import type { WorkspacePanel } from "@/store/workspaceStore";
import type { CsvEncoding } from "@/types/settings";
import type { DatasetWorkspace } from "@/types/workspace";

const DATABASE_NAME = "cleanframe-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "sessions";
const SESSION_KEY = "current-workspace";

export const PERSISTED_WORKSPACE_CHANGE_EVENT =
  "cleanframe-workspace-session-change";

export const PERSISTED_WORKSPACE_CLEAR_EVENT =
  "cleanframe-workspace-session-clear";

type PersistedOutlierConfig = {
  method: string;
  iqrMultiplier?: number;
  zScoreThreshold?: number;
};

export type PersistedWorkspaceSession = {
  version: number;
  savedAt: string;
  workspace: DatasetWorkspace;
  outlierConfig: PersistedOutlierConfig;
  csvEncoding: CsvEncoding;
  activePanel: WorkspacePanel;
};

function dispatchPersistenceEvent(eventName: string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(eventName));
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    transaction.oncomplete = () => {
      database.close();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function savePersistedWorkspaceSession(
  session: PersistedWorkspaceSession,
) {
  if (typeof indexedDB === "undefined") return;

  await withStore("readwrite", (store) => store.put(session, SESSION_KEY));
  dispatchPersistenceEvent(PERSISTED_WORKSPACE_CHANGE_EVENT);
}

export async function loadPersistedWorkspaceSession() {
  if (typeof indexedDB === "undefined") return null;

  try {
    const session = await withStore<PersistedWorkspaceSession | undefined>(
      "readonly",
      (store) => store.get(SESSION_KEY),
    );

    return session ?? null;
  } catch {
    return null;
  }
}

export async function clearPersistedWorkspaceSession() {
  if (typeof indexedDB === "undefined") return;

  try {
    await withStore("readwrite", (store) => store.delete(SESSION_KEY));
    dispatchPersistenceEvent(PERSISTED_WORKSPACE_CLEAR_EVENT);
  } catch {
    // Ignore storage cleanup failures.
  }
}