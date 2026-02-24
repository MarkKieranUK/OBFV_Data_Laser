"use client";

import { useMemo } from "react";
import { useDatasetStore } from "@/stores/dataset-store";
import type { ActiveFilter } from "@/types/data";

function applyFilter(
  row: Record<string, unknown>,
  filter: ActiveFilter
): boolean {
  const value = row[filter.column];

  switch (filter.type) {
    case "equals":
      return String(value) === String(filter.value);

    case "contains": {
      if (value === null || value === undefined) return false;
      return String(value)
        .toLowerCase()
        .includes(String(filter.value).toLowerCase());
    }

    case "range": {
      const [min, max] = filter.value as [number, number];
      const num = Number(value);
      if (isNaN(num)) return false;
      return num >= min && num <= max;
    }

    case "in": {
      const allowed = filter.value as string[];
      return allowed.includes(String(value));
    }

    case "dateRange": {
      const [startStr, endStr] = filter.value as [string, string];
      const dateVal = new Date(String(value));
      if (isNaN(dateVal.getTime())) return false;
      const start = new Date(startStr);
      const end = new Date(endStr);
      return dateVal >= start && dateVal <= end;
    }

    default:
      return true;
  }
}

export function useFilteredData() {
  const rows = useDatasetStore((s) => s.rows);
  const activeFilters = useDatasetStore((s) => s.activeFilters);

  const filteredRows = useMemo(() => {
    if (activeFilters.length === 0) return rows;
    return rows.filter((row) =>
      activeFilters.every((filter) => applyFilter(row, filter))
    );
  }, [rows, activeFilters]);

  return { filteredRows, totalRows: rows.length, filteredCount: filteredRows.length };
}
