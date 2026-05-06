import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv/parseCsv";
import { profileDataset } from "@/lib/profile/profileDataset";
import type { DatasetWorkspace } from "@/types/workspace";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { error: "No CSV file was uploaded." },
        { status: 400 },
      );
    }

    if (!uploadedFile.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a .csv file." },
        { status: 400 },
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    const csvText = await uploadedFile.text();

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: "The uploaded CSV file is empty." },
        { status: 400 },
      );
    }

    const parsedCsv = parseCsv(csvText);

    if (parsedCsv.fields.length === 0 || parsedCsv.rows.length === 0) {
      return NextResponse.json(
        { error: "No usable rows or columns were found in the CSV file." },
        { status: 400 },
      );
    }

    const profile = profileDataset(parsedCsv.rows, parsedCsv.fields, {
      fileName: uploadedFile.name,
      fileSizeBytes: uploadedFile.size,
      parseErrors: parsedCsv.errors,
    });

    const workspace: DatasetWorkspace = {
      file: {
        name: uploadedFile.name,
        sizeBytes: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
      },
      fields: parsedCsv.fields,
      rawRows: parsedCsv.rows,
      profile,
    };

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong while profiling the CSV." },
      { status: 500 },
    );
  }
}