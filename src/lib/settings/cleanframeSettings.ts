import {
  CLEANFRAME_SETTINGS_CHANGE_EVENT,
  CLEANFRAME_SETTINGS_STORAGE_KEY,
  DEFAULT_CLEANFRAME_SETTINGS,
  LEGACY_CLEANFRAME_SETTINGS_STORAGE_KEY,
  type CleanframeSettings,
  type CsvDelimiter,
} from "@/types/cleanframeSettings";

function isBrowser() {
  return typeof window !== "undefined";
}

function clampGridTextSize(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_CLEANFRAME_SETTINGS.defaultGridTextSize;
  }

  return Math.min(16, Math.max(10, Math.round(parsed)));
}

function isDelimiter(value: unknown): value is CsvDelimiter {
  return ["auto", "comma", "semicolon", "tab", "pipe", "custom"].includes(
    String(value),
  );
}

function migrateLegacyDelimiter(settings: Record<string, unknown>) {
  const delimiter = settings.delimiter;

  if (isDelimiter(delimiter)) {
    return {
      delimiter,
      customDelimiter:
        delimiter === "custom" ? String(settings.customDelimiter ?? "") : "",
    };
  }

  if (typeof delimiter === "string" && delimiter.length > 0) {
    return {
      delimiter: "custom" as const,
      customDelimiter: delimiter,
    };
  }

  return {
    delimiter: DEFAULT_CLEANFRAME_SETTINGS.delimiter,
    customDelimiter: DEFAULT_CLEANFRAME_SETTINGS.customDelimiter,
  };
}

export function normalizeCleanframeSettings(
  settings: Partial<CleanframeSettings> | Record<string, unknown> | null | undefined,
): CleanframeSettings {
  const incoming = settings ?? {};
  const delimiterSettings = migrateLegacyDelimiter(incoming as Record<string, unknown>);
  const merged = {
    ...DEFAULT_CLEANFRAME_SETTINGS,
    ...incoming,
    ...delimiterSettings,
  } as CleanframeSettings;

  return {
    ...merged,
    defaultGridTextSize: clampGridTextSize(merged.defaultGridTextSize),
    customDelimiter:
      merged.delimiter === "custom" ? String(merged.customDelimiter ?? "") : "",
  };
}

export function loadCleanframeSettings(): CleanframeSettings {
  if (!isBrowser()) return DEFAULT_CLEANFRAME_SETTINGS;

  const rawSettings =
    window.localStorage.getItem(CLEANFRAME_SETTINGS_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_CLEANFRAME_SETTINGS_STORAGE_KEY);

  if (!rawSettings) return DEFAULT_CLEANFRAME_SETTINGS;

  try {
    const normalized = normalizeCleanframeSettings(JSON.parse(rawSettings));

    if (!window.localStorage.getItem(CLEANFRAME_SETTINGS_STORAGE_KEY)) {
      window.localStorage.setItem(
        CLEANFRAME_SETTINGS_STORAGE_KEY,
        JSON.stringify(normalized),
      );
    }

    return normalized;
  } catch {
    window.localStorage.removeItem(CLEANFRAME_SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_CLEANFRAME_SETTINGS_STORAGE_KEY);
    return DEFAULT_CLEANFRAME_SETTINGS;
  }
}

export function saveCleanframeSettings(settings: CleanframeSettings) {
  if (!isBrowser()) return DEFAULT_CLEANFRAME_SETTINGS;

  const normalizedSettings = normalizeCleanframeSettings(settings);

  window.localStorage.setItem(
    CLEANFRAME_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizedSettings),
  );

  window.dispatchEvent(
    new CustomEvent(CLEANFRAME_SETTINGS_CHANGE_EVENT, {
      detail: normalizedSettings,
    }),
  );

  return normalizedSettings;
}

export function updateCleanframeSettings(partial: Partial<CleanframeSettings>) {
  const nextSettings = normalizeCleanframeSettings({
    ...loadCleanframeSettings(),
    ...partial,
  });

  saveCleanframeSettings(nextSettings);
  return nextSettings;
}

export function resetCleanframeSettings() {
  return saveCleanframeSettings(DEFAULT_CLEANFRAME_SETTINGS);
}
