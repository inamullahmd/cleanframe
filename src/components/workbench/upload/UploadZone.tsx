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
    setActivePanel,
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
      setActivePanel("schema");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-background p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="!text-[13px] font-bold text-foreground">Source</h3>
          <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
            Upload a CSV file.
          </p>
        </div>

        {workspace ? (
          <Button
            type="button"
            variant="outline"
            onClick={resetWorkspace}
            className="h-8 shrink-0 rounded-xl px-3 !text-[13px]"
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

          if (file) void profileFile(file);
        }}
        className="mt-4 flex min-h-[220px] w-full min-w-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/[0.18] px-4 py-8 text-center transition hover:bg-muted/35"
      >
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <FileUp className="size-5" />
          )}
        </span>

        <span className="mt-4 !text-[13px] font-bold text-foreground">
          {isLoading ? "Profiling file..." : "Drop CSV or browse"}
        </span>

        <span className="mt-1 !text-[13px] leading-5 text-muted-foreground">
          Max size: 10MB · Encoding: {csvEncoding}
        </span>

        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={isLoading}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) void profileFile(file);

            event.currentTarget.value = "";
          }}
        />
      </label>

      {workspace ? (
        <div className="mt-3 w-full min-w-0 overflow-hidden rounded-2xl bg-muted/[0.18] px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground">
              <Upload className="size-4" />
            </span>

            <div className="min-w-0 flex-1 overflow-hidden">
              <p
                className="block max-w-full truncate !text-[13px] font-bold text-foreground"
                title={workspace.file.name}
              >
                {workspace.file.name}
              </p>

              <p className="mt-0.5 truncate !text-[13px] text-muted-foreground">
                {workspace.profile.rowCount.toLocaleString()} rows ·{" "}
                {workspace.profile.columnCount.toLocaleString()} columns
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-2xl bg-rose-500/10 px-3 py-2 !text-[13px] leading-5 text-rose-500">
          {error}
        </p>
      ) : null}
    </section>
  );
}
