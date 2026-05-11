import {
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { LoadSampleButton } from "@/components/workbench/sample/LoadSampleButton";

const capabilities = [
  {
    title: "Profile",
    description:
      "Detect column types, missing values, duplicates, outliers, and quality issues.",
    icon: FileSpreadsheet,
  },
  {
    title: "Correct",
    description:
      "Rename columns, override inferred types, and prepare a cleaner schema.",
    icon: SlidersHorizontal,
  },
  {
    title: "Explore",
    description:
      "Search, sort, inspect rows, switch formatted/raw values, and control visible columns.",
    icon: Database,
  },
  {
    title: "Visualize",
    description:
      "Build ECharts visuals from compatible columns, aggregations, and display options.",
    icon: BarChart3,
  },
];

export function EmptyWorkspace() {
  return (
    <section className="min-h-full rounded-[1.35rem] bg-background !text-[13px] lg:flex lg:h-full lg:min-h-0 lg:items-center lg:justify-center lg:overflow-auto">
      <div className="mx-auto grid w-full max-w-[1180px] gap-5 px-3 py-4 sm:px-4 sm:py-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-h-0 flex-col justify-start rounded-[1.35rem] bg-muted/[0.08] p-5 sm:p-6 md:p-8 lg:min-h-[620px] lg:justify-center lg:rounded-[1.6rem]">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 !text-[13px] font-bold text-primary">
            <Sparkles className="size-3.5" />
            Cleanframe CSV Workbench
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-[-0.05em] text-foreground sm:text-4xl md:text-5xl">
            Turn messy CSV files into trusted, chart-ready datasets.
          </h1>

          <p className="mt-4 max-w-2xl !text-[13px] leading-6 text-muted-foreground md:!text-[14px]">
            Upload a CSV, inspect schema quality, correct inferred column types,
            explore the full table, detect outliers, track history, and build
            exportable charts from one focused workspace.
          </p>

          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left lg:hidden">
            <p className="!text-[13px] font-semibold text-amber-200">
              Best experienced on a laptop or desktop.
            </p>
            <p className="mt-1 !text-[13px] leading-5 text-amber-100/80">
              Cleanframe is a detailed CSV workspace with wide tables, schema
              tools, and chart controls. Mobile screens are supported, but
              larger screens provide a much better experience.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <LoadSampleButton />

            <div className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-muted/35 px-3 py-2 !text-[13px] font-semibold text-muted-foreground">
              <ArrowRight className="size-3.5 shrink-0" />
              <span>Or upload a CSV from the Source panel</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 !text-[13px] text-muted-foreground">
            <span className="rounded-full bg-muted/35 px-3 py-1.5">
              No account required
            </span>
            <span className="rounded-full bg-muted/35 px-3 py-1.5">
              Browser-first workspace
            </span>
            <span className="rounded-full bg-muted/35 px-3 py-1.5">
              Sample dataset included
            </span>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {capabilities.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl bg-background/70 p-4 shadow-sm"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-muted/45 text-muted-foreground">
                    <Icon className="size-4" />
                  </span>

                  <h2 className="mt-3 !text-[13px] font-bold text-foreground">
                    {item.title}
                  </h2>

                  <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col justify-start rounded-[1.35rem] bg-muted/[0.08] p-4 sm:p-5 lg:min-h-[620px] lg:justify-center lg:rounded-[1.6rem]">
          <div className="rounded-2xl bg-background/75 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="!text-[13px] font-bold text-foreground">
                  Dataset profile
                </p>
                <p className="mt-1 !text-[13px] text-muted-foreground">
                  Example: Airbnb sample data
                </p>
              </div>

              <span className="rounded-xl bg-primary/10 px-2.5 py-1 !text-[12px] font-bold text-primary">
                99/100
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric label="Rows" value="5,000" />
              <Metric label="Columns" value="16" />
              <Metric label="Numeric" value="8" />
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl bg-muted/[0.2]">
              <table className="w-full min-w-[360px] text-left !text-[13px]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-bold">room_type</th>
                    <th className="px-3 py-2 font-bold">price</th>
                    <th className="px-3 py-2 font-bold">last_review</th>
                  </tr>
                </thead>

                <tbody className="text-foreground">
                  <tr>
                    <td className="border-t border-border/60 px-3 py-2">
                      Private room
                    </td>
                    <td className="border-t border-border/60 px-3 py-2">
                      $149
                    </td>
                    <td className="border-t border-border/60 px-3 py-2">
                      Oct 18, 2018
                    </td>
                  </tr>

                  <tr>
                    <td className="border-t border-border/60 px-3 py-2">
                      Entire home/apt
                    </td>
                    <td className="border-t border-border/60 px-3 py-2">
                      $225
                    </td>
                    <td className="border-t border-border/60 px-3 py-2 text-amber-500">
                      Missing
                    </td>
                  </tr>

                  <tr>
                    <td className="border-t border-border/60 px-3 py-2">
                      Shared room
                    </td>
                    <td className="border-t border-border/60 px-3 py-2 text-rose-500">
                      $10,000
                    </td>
                    <td className="border-t border-border/60 px-3 py-2">
                      Jun 12, 2019
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-400/10 px-3 py-1.5 !text-[12px] font-bold text-amber-500">
                Missing values
              </span>
              <span className="rounded-full bg-rose-400/10 px-3 py-1.5 !text-[12px] font-bold text-rose-500">
                Outlier flags
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1.5 !text-[12px] font-bold text-primary">
                Chart-ready
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-background/75 p-4 shadow-sm">
            <div className="flex gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted/45 text-muted-foreground">
                <ShieldCheck className="size-4" />
              </span>

              <div>
                <p className="!text-[13px] font-bold text-foreground">
                  Local-first by default
                </p>
                <p className="mt-1 !text-[13px] leading-5 text-muted-foreground">
                  Use the Save session toggle in the top bar when you want the
                  workspace restored from browser storage on the same device.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/[0.22] px-3 py-2">
      <p className="!text-[12px] text-muted-foreground">{label}</p>
      <p className="mt-1 !text-[13px] font-bold text-foreground">{value}</p>
    </div>
  );
}
