"use client";

import { create } from "zustand";

import type {
  ChartConfig,
  ChartType,
} from "@/components/workbench/analytics/ChartBuilder";

export type SavedChartArtifact = {
  id: string;
  title: string;
  chartType: ChartType;
  savedAt: string;
  config: ChartConfig;
  imageDataUrl: string;
};

type ExportPackageState = {
  savedCharts: SavedChartArtifact[];
  saveChartToPackage: (chart: SavedChartArtifact) => void;
  removeSavedChart: (chartId: string) => void;
  clearSavedCharts: () => void;
};

export const useExportPackageStore = create<ExportPackageState>((set) => ({
  savedCharts: [],

  saveChartToPackage: (chart) =>
    set((state) => ({
      savedCharts: [chart, ...state.savedCharts],
    })),

  removeSavedChart: (chartId) =>
    set((state) => ({
      savedCharts: state.savedCharts.filter((chart) => chart.id !== chartId),
    })),

  clearSavedCharts: () =>
    set({
      savedCharts: [],
    }),
}));