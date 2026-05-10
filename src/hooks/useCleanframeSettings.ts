"use client";

import { useEffect, useState } from "react";

import {
  CLEANFRAME_SETTINGS_CHANGE_EVENT,
  DEFAULT_CLEANFRAME_SETTINGS,
  type CleanframeSettings,
} from "@/types/cleanframeSettings";
import {
  loadCleanframeSettings,
  saveCleanframeSettings,
  updateCleanframeSettings,
} from "@/lib/settings/cleanframeSettings";

export function useCleanframeSettings() {
  const [settings, setSettings] = useState<CleanframeSettings>(
    DEFAULT_CLEANFRAME_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadCleanframeSettings());
    setHydrated(true);

    function handleSettingsChange(event: Event) {
      const detail = (event as CustomEvent<CleanframeSettings>).detail;
      setSettings(detail ?? loadCleanframeSettings());
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === "cleanframe-settings-v2") {
        setSettings(loadCleanframeSettings());
      }
    }

    window.addEventListener(CLEANFRAME_SETTINGS_CHANGE_EVENT, handleSettingsChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        CLEANFRAME_SETTINGS_CHANGE_EVENT,
        handleSettingsChange,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function saveSettings(nextSettings: CleanframeSettings) {
    saveCleanframeSettings(nextSettings);
    setSettings(nextSettings);
  }

  function updateSettings(partial: Partial<CleanframeSettings>) {
    const nextSettings = updateCleanframeSettings(partial);
    setSettings(nextSettings);
    return nextSettings;
  }

  return {
    settings,
    hydrated,
    saveSettings,
    updateSettings,
  };
}
