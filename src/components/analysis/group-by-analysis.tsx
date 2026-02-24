"use client";

import { useMemo, useState, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getEffectiveType } from "@/lib/parsing/type-detector";
import { computeGroupBy } from "@/lib/analysis/group-by";
import { CHART_COLORS, CHART_COLORS_ALPHA } from "@/lib/constants";
import type { ColumnType, GroupByResult } from "@/types/data";

// Ensure chart.js components are registered
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const NUMERIC_TYPES: ColumnType[] = ["numeric", "percentage", "likert_scale"];
const CATEGORICAL_TYPES: ColumnType[] = ["categorical", "demographic", "likert_scale"];

function fmt(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}

export function GroupByAnalysis() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const { filteredRows } = useFilteredData();

  const [valueColumn, setValueColumn] = useState<string | null>(null);
  const [groupColumn, setGroupColumn] = useState<string | null>(null);

  const numericColumns = useMemo(
    () => columns.filter((c) => NUMERIC_TYPES.includes(getEffectiveType(c))),
    [columns]
  );

  const categoricalColumns = useMemo(
    () => columns.filter((c) => CATEGORICAL_TYPES.includes(getEffectiveType(c))),
    [columns]
  );

  const result = useMemo<GroupByResult | null>(() => {
    if (!valueColumn || !groupColumn || filteredRows.length === 0) return null;
    try {
      return computeGroupBy(filteredRows, groupColumn, valueColumn);
    } catch {
      return null;
    }
  }, [filteredRows, valueColumn, groupColumn]);

  const chartData = useMemo(() => {
    if (!result) return null;

    return {
      labels: result.groups.map((g) => g.label),
      datasets: [
        {
          label: `Mean of ${result.valueColumn}`,
          data: result.groups.map((g) => g.mean),
          backgroundColor: result.groups.map(
            (_, i) => CHART_COLORS_ALPHA[i % CHART_COLORS_ALPHA.length]
          ),
          borderColor: result.groups.map(
            (_, i) => CHART_COLORS[i % CHART_COLORS.length]
          ),
          borderWidth: 2,
        },
      ],
    };
  }, [result]);

  if (!isLoaded) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Load a dataset to perform group-by analysis
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
            <Layers className="h-4 w-4 text-accent-blue" />
            Group By Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Value Column (numeric) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Value Column (numeric)
              </label>
              <Select
                value={valueColumn ?? ""}
                onValueChange={(value) => setValueColumn(value || null)}
              >
                <SelectTrigger className="bg-surface-raised border-border">
                  <SelectValue placeholder="Select numeric column" />
                </SelectTrigger>
                <SelectContent>
                  {numericColumns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {numericColumns.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No numeric columns available
                </p>
              )}
            </div>

            {/* Group Column (categorical) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Group Column (categorical)
              </label>
              <Select
                value={groupColumn ?? ""}
                onValueChange={(value) => setGroupColumn(value || null)}
              >
                <SelectTrigger className="bg-surface-raised border-border">
                  <SelectValue placeholder="Select categorical column" />
                </SelectTrigger>
                <SelectContent>
                  {categoricalColumns.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoricalColumns.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No categorical columns available
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!valueColumn || !groupColumn ? (
        <Card className="bg-surface border-border">
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Select both value and group columns to begin analysis
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !result ? (
        <Card className="bg-surface border-border">
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Unable to compute group-by analysis for the selected columns
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Chart */}
          {chartData && (
            <Card className="bg-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Mean of {result.valueColumn} by {result.groupColumn}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        x: {
                          ticks: { color: "#8899b4" },
                          grid: { color: "#2a355520" },
                        },
                        y: {
                          ticks: { color: "#8899b4" },
                          grid: { color: "#2a355520" },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">
                Group Statistics
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {result.groups.length} groups
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="bg-surface-raised text-xs text-muted-foreground">
                          {result.groupColumn}
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
                          Min
                        </TableHead>
                        <TableHead className="bg-surface-raised text-right text-xs text-muted-foreground">
                          Max
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.groups.map((group) => (
                        <TableRow
                          key={group.label}
                          className="border-border hover:bg-surface-raised/50"
                        >
                          <TableCell className="font-medium text-foreground">
                            {group.label}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">
                            {group.count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">
                            {fmt(group.mean)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">
                            {fmt(group.median)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">
                            {fmt(group.min)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-foreground">
                            {fmt(group.max)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
