import type { DatasetRow } from "@/types/dataset";
import type { DatasetProfile } from "@/types/profile";

export type DatasetWorkspace = {
  file: {
    name: string;
    sizeBytes: number;
    uploadedAt: string;
  };
  fields: string[];
  rawRows: DatasetRow[];
  profile: DatasetProfile;
};