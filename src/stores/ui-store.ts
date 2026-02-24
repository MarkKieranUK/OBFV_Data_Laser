import { create } from "zustand";
import type { DashboardSection, ChartConfig } from "@/types/data";

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  activeSection: DashboardSection;
  setActiveSection: (section: DashboardSection) => void;
  chartConfig: ChartConfig;
  setChartConfig: (config: Partial<ChartConfig>) => void;
  resetChartConfig: () => void;
}

const defaultChartConfig: ChartConfig = {
  xColumn: null,
  yColumn: null,
  groupByColumn: null,
  chartType: "bar",
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeSection: "overview",
  setActiveSection: (section) => set({ activeSection: section }),
  chartConfig: { ...defaultChartConfig },
  setChartConfig: (config) =>
    set((state) => ({
      chartConfig: { ...state.chartConfig, ...config },
    })),
  resetChartConfig: () => set({ chartConfig: { ...defaultChartConfig } }),
}));
