import { FileSpreadsheet, Upload } from "lucide-react";
import { LoadSampleButton } from "@/components/workbench/sample/LoadSampleButton";

export function EmptyWorkspace() {
  return (
    <div className="flex h-full min-h-[560px] items-center justify-center rounded-3xl border border-dashed bg-background p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border bg-muted/30 shadow-sm">
          <FileSpreadsheet className="size-6 text-foreground" />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Start with a CSV dataset
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Upload a file from the left panel, or load the included real Airbnb
          sample dataset to inspect schema quality, missing values, outliers,
          and charts immediately.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-muted/25 px-4 py-2 text-xs font-medium text-muted-foreground">
            <Upload className="size-4" />
            Use the upload panel
          </div>

          <LoadSampleButton variant="outline" />
        </div>
      </div>
    </div>
  );
}