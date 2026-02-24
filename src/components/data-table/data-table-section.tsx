"use client";

import { DataTable } from "./data-table";
import { FilterPanel } from "@/components/analysis/filter-panel";

export function DataTableSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Data Table</h2>
      <FilterPanel />
      <DataTable />
    </div>
  );
}
