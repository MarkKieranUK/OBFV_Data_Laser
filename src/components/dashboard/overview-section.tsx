"use client";

import { OverviewCards } from "./overview-cards";
import { KeyInsights } from "./key-insights";
import { DataQualityWarnings } from "./data-quality-warnings";
import { ColumnTypeBreakdown } from "./column-type-breakdown";

export function OverviewSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard Overview</h2>
      <OverviewCards />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <KeyInsights />
        <ColumnTypeBreakdown />
      </div>
      <DataQualityWarnings />
    </div>
  );
}
