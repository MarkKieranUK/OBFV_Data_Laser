"use client";

import { useMemo } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDatasetStore } from "@/stores/dataset-store";
import { useUIStore } from "@/stores/ui-store";
import { getEffectiveType } from "@/lib/parsing/type-detector";
import { CHART_TYPE_LABELS } from "@/lib/constants";
import type { ChartType, ColumnType } from "@/types/data";

const NUMERIC_TYPES: ColumnType[] = ["numeric", "percentage", "likert_scale"];
const CATEGORICAL_TYPES: ColumnType[] = ["categorical", "demographic", "likert_scale"];

export function ChartBuilder() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const chartConfig = useUIStore((s) => s.chartConfig);
  const setChartConfig = useUIStore((s) => s.setChartConfig);
  const resetChartConfig = useUIStore((s) => s.resetChartConfig);

  const allColumns = useMemo(
    () => columns.map((c) => ({ name: c.name, type: getEffectiveType(c) })),
    [columns]
  );

  const numericColumns = useMemo(
    () => allColumns.filter((c) => NUMERIC_TYPES.includes(c.type)),
    [allColumns]
  );

  const categoricalColumns = useMemo(
    () => allColumns.filter((c) => CATEGORICAL_TYPES.includes(c.type)),
    [allColumns]
  );

  const chartTypes = Object.entries(CHART_TYPE_LABELS) as [ChartType, string][];

  if (!isLoaded) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Load a dataset to configure charts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4 text-accent-blue" />
          Chart Configuration
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetChartConfig}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Chart Type
          </label>
          <Select
            value={chartConfig.chartType}
            onValueChange={(value) =>
              setChartConfig({ chartType: value as ChartType })
            }
          >
            <SelectTrigger className="bg-surface-raised border-border">
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              {chartTypes.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-border" />

        {/* X Axis */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            X Axis
          </label>
          <Select
            value={chartConfig.xColumn ?? ""}
            onValueChange={(value) =>
              setChartConfig({ xColumn: value || null })
            }
          >
            <SelectTrigger className="bg-surface-raised border-border">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {allColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Y Axis */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Y Axis
          </label>
          <Select
            value={chartConfig.yColumn ?? ""}
            onValueChange={(value) =>
              setChartConfig({ yColumn: value || null })
            }
          >
            <SelectTrigger className="bg-surface-raised border-border">
              <SelectValue placeholder="Select column or Count" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__count__">Count (frequency)</SelectItem>
              {numericColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-border" />

        {/* Group By */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Group By (optional)
          </label>
          <Select
            value={chartConfig.groupByColumn ?? "__none__"}
            onValueChange={(value) =>
              setChartConfig({
                groupByColumn: value === "__none__" ? null : value,
              })
            }
          >
            <SelectTrigger className="bg-surface-raised border-border">
              <SelectValue placeholder="No grouping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No grouping</SelectItem>
              {categoricalColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current config summary */}
        {chartConfig.xColumn && (
          <>
            <Separator className="bg-border" />
            <div className="rounded-md bg-surface-raised p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">X:</span>{" "}
                {chartConfig.xColumn}
              </p>
              <p>
                <span className="font-medium text-foreground">Y:</span>{" "}
                {chartConfig.yColumn === "__count__" || !chartConfig.yColumn
                  ? "Count"
                  : chartConfig.yColumn}
              </p>
              {chartConfig.groupByColumn && (
                <p>
                  <span className="font-medium text-foreground">Group:</span>{" "}
                  {chartConfig.groupByColumn}
                </p>
              )}
              <p>
                <span className="font-medium text-foreground">Type:</span>{" "}
                {CHART_TYPE_LABELS[chartConfig.chartType]}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
