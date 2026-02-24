import type { ColumnMeta } from "@/types/data";
import type { DatasetSummary, ColumnSummary } from "@/types/ai";
import { computeColumnStats } from "@/lib/analysis/statistics";

export function buildDatasetSummary(
  fileName: string,
  rows: Record<string, unknown>[],
  columns: ColumnMeta[]
): DatasetSummary {
  const columnSummaries: ColumnSummary[] = columns.map((col) => {
    const effectiveType = col.overriddenType ?? col.detectedType;
    const summary: ColumnSummary = {
      name: col.name,
      type: effectiveType,
      uniqueValues: col.uniqueValues,
      missingPercent: Math.round(col.missingPercent * 10) / 10,
    };

    if (effectiveType === "numeric" || effectiveType === "percentage") {
      const stats = computeColumnStats(rows, col.name);
      summary.stats = {
        mean: Math.round(stats.mean * 100) / 100,
        median: Math.round(stats.median * 100) / 100,
        min: stats.min,
        max: stats.max,
        stdDev: Math.round(stats.stdDev * 100) / 100,
      };
    }

    if (
      effectiveType === "categorical" ||
      effectiveType === "demographic" ||
      effectiveType === "likert_scale"
    ) {
      const freq = new Map<string, number>();
      for (const row of rows) {
        const val = row[col.name];
        if (val === null || val === undefined || val === "") continue;
        const label = String(val).trim();
        if (label) freq.set(label, (freq.get(label) ?? 0) + 1);
      }
      summary.topValues = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));
    }

    return summary;
  });

  return {
    fileName,
    rowCount: rows.length,
    columns: columnSummaries,
    sampleRows: rows.slice(0, 5),
  };
}
