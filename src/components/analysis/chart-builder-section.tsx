"use client";

import { ChartBuilder } from "./chart-builder";
import { ChartDisplay } from "./chart-display";

export function ChartBuilderSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Chart Builder</h2>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <ChartBuilder />
        </div>
        <div className="xl:col-span-2">
          <ChartDisplay />
        </div>
      </div>
    </div>
  );
}
