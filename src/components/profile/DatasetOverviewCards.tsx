import type { DatasetProfile } from "@/types/profile";
import { formatBytes } from "@/lib/utils/formatBytes";

type Props = {
  profile: DatasetProfile;
};

export function DatasetOverviewCards({ profile }: Props) {
  const cards = [
    { label: "Rows", value: profile.rowCount.toLocaleString(), icon: "▦" },
    { label: "Columns", value: profile.columnCount.toLocaleString(), icon: "▥" },
    {
      label: "Duplicate Rows",
      value: profile.duplicateRowCount.toLocaleString(),
      icon: "⧉",
    },
    { label: "File Size", value: formatBytes(profile.fileSizeBytes), icon: "◷" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-5 shadow-xl shadow-slate-950/5 backdrop-blur transition hover:-translate-y-1 hover:border-[color:var(--accent)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[var(--muted)]">
              {card.label}
            </p>

            <span className="grid size-9 place-items-center rounded-2xl bg-[var(--accent-soft)] text-lg font-black text-[var(--accent-strong)] transition group-hover:rotate-6">
              {card.icon}
            </span>
          </div>

          <p className="mt-4 text-3xl font-black text-[var(--text)]">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}