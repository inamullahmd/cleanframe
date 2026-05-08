"use client";

import {
  AlertTriangle,
  Columns3,
  Copy,
  Gauge,
  Rows3,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/store/workspaceStore";

function getQualityVariant(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Review";
  return "Risk";
}

function getQualityBadgeVariant(score: number) {
  if (score >= 75) return "secondary";
  return "destructive";
}

export function MetricsBar() {
  const workspace = useWorkspaceStore((state) => state.workspace);

  if (!workspace) return null;

  const { profile } = workspace;

  const metrics = [
    {
      label: "Rows",
      value: profile.rowCount.toLocaleString(),
      icon: Rows3,
    },
    {
      label: "Columns",
      value: profile.columnCount.toLocaleString(),
      icon: Columns3,
    },
    {
      label: "Rows with missing",
      value: profile.rowsWithMissingValuesCount.toLocaleString(),
      icon: TriangleAlert,
    },
    {
      label: "Duplicates",
      value: profile.duplicateRowCount.toLocaleString(),
      icon: Copy,
    },
    {
      label: "Warnings",
      value: profile.parseErrors.length.toLocaleString(),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="border-b bg-background px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl border bg-muted/25">
                <Icon className="size-3.5 text-muted-foreground" />
              </span>

              <span className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>

              <span className="text-sm font-semibold text-foreground">
                {metric.value}
              </span>
            </div>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-xl border bg-muted/25">
            <Gauge className="size-3.5 text-muted-foreground" />
          </span>

          <span className="text-xs font-medium text-muted-foreground">
            Quality
          </span>

          <span className="text-sm font-semibold text-foreground">
            {profile.qualityScore}/100
          </span>

          <Badge variant={getQualityBadgeVariant(profile.qualityScore)}>
            {getQualityVariant(profile.qualityScore)}
          </Badge>
        </div>
      </div>
    </div>
  );
}