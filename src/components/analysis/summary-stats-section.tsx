"use client";

import { SummaryStats } from "./summary-stats";

export function SummaryStatsSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Summary Statistics</h2>
      <SummaryStats />
    </div>
  );
}
