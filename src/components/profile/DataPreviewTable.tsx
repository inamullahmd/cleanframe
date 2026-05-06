import type { DatasetRow } from "@/types/dataset";

type Props = {
  rows: DatasetRow[];
};

export function DataPreviewTable({ rows }: Props) {
  const columns = Object.keys(rows[0] ?? {});

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-500">
        No preview rows available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-950">Data Preview</h2>
        <p className="text-sm text-slate-500">Showing the first 25 rows.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="max-w-xs truncate whitespace-nowrap px-4 py-3 text-slate-700"
                    title={String(row[column] ?? "")}
                  >
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}