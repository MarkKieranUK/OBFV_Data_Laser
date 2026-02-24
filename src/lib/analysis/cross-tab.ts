import type { CrossTabResult } from "@/types/data";

/**
 * Compute a cross-tabulation (contingency table) between two categorical columns.
 *
 * Rows where either column value is null, undefined, or empty string are excluded.
 * Row and column labels are sorted alphabetically for consistent output.
 *
 * Returns a CrossTabResult with the count matrix, marginal totals, and grand total.
 */
export function computeCrossTab(
  rows: Record<string, unknown>[],
  rowColumn: string,
  colColumn: string
): CrossTabResult {
  // Collect unique labels and count co-occurrences
  const rowLabelSet = new Set<string>();
  const colLabelSet = new Set<string>();
  const countMap = new Map<string, number>();

  for (const row of rows) {
    const rowVal = row[rowColumn];
    const colVal = row[colColumn];

    if (
      rowVal === null ||
      rowVal === undefined ||
      rowVal === "" ||
      colVal === null ||
      colVal === undefined ||
      colVal === ""
    ) {
      continue;
    }

    const rowLabel = String(rowVal).trim();
    const colLabel = String(colVal).trim();

    if (rowLabel === "" || colLabel === "") continue;

    rowLabelSet.add(rowLabel);
    colLabelSet.add(colLabel);

    const key = `${rowLabel}\0${colLabel}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const rowLabels = Array.from(rowLabelSet).sort();
  const colLabels = Array.from(colLabelSet).sort();

  // Handle empty result
  if (rowLabels.length === 0 || colLabels.length === 0) {
    return {
      rowVariable: rowColumn,
      colVariable: colColumn,
      rowLabels: [],
      colLabels: [],
      counts: [],
      rowTotals: [],
      colTotals: [],
      grandTotal: 0,
    };
  }

  // Build the count matrix
  const counts: number[][] = [];
  const rowTotals: number[] = [];
  const colTotals: number[] = new Array(colLabels.length).fill(0);
  let grandTotal = 0;

  for (let r = 0; r < rowLabels.length; r++) {
    const rowCounts: number[] = [];
    let rowSum = 0;

    for (let c = 0; c < colLabels.length; c++) {
      const key = `${rowLabels[r]}\0${colLabels[c]}`;
      const count = countMap.get(key) ?? 0;
      rowCounts.push(count);
      rowSum += count;
      colTotals[c] += count;
    }

    counts.push(rowCounts);
    rowTotals.push(rowSum);
    grandTotal += rowSum;
  }

  return {
    rowVariable: rowColumn,
    colVariable: colColumn,
    rowLabels,
    colLabels,
    counts,
    rowTotals,
    colTotals,
    grandTotal,
  };
}
