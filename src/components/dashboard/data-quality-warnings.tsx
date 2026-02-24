"use client";

import { useMemo } from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDatasetStore } from "@/stores/dataset-store";
import { MIN_RELIABLE_SAMPLE } from "@/lib/constants";

interface QualityWarning {
  type: "missing" | "sample" | "parse";
  severity: "warning" | "error" | "info";
  message: string;
  detail?: string;
}

export function DataQualityWarnings() {
  const columns = useDatasetStore((s) => s.columns);
  const rowCount = useDatasetStore((s) => s.rowCount);
  const parseWarnings = useDatasetStore((s) => s.parseWarnings);
  const isLoaded = useDatasetStore((s) => s.isLoaded);

  const warnings = useMemo<QualityWarning[]>(() => {
    if (!isLoaded) return [];

    const result: QualityWarning[] = [];

    // Columns with >5% missing data
    for (const col of columns) {
      if (col.missingPercent > 5) {
        result.push({
          type: "missing",
          severity: col.missingPercent > 25 ? "error" : "warning",
          message: `"${col.name}" has ${col.missingPercent.toFixed(1)}% missing data`,
          detail: `${col.missingCount.toLocaleString()} of ${rowCount.toLocaleString()} values are empty`,
        });
      }
    }

    // Small sample size warning
    if (rowCount > 0 && rowCount < MIN_RELIABLE_SAMPLE) {
      result.push({
        type: "sample",
        severity: "warning",
        message: `Small sample size: only ${rowCount} rows`,
        detail: `Results may not be statistically reliable with fewer than ${MIN_RELIABLE_SAMPLE} observations`,
      });
    }

    // Parse warnings from the store
    for (const warning of parseWarnings) {
      result.push({
        type: "parse",
        severity: "info",
        message: warning,
      });
    }

    return result;
  }, [columns, rowCount, parseWarnings, isLoaded]);

  const severityIcon = (severity: QualityWarning["severity"]) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />;
      case "warning":
        return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />;
      case "info":
        return <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" />;
    }
  };

  const severityBg = (severity: QualityWarning["severity"]) => {
    switch (severity) {
      case "error":
        return "bg-error/5 border-error/20";
      case "warning":
        return "bg-warning/5 border-warning/20";
      case "info":
        return "bg-accent-blue/5 border-accent-blue/20";
    }
  };

  if (!isLoaded) {
    return null;
  }

  if (warnings.length === 0) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex items-center gap-2 py-4">
          <div className="rounded-full bg-success/10 p-1.5">
            <Info className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            No data quality issues detected
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Data Quality Warnings
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {warnings.length} {warnings.length === 1 ? "issue" : "issues"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div
              key={`${warning.type}-${index}`}
              className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 ${severityBg(warning.severity)}`}
            >
              {severityIcon(warning.severity)}
              <div className="min-w-0">
                <p className="text-sm text-foreground">{warning.message}</p>
                {warning.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {warning.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
