import type { GroupByResult } from "@/types/data";
import { getNumericValues } from "@/lib/analysis/statistics";

/**
 * Compute grouped descriptive statistics: group rows by a categorical column
 * and compute count, mean, median, min, and max for a numeric value column
 * within each group.
 *
 * Rows where the group column is null/undefined/empty are excluded.
 * Groups with zero valid numeric values still appear in the result with
 * count=0 and all stats set to 0.
 * Groups are sorted alphabetically by label.
 */
export function computeGroupBy(
  rows: Record<string, unknown>[],
  groupColumn: string,
  valueColumn: string
): GroupByResult {
  // Partition rows by group label
  const grouped = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const groupVal = row[groupColumn];

    if (groupVal === null || groupVal === undefined || groupVal === "") {
      continue;
    }

    const label = String(groupVal).trim();
    if (label === "") continue;

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(row);
  }

  // Sort group labels alphabetically
  const sortedLabels = Array.from(grouped.keys()).sort();

  const groups = sortedLabels.map((label) => {
    const groupRows = grouped.get(label)!;
    const values = getNumericValues(groupRows, valueColumn);

    if (values.length === 0) {
      return {
        label,
        count: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    const mid = Math.floor(count / 2);
    const median =
      count % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    return {
      label,
      count,
      mean,
      median,
      min: sorted[0],
      max: sorted[count - 1],
    };
  });

  return {
    groupColumn,
    valueColumn,
    groups,
  };
}
