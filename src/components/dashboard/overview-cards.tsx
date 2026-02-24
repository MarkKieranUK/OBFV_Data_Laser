"use client";

import { useMemo } from "react";
import {
  FileSpreadsheet,
  Rows3,
  Columns3,
  ShieldCheck,
  Hash,
  Tag,
  Calendar,
  Type,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDatasetStore } from "@/stores/dataset-store";
import { getEffectiveType } from "@/lib/parsing/type-detector";
import type { ColumnType } from "@/types/data";

export function OverviewCards() {
  const fileName = useDatasetStore((s) => s.fileName);
  const rows = useDatasetStore((s) => s.rows);
  const columns = useDatasetStore((s) => s.columns);
  const rowCount = useDatasetStore((s) => s.rowCount);
  const isLoaded = useDatasetStore((s) => s.isLoaded);

  const qualityScore = useMemo(() => {
    if (columns.length === 0 || rowCount === 0) return 0;
    const totalCells = columns.length * rowCount;
    const missingCells = columns.reduce((sum, col) => sum + col.missingCount, 0);
    return Math.round(((totalCells - missingCells) / totalCells) * 100);
  }, [columns, rowCount]);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<ColumnType, number>> = {};
    for (const col of columns) {
      const type = getEffectiveType(col);
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [columns]);

  const numericCount = typeCounts.numeric || 0;
  const categoricalCount = (typeCounts.categorical || 0) + (typeCounts.demographic || 0);
  const dateCount = typeCounts.date || 0;
  const textCount = typeCounts.text || 0;
  const percentageCount = typeCounts.percentage || 0;
  const likertCount = typeCounts.likert_scale || 0;

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-surface border-border">
            <CardContent className="flex h-28 items-center justify-center">
              <p className="text-sm text-muted-foreground">No data loaded</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Dataset Info */}
      <Card className="bg-surface border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Dataset
          </CardTitle>
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="truncate text-lg font-semibold text-foreground" title={fileName ?? ""}>
            {fileName ?? "Untitled"}
          </p>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Rows3 className="h-3.5 w-3.5" />
              {rowCount.toLocaleString()} rows
            </span>
            <span className="flex items-center gap-1">
              <Columns3 className="h-3.5 w-3.5" />
              {columns.length} cols
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Score */}
      <Card className="bg-surface border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Data Quality
          </CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{qualityScore}%</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {qualityScore >= 95
              ? "Excellent completeness"
              : qualityScore >= 80
                ? "Good completeness"
                : qualityScore >= 60
                  ? "Some missing data"
                  : "Significant gaps"}
          </p>
        </CardContent>
      </Card>

      {/* Column Types Summary */}
      <Card className="bg-surface border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Column Types
          </CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{columns.length}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {numericCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {numericCount} numeric
              </Badge>
            )}
            {categoricalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {categoricalCount} categorical
              </Badge>
            )}
            {dateCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {dateCount} date
              </Badge>
            )}
            {textCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {textCount} text
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Numbers */}
      <Card className="bg-surface border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Key Numbers
          </CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3 w-3" /> Numeric
              </span>
              <span className="font-medium text-foreground">{numericCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="h-3 w-3" /> Categorical
              </span>
              <span className="font-medium text-foreground">{categoricalCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" /> Date
              </span>
              <span className="font-medium text-foreground">{dateCount}</span>
            </div>
            {(percentageCount > 0 || likertCount > 0) && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Type className="h-3 w-3" /> Other
                </span>
                <span className="font-medium text-foreground">
                  {percentageCount + likertCount}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
