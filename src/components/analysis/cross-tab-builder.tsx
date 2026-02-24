"use client";

import { useMemo, useState } from "react";
import { Grid3X3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDatasetStore } from "@/stores/dataset-store";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { getEffectiveType } from "@/lib/parsing/type-detector";
import { computeCrossTab } from "@/lib/analysis/cross-tab";
import type { ColumnType, CrossTabResult } from "@/types/data";

const CROSSTAB_TYPES: ColumnType[] = ["categorical", "demographic", "likert_scale"];

export function CrossTabBuilder() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const { filteredRows } = useFilteredData();

  const [rowVariable, setRowVariable] = useState<string | null>(null);
  const [colVariable, setColVariable] = useState<string | null>(null);

  const eligibleColumns = useMemo(
    () =>
      columns.filter((c) => CROSSTAB_TYPES.includes(getEffectiveType(c))),
    [columns]
  );

  const result = useMemo<CrossTabResult | null>(() => {
    if (!rowVariable || !colVariable || filteredRows.length === 0) return null;
    try {
      return computeCrossTab(filteredRows, rowVariable, colVariable);
    } catch {
      return null;
    }
  }, [filteredRows, rowVariable, colVariable]);

  if (!isLoaded) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Load a dataset to build cross-tabulations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Configuration */}
      <Card className="bg-surface border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Grid3X3 className="h-4 w-4 text-accent-blue" />
            Cross-Tabulation Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Row Variable */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Row Variable
              </label>
              <Select
                value={rowVariable ?? ""}
                onValueChange={(value) => setRowVariable(value || null)}
              >
                <SelectTrigger className="bg-surface-raised border-border">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleColumns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column Variable */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Column Variable
              </label>
              <Select
                value={colVariable ?? ""}
                onValueChange={(value) => setColVariable(value || null)}
              >
                <SelectTrigger className="bg-surface-raised border-border">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleColumns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {eligibleColumns.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              No categorical or demographic columns available for cross-tabulation
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {!rowVariable || !colVariable ? (
        <Card className="bg-surface border-border">
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <Grid3X3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Select both row and column variables to generate cross-tabulation
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !result ? (
        <Card className="bg-surface border-border">
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Unable to compute cross-tabulation for the selected columns
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">
              {result.rowVariable} &times; {result.colVariable}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {result.grandTotal.toLocaleString()} observations
            </Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-max">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-border bg-surface-raised px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {result.rowVariable} \ {result.colVariable}
                      </th>
                      {result.colLabels.map((label) => (
                        <th
                          key={label}
                          className="border border-border bg-surface-raised px-3 py-2 text-right text-xs font-medium text-muted-foreground"
                        >
                          {label}
                        </th>
                      ))}
                      <th className="border border-border bg-surface-raised px-3 py-2 text-right text-xs font-semibold text-foreground">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rowLabels.map((rowLabel, rowIndex) => (
                      <tr key={rowLabel} className="hover:bg-surface-raised/50">
                        <td className="border border-border px-3 py-2 text-left font-medium text-foreground">
                          {rowLabel}
                        </td>
                        {result.counts[rowIndex].map((count, colIndex) => (
                          <td
                            key={colIndex}
                            className="border border-border px-3 py-2 text-right tabular-nums text-foreground"
                          >
                            {count.toLocaleString()}
                          </td>
                        ))}
                        <td className="border border-border bg-surface-raised/50 px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                          {result.rowTotals[rowIndex].toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {/* Column totals row */}
                    <tr className="bg-surface-raised/50 font-semibold">
                      <td className="border border-border px-3 py-2 text-left text-foreground">
                        Total
                      </td>
                      {result.colTotals.map((total, colIndex) => (
                        <td
                          key={colIndex}
                          className="border border-border px-3 py-2 text-right tabular-nums text-foreground"
                        >
                          {total.toLocaleString()}
                        </td>
                      ))}
                      <td className="border border-border bg-accent-red/10 px-3 py-2 text-right tabular-nums text-accent-red">
                        {result.grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
