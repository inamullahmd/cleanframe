import {
  CLEANFRAME_SETTINGS_CHANGE_EVENT,
  CLEANFRAME_SETTINGS_STORAGE_KEY,
  DEFAULT_CLEANFRAME_SETTINGS,
  type CleanframeSettings,
} from "@/types/cleanframeSettings";

function isBrowser() {
  return typeof window !== "undefined";
}

function clampGridTextSize(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CLEANFRAME_SETTINGS.defaultGridTextSize;
  return Math.min(16, Math.max(10, Math.round(parsed)));
}

export function normalizeCleanframeSettings(
  settings: Partial<CleanframeSettings> | null | undefined,
): CleanframeSettings {
  const merged = {
    ...DEFAULT_CLEANFRAME_SETTINGS,
    ...(settings ?? {}),
  };

  return {
    ...merged,
    defaultGridTextSize: clampGridTextSize(merged.defaultGridTextSize),
  };
}

export function loadCleanframeSettings(): CleanframeSettings {
  if (!isBrowser()) return DEFAULT_CLEANFRAME_SETTINGS;

  const rawSettings = window.localStorage.getItem(CLEANFRAME_SETTINGS_STORAGE_KEY);
  if (!rawSettings) return DEFAULT_CLEANFRAME_SETTINGS;

  try {
    return normalizeCleanframeSettings(JSON.parse(rawSettings) as Partial<CleanframeSettings>);
  } catch {
    window.localStorage.removeItem(CLEANFRAME_SETTINGS_STORAGE_KEY);
    return DEFAULT_CLEANFRAME_SETTINGS;
  }
}

export function saveCleanframeSettings(settings: CleanframeSettings) {
  if (!isBrowser()) return;

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
  saveCleanframeSettings(DEFAULT_CLEANFRAME_SETTINGS);
  return DEFAULT_CLEANFRAME_SETTINGS;
}
