"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const setWorkspace = useWorkspaceStore((state) => state.setWorkspace);
  const setError = useWorkspaceStore((state) => state.setError);
  const outlierConfig = useWorkspaceStore((state) => state.outlierConfig);

  async function loadSampleData() {
    setIsLoading(true);
    setLocalError("");

    try {
      const workspace = await createSampleWorkspace(outlierConfig);

      setWorkspace(workspace);
      router.push("/workbench");
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
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        onClick={loadSampleData}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <DatabaseZap className="mr-2 size-4" />
        )}

        {isLoading ? "Loading sample..." : label}
      </Button>

      {localError && (
        <p className="max-w-md text-center text-xs leading-5 text-destructive">
          {localError}
        </p>
      )}
    </div>
  );
}