"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function validateFile(file: File): string | null {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "Please upload a .csv file.";
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "File is too large. Maximum size is 10MB.";
    }

    return null;
  }

  function handleFile(file: File) {
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError("");
    setSelectedFile(file);
  }

  async function uploadAndProfile() {
    if (!selectedFile) {
      setError("Choose a CSV file first.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to profile CSV.");
      }

      sessionStorage.setItem(
        "cleanframe-workspace",
        JSON.stringify(data.workspace),
      );

      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-4 shadow-2xl shadow-slate-950/5 backdrop-blur-xl">
      <div
        role="button"
        tabIndex={0}
        className="group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[var(--surface-strong)]/60 p-12 text-center transition hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:shadow-xl"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();

          const file = event.dataTransfer.files[0];

          if (file) handleFile(file);
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 via-transparent to-indigo-400/10 opacity-70" />

        <div className="relative grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-teal-400 to-indigo-500 text-3xl shadow-lg shadow-teal-500/20 transition group-hover:scale-105 group-hover:rotate-3">
          ↑
        </div>

        <p className="relative mt-5 text-2xl font-black text-[var(--text)]">
          Drop your CSV here
        </p>

        <p className="relative mt-2 text-sm font-semibold text-[var(--muted)]">
          or click to browse. Maximum size: 10MB.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) handleFile(file);
          }}
        />
      </div>

      {selectedFile && (
        <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[var(--accent-soft)] p-4 text-sm font-bold text-[var(--text)]">
          Selected: {selectedFile.name}{" "}
          <span className="text-[var(--muted)]">
            ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger-text)]">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={uploadAndProfile}
        disabled={!selectedFile || isUploading}
        className="mt-4 w-full rounded-2xl bg-[var(--text)] px-5 py-4 font-black text-[var(--surface-strong)] shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? "Profiling dataset..." : "Upload and Profile Dataset"}
      </button>
    </div>
  );
}