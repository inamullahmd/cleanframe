import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadSampleButton } from "@/components/workbench/sample/LoadSampleButton";

const capabilities = [
  {
    title: "Profile",
    description: "Detect column types, missing values, duplicates, and outliers.",
    icon: FileSpreadsheet,
  },
  {
    title: "Correct",
    description: "Rename columns and override inferred schema types.",
    icon: SlidersHorizontal,
  },
  {
    title: "Visualize",
    description: "Build charts with compatible column and aggregation controls.",
    icon: BarChart3,
  },
  {
    title: "Private",
    description: "Files are processed temporarily without a database in v1.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-7 inline-flex items-center gap-3 rounded-2xl border bg-muted/30 px-3 py-2 shadow-sm">
              <Image
                src="/logo.png"
                alt="Cleanframe"
                width={28}
                height={28}
                priority
                className="size-7 object-contain"
              />

              <span className="font-brand text-sm font-semibold tracking-[-0.02em] text-foreground">
                Cleanframe
              </span>

              <span className="rounded-xl border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                CSV Workbench
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              Turn messy CSV files into trusted, chart-ready datasets.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Upload a CSV, inspect schema quality, correct inferred column
              types, explore the full table, detect outliers, and build
              exportable charts from one focused workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/workbench">
                  Open Workbench
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <LoadSampleButton variant="outline" size="lg" />
            </div>

            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              No account required. No database in v1. Best experienced with the
              included Airbnb sample dataset.
            </p>
          </div>

          <div className="rounded-3xl border bg-muted/20 p-4 shadow-sm">
            <div className="rounded-2xl border bg-background p-4">
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Dataset profile
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AB_NYC_2019.csv
                  </p>
                </div>

                <span className="rounded-xl border bg-muted/40 px-2 py-1 text-xs font-medium text-foreground">
                  96/100
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {capabilities.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border bg-muted/25 p-4"
                    >
                      <div className="mb-3 flex size-9 items-center justify-center rounded-xl border bg-background">
                        <Icon className="size-4 text-foreground" />
                      </div>

                      <h2 className="text-sm font-semibold text-foreground">
                        {item.title}
                      </h2>

                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>

                  <p className="text-xs text-muted-foreground">
                    5,000 rows · 16 columns
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="border-r px-3 py-2 font-medium">
                          room_type
                        </th>
                        <th className="border-r px-3 py-2 font-medium">
                          price
                        </th>
                        <th className="px-3 py-2 font-medium">last_review</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="border-t">
                        <td className="border-r px-3 py-2">Private room</td>
                        <td className="border-r px-3 py-2">$149</td>
                        <td className="px-3 py-2">2019-05-21</td>
                      </tr>

                      <tr className="border-t">
                        <td className="border-r px-3 py-2">Entire home/apt</td>
                        <td className="border-r bg-rose-100 px-3 py-2 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100">
                          $10,000
                        </td>
                        <td className="bg-amber-100 px-3 py-2 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" />
                      </tr>

                      <tr className="border-t">
                        <td className="border-r px-3 py-2">Shared room</td>
                        <td className="border-r px-3 py-2">$75</td>
                        <td className="px-3 py-2">2019-06-12</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-amber-300 bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40" />
                    Missing
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-rose-300 bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40" />
                    Outlier
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}