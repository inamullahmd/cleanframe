"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSampleWorkspace } from "@/lib/sample/createSampleWorkspace";
import { useWorkspaceStore } from "@/store/workspaceStore";

type LoadSampleButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  label?: string;
};

export function LoadSampleButton({
  label = "Load sample data",
  ...props
}: LoadSampleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const setActivePanel = useWorkspaceStore((state) => state.setActivePanel);
  const setError = useWorkspaceStore((state) => state.setError);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);

  async function loadSampleData() {
    setIsLoading(true);
    setLocalError("");

    try {
      const workspace = await createSampleWorkspace(outlierConfig);

      setWorkspace(workspace);
      setActivePanel("schema");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load sample dataset.";

      setError(message);
      setLocalError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <Button
        type="button"
        onClick={loadSampleData}
        disabled={isLoading}
        className="h-9 rounded-xl px-3 !text-[13px] font-semibold"
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <DatabaseZap className="mr-1.5 size-3.5" />
        )}

        {isLoading ? "Loading sample..." : label}
      </Button>

      {localError ? (
        <p className="max-w-xs !text-[12px] leading-4 text-rose-500">
          {localError}
        </p>
      ) : null}
    </div>
  );
}