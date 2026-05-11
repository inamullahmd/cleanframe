"use client";

import { FileUp, Loader2, RotateCcw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCleanframeSettings } from "@/hooks/useCleanframeSettings";
import { useWorkspaceStore } from "@/store/workspaceStore";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Only .csv files are supported.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Maximum file size is 10MB.";
  }

  return null;
}

export function UploadZone() {
  const { settings } = useCleanframeSettings();
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const {
    workspace,
    status,
    error,
    setWorkspace,
    setLoading,
    setError,
    resetWorkspace,
  } = useWorkspaceStore();

  const isLoading = status === "loading";

  async function profileFile(file: File) {
    const validationError = validateCsvFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("encoding", csvEncoding);
      formData.append("settings", JSON.stringify(settings));

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to profile CSV.");
      }

      setWorkspace(data.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <section className="rounded-[1.35rem] border border-border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="!text-[13px] font-bold text-foreground">Source</h2>
          <p className="mt-1 !text-[13px] text-muted-foreground">
            Upload a CSV file.
          </p>
        </div>

        {workspace ? (
          <Button
            type="button"
            variant="outline"
            onClick={resetWorkspace}
            className="h-8 rounded-xl px-3 !text-[13px]"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
        ) : null}
      </div>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) profileFile(file);
        }}
        className="mt-4 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/[0.18] px-6 py-8 text-center transition hover:bg-muted/35"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <FileUp className="size-5" />
          )}
        </span>

        <span className="mt-4 !text-[13px] font-bold text-foreground">
          {isLoading ? "Profiling file..." : "Drop CSV or browse"}
        </span>
        <span className="mt-1 !text-[13px] text-muted-foreground">
          Max size: 10MB · Encoding: {csvEncoding}
        </span>

        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={isLoading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) profileFile(file);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {workspace ? (
        <div className="mt-4 rounded-2xl bg-muted/[0.18] px-4 py-3">
          <div className="flex items-center gap-2 !text-[13px] font-bold text-foreground">
            <Upload className="size-4 text-muted-foreground" />
            {workspace.file.name}
          </div>
          <p className="mt-1 !text-[13px] text-muted-foreground">
            {workspace.profile.rowCount.toLocaleString()} rows ·{" "}
            {workspace.profile.columnCount.toLocaleString()} columns
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 !text-[13px] font-semibold text-destructive">
          {error}
        </div>
      ) : null}
    </section>
  );
}
