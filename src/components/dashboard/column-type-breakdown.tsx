"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDatasetStore } from "@/stores/dataset-store";
import { getEffectiveType } from "@/lib/parsing/type-detector";
import {
  COLUMN_TYPE_LABELS,
  COLUMN_TYPE_COLORS,
} from "@/lib/constants";
import type { ColumnType } from "@/types/data";

export function ColumnTypeBreakdown() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);

  const breakdown = useMemo(() => {
    const counts: Partial<Record<ColumnType, number>> = {};
    for (const col of columns) {
      const type = getEffectiveType(col);
      counts[type] = (counts[type] || 0) + 1;
    }

    return (Object.entries(counts) as [ColumnType, number][])
      .sort((a, b) => b[1] - a[1]);
  }, [columns]);

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4 text-accent-blue" />
          Column Type Breakdown
        </CardTitle>
        {isLoaded && (
          <span className="text-xs text-muted-foreground">
            {columns.length} columns
          </span>
        )}
      </CardHeader>
      <CardContent>
        {!isLoaded ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Load a dataset to see column types
          </p>
        ) : breakdown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No columns detected
          </p>
        ) : (
          <div className="space-y-3">
            {breakdown.map(([type, count]) => {
              const color = COLUMN_TYPE_COLORS[type];
              const label = COLUMN_TYPE_LABELS[type];
              const percentage = Math.round((count / columns.length) * 100);

              return (
                <div key={type}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Column list */}
            <div className="mt-4 space-y-1 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                All Columns
              </p>
              {columns.map((col) => {
                const type = getEffectiveType(col);
                const color = COLUMN_TYPE_COLORS[type];
                const label = COLUMN_TYPE_LABELS[type];

                return (
                  <div
                    key={col.name}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-surface-raised"
                  >
                    <span className="truncate text-foreground">{col.name}</span>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
