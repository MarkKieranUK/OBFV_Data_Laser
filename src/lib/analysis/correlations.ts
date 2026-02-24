import { computeCorrelation } from "@/lib/analysis/statistics";

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  r: number;
}

/**
 * Compute a Pearson correlation matrix for all pairs of the given numeric columns.
 *
 * The resulting matrix is symmetric with 1.0 on the diagonal.
 * Returns an empty matrix if fewer than 2 columns are provided.
 */
export function computeCorrelationMatrix(
  rows: Record<string, unknown>[],
  numericColumns: string[]
): CorrelationMatrix {
  if (numericColumns.length === 0) {
    return { columns: [], matrix: [] };
  }

  if (numericColumns.length === 1) {
    return { columns: [...numericColumns], matrix: [[1]] };
  }

  const n = numericColumns.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  for (let i = 0; i < n; i++) {
    // Diagonal is always 1
    matrix[i][i] = 1;

    for (let j = i + 1; j < n; j++) {
      const r = computeCorrelation(rows, numericColumns[i], numericColumns[j]);
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }

  return {
    columns: [...numericColumns],
    matrix,
  };
}

/**
 * Extract the top N strongest correlations (by absolute value) from a
 * correlation matrix, excluding self-correlations (the diagonal).
 *
 * Each unique pair is returned only once (i.e., (A,B) but not also (B,A)).
 * Results are sorted by |r| in descending order.
 */
export function getStrongestCorrelations(
  matrix: number[][],
  columns: string[],
  topN: number = 10
): CorrelationPair[] {
  if (columns.length < 2 || matrix.length < 2) {
    return [];
  }

  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const r = matrix[i]?.[j] ?? 0;
      pairs.push({
        colA: columns[i],
        colB: columns[j],
        r,
      });
    }
  }

  // Sort by absolute correlation, descending
  pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return pairs.slice(0, topN);
}
