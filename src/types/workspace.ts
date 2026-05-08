import type { DatasetRow } from "@/types/dataset";
import type { DatasetProfile } from "@/types/profile";
import type { CleaningStep } from "@/types/cleaning";

export type DatasetWorkspace = {
  file: {
    name: string;
    sizeBytes: number;
    uploadedAt: string;
  };
  fields: string[];
  rawRows: DatasetRow[];
  workingRows: DatasetRow[];
  cleaningSteps: CleaningStep[];
  profile: DatasetProfile;
};