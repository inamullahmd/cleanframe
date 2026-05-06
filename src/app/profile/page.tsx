"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ColumnProfileTable } from "@/components/profile/ColumnProfileTable";
import { ColumnTypesChart } from "@/components/profile/ColumnTypesChart";
import { DataPreviewTable } from "@/components/profile/DataPreviewTable";
import { DataQualityScore } from "@/components/profile/DataQualityScore";
import { DatasetOverviewCards } from "@/components/profile/DatasetOverviewCards";
import { MissingValuesChart } from "@/components/profile/MissingValuesChart";
import type { DatasetWorkspace } from "@/types/workspace";

export default function ProfilePage() {
  const [workspace, setWorkspace] = useState<DatasetWorkspace | null>(null);

  useEffect(() => {
    const storedWorkspace = sessionStorage.getItem("cleanframe-workspace");

    if (storedWorkspace) {
      setWorkspace(JSON.parse(storedWorkspace));
    }
  }, []);

  if (!workspace) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-10 text-center shadow-2xl shadow-slate-950/5 backdrop-blur-xl">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[var(--accent-soft)] text-3xl">
          📄
        </div>

        <h1 className="mt-5 text-3xl font-black text-[var(--text)]">
          No dataset profile found
        </h1>

        <p className="mt-3 text-[var(--muted)]">
          Upload a CSV file first to generate a dataset profile.
        </p>

        <Link
          href="/upload"
          className="mt-6 inline-flex rounded-2xl bg-[var(--text)] px-6 py-3 font-black text-[var(--surface-strong)] shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
        >
          Upload CSV
        </Link>
      </div>
    );
  }

  const { profile } = workspace;

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-slate-950/5 backdrop-blur-xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-black text-[var(--accent-strong)]">
              Dataset Profile
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-[var(--text)]">
              {profile.fileName}
            </h1>

            <p className="mt-2 text-[var(--muted)]">
              Generated {new Date(profile.createdAt).toLocaleString()}
            </p>
          </div>

          <Link
            href="/upload"
            className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-black text-[var(--text)] shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
          >
            Upload another file
          </Link>
        </div>
      </div>

      <DatasetOverviewCards profile={profile} />

      <DataQualityScore score={profile.qualityScore} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MissingValuesChart data={profile.missingValuesChartData} />
        <ColumnTypesChart data={profile.columnTypeCounts} />
      </div>

      <div className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6 shadow-xl shadow-slate-950/5 backdrop-blur">
        <h2 className="text-xl font-black text-[var(--text)]">
          Cleaning Recommendations
        </h2>

        <ul className="mt-4 grid gap-3 text-sm font-bold text-[var(--muted)]">
          {profile.recommendations.map((recommendation) => (
            <li
              key={recommendation}
              className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)]/70 p-4"
            >
              {recommendation}
            </li>
          ))}
        </ul>
      </div>

      {profile.parseErrors.length > 0 && (
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--warning-soft)] p-5 text-sm font-bold text-[var(--warning-text)]">
          <h2 className="font-black">CSV parse warnings</h2>

          <ul className="mt-2 list-disc pl-5">
            {profile.parseErrors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <ColumnProfileTable columns={profile.columns} />

      <DataPreviewTable rows={profile.previewRows} />
    </div>
  );
}