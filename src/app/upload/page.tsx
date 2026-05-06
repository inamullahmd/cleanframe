import { UploadDropzone } from "@/components/upload/UploadDropzone";

export default function UploadPage() {
  return (
    <div>
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-black text-[var(--accent-strong)]">
          Dataset intake
        </div>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--text)]">
          Upload a CSV file
        </h1>

        <p className="mt-3 text-lg text-[var(--muted)]">
          Cleanframe temporarily parses your file and generates a dataset
          quality profile. Files are not stored permanently in v1.
        </p>
      </div>

      <UploadDropzone />
    </div>
  );
}