"use client";

import { Database, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StorageConsentDialog({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Database className="size-5" />
          </span>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <h3 className="mt-4 !text-[13px] font-bold text-foreground">
          Save this workspace in browser storage?
        </h3>

        <p className="mt-2 !text-[13px] leading-5 text-muted-foreground">
          Cleanframe will store your current workspace, file-derived rows, schema
          edits, cleaning steps, chart/settings preferences, and restore history
          in this browser&apos;s local storage.
        </p>

        <div className="mt-4 rounded-2xl bg-muted/[0.26] p-3">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1 !text-[13px] leading-5 text-muted-foreground">
              <p>Nothing is uploaded because of this setting.</p>
              <p>
                It can be deleted if you clear browser cache/history, use a
                private window, switch browsers, or clear saved sessions inside
                Cleanframe.
              </p>
              <p>
                Large CSV workspaces may not be saved if they exceed browser
                storage limits.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-8 rounded-xl px-3 !text-[13px]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onAccept}
            className="h-8 rounded-xl px-3 !text-[13px]"
          >
            I understand, save session
          </Button>
        </div>
      </section>
    </div>
  );
}
