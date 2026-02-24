"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useDatasetStore } from "@/stores/dataset-store";
import { useUIStore } from "@/stores/ui-store";

// Lazy-loaded section components (will be created in later steps)
import { OverviewSection } from "@/components/dashboard/overview-section";
import { DataTableSection } from "@/components/data-table/data-table-section";
import { ChartBuilderSection } from "@/components/analysis/chart-builder-section";
import { CrossTabSection } from "@/components/analysis/cross-tab-section";
import { SummaryStatsSection } from "@/components/analysis/summary-stats-section";
import { GroupBySection } from "@/components/analysis/group-by-section";

const SECTION_COMPONENTS = {
  overview: OverviewSection,
  table: DataTableSection,
  charts: ChartBuilderSection,
  crosstab: CrossTabSection,
  stats: SummaryStatsSection,
  groupby: GroupBySection,
} as const;

export default function DashboardPage() {
  const router = useRouter();
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const activeSection = useUIStore((s) => s.activeSection);

  useEffect(() => {
    if (!isLoaded) {
      router.push("/");
    }
  }, [isLoaded, router]);

  if (!isLoaded) return null;

  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <SidebarNav />
        <main className="flex-1 overflow-auto p-6">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
