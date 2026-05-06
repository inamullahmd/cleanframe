type Props = {
  score: number;
};

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs review";

  return "High risk";
}

export function DataQualityScore({ score }: Props) {
  return (
    <div className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6 shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--muted)]">
            Data Quality Score
          </p>

          <p className="mt-2 text-5xl font-black text-[var(--text)]">
            {score}
            <span className="text-2xl text-[var(--muted)]">/100</span>
          </p>
        </div>

        <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-black text-[var(--accent-strong)]">
          {getScoreLabel(score)}
        </div>
      </div>

      <div className="mt-6 h-4 overflow-hidden rounded-full bg-[var(--surface-strong)]">
        <div
          className="h-4 rounded-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
        Based on missing values, duplicate rows, and numeric outliers.
      </p>
    </div>
  );
}