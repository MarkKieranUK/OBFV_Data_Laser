import type { ColumnMeta, Insight } from "@/types/data";
import { getNumericValues, computeColumnStats } from "@/lib/analysis/statistics";
import {
  computeCorrelationMatrix,
  getStrongestCorrelations,
} from "@/lib/analysis/correlations";

/**
 * Automatically generate data quality and statistical insights from a dataset.
 *
 * Detects:
 * - Columns with high missing data (>10%) as quality warnings
 * - Strong correlations (|r| > 0.7) between numeric columns
 * - Highly skewed distributions in numeric columns
 * - Categorical columns where one value dominates (>60%)
 * - Small total sample size (<50 rows) as a quality warning
 */
export function generateInsights(
  rows: Record<string, unknown>[],
  columns: ColumnMeta[]
): Insight[] {
  const insights: Insight[] = [];

  if (rows.length === 0) {
    insights.push({
      type: "quality",
      title: "No data available",
      description: "The dataset contains no rows. Analysis cannot be performed.",
      severity: "warning",
    });
    return insights;
  }

  // --- Small sample size warning ---
  if (rows.length < 50) {
    insights.push({
      type: "quality",
      title: "Small sample size",
      description: `The dataset contains only ${rows.length} rows. Statistical results may not be reliable with fewer than 50 observations.`,
      severity: "warning",
    });
  }

  // --- High missing data ---
  for (const col of columns) {
    if (col.missingPercent > 10) {
      insights.push({
        type: "quality",
        title: `High missing data: ${col.name}`,
        description: `Column "${col.name}" has ${col.missingPercent.toFixed(1)}% missing values (${col.missingCount} of ${rows.length} rows). This may affect analysis reliability.`,
        severity: col.missingPercent > 30 ? "warning" : "notable",
      });
    }
  }

  // --- Correlation analysis ---
  const numericColumns = columns.filter((col) => {
    const effectiveType = col.overriddenType ?? col.detectedType;
    return effectiveType === "numeric" || effectiveType === "percentage";
  });

  if (numericColumns.length >= 2) {
    const numericNames = numericColumns.map((c) => c.name);
    const { matrix } = computeCorrelationMatrix(rows, numericNames);
    const strongCorrelations = getStrongestCorrelations(
      matrix,
      numericNames,
      20
    ).filter((pair) => Math.abs(pair.r) > 0.7);

    for (const { colA, colB, r } of strongCorrelations) {
      const direction = r > 0 ? "positive" : "negative";
      const strength = Math.abs(r) > 0.9 ? "very strong" : "strong";

      insights.push({
        type: "correlation",
        title: `${strength} ${direction} correlation`,
        description: `"${colA}" and "${colB}" have a ${strength} ${direction} correlation (r = ${r.toFixed(3)}). Changes in one variable are closely associated with changes in the other.`,
        severity: Math.abs(r) > 0.9 ? "notable" : "info",
      });
    }
  }

  // --- Skewed distributions ---
  for (const col of numericColumns) {
    const stats = computeColumnStats(rows, col.name);

    if (stats.count < 3 || stats.stdDev === 0) continue;

    // Pearson's skewness coefficient: 3 * (mean - median) / stdDev
    const skewness = (3 * (stats.mean - stats.median)) / stats.stdDev;

    if (Math.abs(skewness) > 1) {
      const direction = skewness > 0 ? "right (positively)" : "left (negatively)";

      insights.push({
        type: "distribution",
        title: `Skewed distribution: ${col.name}`,
        description: `Column "${col.name}" is skewed ${direction} (skewness coefficient: ${skewness.toFixed(2)}). The mean (${stats.mean.toFixed(2)}) differs notably from the median (${stats.median.toFixed(2)}). Consider using the median for central tendency.`,
        severity: "info",
      });
    }
  }

  // --- Outlier detection via IQR ---
  for (const col of numericColumns) {
    const stats = computeColumnStats(rows, col.name);

    if (stats.count < 4) continue;

    const iqr = stats.q3 - stats.q1;
    if (iqr === 0) continue;

    const lowerFence = stats.q1 - 1.5 * iqr;
    const upperFence = stats.q3 + 1.5 * iqr;

    const values = getNumericValues(rows, col.name);
    const outlierCount = values.filter(
      (v) => v < lowerFence || v > upperFence
    ).length;

    if (outlierCount > 0) {
      const outlierPercent = ((outlierCount / values.length) * 100).toFixed(1);

      insights.push({
        type: "outlier",
        title: `Outliers detected: ${col.name}`,
        description: `Column "${col.name}" has ${outlierCount} potential outlier${outlierCount === 1 ? "" : "s"} (${outlierPercent}% of values) outside the interquartile range [${lowerFence.toFixed(2)}, ${upperFence.toFixed(2)}].`,
        severity: parseFloat(outlierPercent) > 10 ? "warning" : "info",
      });
    }
  }

  // --- Dominant categorical values ---
  const categoricalColumns = columns.filter((col) => {
    const effectiveType = col.overriddenType ?? col.detectedType;
    return (
      effectiveType === "categorical" ||
      effectiveType === "demographic" ||
      effectiveType === "likert_scale"
    );
  });

  for (const col of categoricalColumns) {
    const freq = new Map<string, number>();
    let totalValid = 0;

    for (const row of rows) {
      const val = row[col.name];
      if (val === null || val === undefined || val === "") continue;

      const label = String(val).trim();
      if (label === "") continue;

      freq.set(label, (freq.get(label) ?? 0) + 1);
      totalValid++;
    }

    if (totalValid === 0) continue;

    // Find the most frequent value
    let maxLabel = "";
    let maxCount = 0;
    for (const [label, count] of freq) {
      if (count > maxCount) {
        maxCount = count;
        maxLabel = label;
      }
    }

    const dominancePercent = (maxCount / totalValid) * 100;

    if (dominancePercent > 60) {
      insights.push({
        type: "pattern",
        title: `Dominant value: ${col.name}`,
        description: `In column "${col.name}", the value "${maxLabel}" accounts for ${dominancePercent.toFixed(1)}% of responses (${maxCount} of ${totalValid}). This low variability may limit analytical usefulness.`,
        severity: dominancePercent > 80 ? "warning" : "notable",
      });
    }
  }

  return insights;
}
