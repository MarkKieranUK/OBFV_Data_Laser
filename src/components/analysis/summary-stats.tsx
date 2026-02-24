"use client";

import { useMemo } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDatasetStore } from "@/stores/dataset-store";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { computeAllStats } from "@/lib/analysis/statistics";
import type { ColumnStats } from "@/types/data";

function fmt(value: number | unknown): string {
  if (value === null || value === undefined) return "--";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toFixed(2);
}

export function SummaryStats() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const { filteredRows } = useFilteredData();

  const stats = useMemo<ColumnStats[]>(() => {
    if (!isLoaded || filteredRows.length === 0 || columns.length === 0) return [];
    try {
      return computeAllStats(filteredRows, columns);
    } catch {
      return [];
    }
  }, [filteredRows, columns, isLoaded]);

  if (!isLoaded) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Load a dataset to view summary statistics
          </p>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Calculator className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No numeric columns found for statistical analysis
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Summary statistics require at least one numeric column
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Calculator className="h-4 w-4 text-accent-blue" />
          Summary Statistics
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {stats.length} {stats.length === 1 ? "column" : "columns"}
        </Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="bg-surface-raised text-xs text-muted-foreground">
                    Column
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Count
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Mean
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Median
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Mode
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Std Dev
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Min
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Max
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Q1
                  </TableHead>
                  <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                    Q3
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow
                    key={stat.column}
                    className="border-border hover:bg-surface-raised/50"
                  >
                    <TableCell className="font-medium text-foreground">
                      {stat.column}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {stat.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.mean)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.median)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.mode)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.stdDev)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.min)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.max)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.q1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmt(stat.q3)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
