"use client";

import { FileUp, Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const csvEncoding = useWorkspaceStore((state) => state.csvEncoding);
  const { workspace, status, error, setWorkspace, setLoading, setError, resetWorkspace } =
    useWorkspaceStore();

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
    <section className="border-b p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">Source</h2>
          <p className="text-xs text-muted-foreground">Upload a CSV file.</p>
        </div>

        {workspace && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={resetWorkspace}
            title="Reset workspace"
          >
            <RotateCcw className="size-4" />
          </Button>
        )}
      </div>

      <label
        className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 px-3 py-5 text-center transition hover:bg-muted"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) profileFile(file);
        }}
      >
        {isLoading ? (
          <Loader2 className="mb-2 size-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="mb-2 size-5 text-muted-foreground" />
        )}

        <span className="text-sm font-medium text-foreground">
          {isLoading ? "Profiling file..." : "Drop CSV or browse"}
        </span>

        <span className="mt-1 text-xs text-muted-foreground">
          Max size: 10MB
        </span>

        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={isLoading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) profileFile(file);
            event.currentTarget.value = "";
          }}
        />
      </label>

      {workspace && (
        <div className="mt-3 rounded-md border bg-background p-3">
          <div className="flex items-start gap-2">
            <FileUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {workspace.file.name}
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {workspace.profile.rowCount.toLocaleString()} rows ·{" "}
                {workspace.profile.columnCount.toLocaleString()} columns
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </section>
  );
}