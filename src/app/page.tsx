import Link from "next/link";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-8 shadow-2xl shadow-slate-950/5 backdrop-blur-xl md:p-12">
      <div className="absolute -right-24 -top-24 size-72 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div>
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-extrabold text-[var(--accent-strong)]">
            CSV Data Quality Workbench
          </div>

          <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-tight text-[var(--text)] md:text-6xl">
            Turn messy CSVs into clean, explainable datasets.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Cleanframe profiles uploaded datasets, detects quality issues,
            infers column types, finds missing values and duplicates, and helps
            prepare data for analysis.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="rounded-2xl bg-[var(--text)] px-6 py-3 font-extrabold text-[var(--surface-strong)] shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Upload CSV
            </Link>

            <Link
              href="/about"
              className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-6 py-3 font-extrabold text-[var(--text)] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
            >
              View Scope
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface-strong)]/70 p-6 shadow-xl shadow-slate-950/5 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[var(--text)]">
              Milestone 1
            </h2>

            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent-strong)]">
              Live
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {[
              "Upload CSV file",
              "Validate file type and size",
              "Parse rows and headers",
              "Detect column types",
              "Find missing values",
              "Detect duplicate rows",
              "Show charts and preview data",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text)]"
              >
                <span className="grid size-6 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}