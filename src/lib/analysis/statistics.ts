import type { ColumnStats, ColumnMeta } from "@/types/data";

/**
 * Extract numeric values from a column, parsing percentage strings like "45%"
 * into their numeric equivalents (45). Skips null, undefined, empty strings,
 * and non-parseable values.
 */
export function getNumericValues(
  rows: Record<string, unknown>[],
  column: string
): number[] {
  const values: number[] = [];

  for (const row of rows) {
    const raw = row[column];

    if (raw === null || raw === undefined || raw === "") {
      continue;
    }

    if (typeof raw === "number" && !isNaN(raw)) {
      values.push(raw);
      continue;
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed === "") continue;

      // Handle percentage strings like "45%", "12.5%"
      const percentMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
      if (percentMatch) {
        values.push(parseFloat(percentMatch[1]));
        continue;
      }

      // Handle comma-separated numbers like "1,234" or "1,234.56"
      const cleaned = trimmed.replace(/,/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && isFinite(parsed)) {
        values.push(parsed);
      }
    }
  }

  return values;
}

/**
 * Compute the median of a sorted array of numbers.
 */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute the mode (most frequently occurring value) of an array of numbers.
 * Returns the smallest mode if there are ties.
 */
function mode(values: number[]): number | null {
  if (values.length === 0) return null;

  const freq = new Map<number, number>();
  let maxCount = 0;

  for (const v of values) {
    const count = (freq.get(v) ?? 0) + 1;
    freq.set(v, count);
    if (count > maxCount) maxCount = count;
  }

  // If every value appears the same number of times, there is no mode
  if (maxCount === 1) return null;

  const modes: number[] = [];
  for (const [val, count] of freq) {
    if (count === maxCount) modes.push(val);
  }

  modes.sort((a, b) => a - b);
  return modes[0];
}

/**
 * Compute descriptive statistics for a single numeric column.
 * Returns a ColumnStats object with count, mean, median, mode, stdDev,
 * min, max, q1, and q3.
 */
export function computeColumnStats(
  rows: Record<string, unknown>[],
  column: string
): ColumnStats {
  const values = getNumericValues(rows, column);

  if (values.length === 0) {
    return {
      column,
      count: 0,
      mean: 0,
      median: 0,
      mode: null,
      stdDev: 0,
      min: 0,
      max: 0,
      q1: 0,
      q3: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  // Standard deviation (population)
  const variance =
    sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  // Quartiles: split sorted array into lower and upper halves
  const mid = Math.floor(count / 2);
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = count % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  return {
    column,
    count,
    mean,
    median: median(sorted),
    mode: mode(values),
    stdDev,
    min: sorted[0],
    max: sorted[count - 1],
    q1: median(lowerHalf),
    q3: median(upperHalf),
  };
}

/**
 * Compute descriptive statistics for all numeric and percentage columns.
 * Filters the provided column metadata to only those with numeric or
 * percentage detected types.
 */
export function computeAllStats(
  rows: Record<string, unknown>[],
  columns: ColumnMeta[]
): ColumnStats[] {
  const numericColumns = columns.filter((col) => {
    const effectiveType = col.overriddenType ?? col.detectedType;
    return effectiveType === "numeric" || effectiveType === "percentage";
  });

  return numericColumns.map((col) => computeColumnStats(rows, col.name));
}

/**
 * Compute the Pearson correlation coefficient between two numeric columns.
 * Only considers rows where both columns have valid numeric values.
 * Returns 0 if fewer than 2 paired values exist or if either column
 * has zero variance.
 */
export function computeCorrelation(
  rows: Record<string, unknown>[],
  colA: string,
  colB: string
): number {
  // Build paired values where both columns are valid numbers
  const pairs: [number, number][] = [];

  for (const row of rows) {
    const rawA = row[colA];
    const rawB = row[colB];

    const a = parseNumericValue(rawA);
    const b = parseNumericValue(rawB);

    if (a !== null && b !== null) {
      pairs.push([a, b]);
    }
  }

  if (pairs.length < 2) return 0;

  const n = pairs.length;
  let sumA = 0;
  let sumB = 0;

  for (const [a, b] of pairs) {
    sumA += a;
    sumB += b;
  }

  const meanA = sumA / n;
  const meanB = sumB / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (const [a, b] of pairs) {
    const diffA = a - meanA;
    const diffB = b - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }

  const denominator = Math.sqrt(denomA * denomB);

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Parse a single value into a number, handling percentages and commas.
 * Returns null if the value cannot be parsed.
 */
function parseNumericValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (typeof raw === "number") {
    return isNaN(raw) ? null : raw;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;

    const percentMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
    if (percentMatch) return parseFloat(percentMatch[1]);

    const cleaned = trimmed.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
  }

  return null;
}
