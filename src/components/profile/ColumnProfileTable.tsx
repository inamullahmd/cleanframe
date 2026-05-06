import type { ColumnProfile } from "@/types/profile";
import { formatNumber } from "@/lib/utils/formatNumber";

type Props = {
  columns: ColumnProfile[];
};

export function ColumnProfileTable({ columns }: Props) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] shadow-xl shadow-slate-950/5 backdrop-blur">
      <div className="border-b border-[color:var(--border)] p-6">
        <h2 className="text-xl font-black text-[var(--text)]">
          Column Profile
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--muted)]">
          Detected types, missing values, uniqueness, numeric stats, and
          outliers.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-strong)]/80 text-[var(--muted)]">
            <tr>
              <th className="px-5 py-4 text-sm font-black">Column</th>
              <th className="px-5 py-4 text-sm font-black">Type</th>
              <th className="px-5 py-4 text-sm font-black">Missing</th>
              <th className="px-5 py-4 text-sm font-black">Unique</th>
              <th className="px-5 py-4 text-sm font-black">Top Values</th>
              <th className="px-5 py-4 text-sm font-black">Numeric Summary</th>
              <th className="px-5 py-4 text-sm font-black">Outliers</th>
            </tr>
          </thead>

          <tbody>
            {columns.map((column, index) => (
              <tr
                key={column.name}
                className={`align-top border-t border-[color:var(--border)] transition hover:bg-[var(--accent-soft)]/40 ${
                  index % 2 === 0 ? "bg-transparent" : "bg-[var(--surface-strong)]/35"
                }`}
              >
                <td className="px-5 py-5 font-extrabold text-[var(--text)]">
                  {column.name}
                </td>

                <td className="px-5 py-5">
                  <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent-strong)]">
                    {column.type}
                  </span>
                </td>

                <td className="px-5 py-5 font-medium text-[var(--text)]">
                  {column.missingCount}{" "}
                  <span className="text-[var(--muted)]">
                    ({column.missingPercentage.toFixed(1)}%)
                  </span>
                </td>

                <td className="px-5 py-5 font-medium text-[var(--text)]">
                  {column.uniqueCount}
                </td>

                <td className="max-w-xs px-5 py-5">
                  {column.topValues.length > 0 ? (
                    <div className="whitespace-normal leading-7 text-[var(--text)]">
                      {column.topValues.map((item) => (
                        <span key={`${column.name}-${item.value}`} className="mr-2 inline">
                          <span className="font-semibold">{item.value}</span>
                          <span className="text-[var(--muted)]"> ({item.count})</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>

                <td className="min-w-[320px] px-5 py-5">
                  {column.numericSummary ? (
                    <div className="whitespace-normal leading-7 text-[var(--text)]">
                      <span className="font-semibold">min</span>{" "}
                      {formatNumber(column.numericSummary.min)},{" "}
                      <span className="font-semibold">max</span>{" "}
                      {formatNumber(column.numericSummary.max)},{" "}
                      <span className="font-semibold">mean</span>{" "}
                      {formatNumber(column.numericSummary.mean)},{" "}
                      <span className="font-semibold">median</span>{" "}
                      {formatNumber(column.numericSummary.median)},{" "}
                      <span className="font-semibold">sd</span>{" "}
                      {formatNumber(column.numericSummary.standardDeviation)}
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>

                <td className="px-5 py-5 font-semibold text-[var(--text)]">
                  {column.outliers ? column.outliers.count : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}