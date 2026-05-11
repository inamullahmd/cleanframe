import type { WorkspacePanel } from "@/store/workspaceStore";
import type { DatasetWorkspace } from "@/types/workspace";
import type { OutlierConfig } from "@/types/outlier";
import type { CsvEncoding } from "@/types/settings";

export const PERSISTED_WORKSPACE_CHANGE_EVENT =
  "cleanframe-persisted-session-change";
export const PERSISTED_WORKSPACE_CLEAR_EVENT =
  "cleanframe-persisted-session-cleared";

const DB_NAME = "cleanframe-workspace-store";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
const CURRENT_SESSION_KEY = "current";

export type PersistedWorkspaceSession = {
  version: 1;
  savedAt: string;
  workspace: DatasetWorkspace;
  outlierConfig: OutlierConfig;
  csvEncoding: CsvEncoding;
  activePanel: WorkspacePanel;
};

type PersistedWorkspaceRecord = PersistedWorkspaceSession & {
  id: typeof CURRENT_SESSION_KEY;
};

function isBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("Browser storage is not available."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Unable to open browser storage."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function withObjectStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onerror = () => {
          reject(request.error ?? new Error("Browser storage request failed."));
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        transaction.oncomplete = () => {
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("Browser storage transaction failed."),
          );
        };
      }),
  );
}

export async function savePersistedWorkspaceSession(
  session: PersistedWorkspaceSession,
) {
  if (!isBrowser()) return false;

  const record: PersistedWorkspaceRecord = {
    ...session,
    id: CURRENT_SESSION_KEY,
  };

  try {
    await withObjectStore("readwrite", (store) => store.put(record));

    window.dispatchEvent(
      new CustomEvent(PERSISTED_WORKSPACE_CHANGE_EVENT, {
        detail: session,
      }),
    );

    return true;
  } catch (error) {
    console.error("Cleanframe could not save the workspace session.", error);
    return false;
  }
}

export async function loadPersistedWorkspaceSession() {
  if (!isBrowser()) return null;

  try {
    const record = await withObjectStore<PersistedWorkspaceRecord | undefined>(
      "readonly",
      (store) => store.get(CURRENT_SESSION_KEY),
    );

    if (!record || record.version !== 1 || !record.workspace) {
      return null;
    }

    const { id: _id, ...session } = record;
    return session;
  } catch (error) {
    console.error("Cleanframe could not load the saved workspace session.", error);
    return null;
  }
}

export async function clearPersistedWorkspaceSession() {
  if (!isBrowser()) return;

  try {
    await withObjectStore("readwrite", (store) =>
      store.delete(CURRENT_SESSION_KEY),
    );
  } finally {
    window.dispatchEvent(new CustomEvent(PERSISTED_WORKSPACE_CLEAR_EVENT));
    window.dispatchEvent(new CustomEvent(PERSISTED_WORKSPACE_CHANGE_EVENT));
  }
}
