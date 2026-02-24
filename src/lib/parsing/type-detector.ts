import type { ColumnMeta, ColumnType, ParseResult } from "@/types/data";
import {
  TYPE_DETECTION_SAMPLE_SIZE,
  CATEGORICAL_MAX_UNIQUE,
  CATEGORICAL_MAX_RATIO,
  DEMOGRAPHIC_KEYWORDS,
  LIKERT_PATTERNS,
} from "@/lib/constants";

function sampleRows(
  rows: Record<string, unknown>[],
  maxSample: number
): Record<string, unknown>[] {
  if (rows.length <= maxSample) return rows;
  const step = Math.floor(rows.length / maxSample);
  const sampled: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length && sampled.length < maxSample; i += step) {
    sampled.push(rows[i]!);
  }
  return sampled;
}

function getNonNullValues(
  rows: Record<string, unknown>[],
  column: string
): unknown[] {
  return rows
    .map((row) => row[column])
    .filter((v) => v !== null && v !== undefined && v !== "");
}

function isDateValue(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (typeof value !== "string") return false;
  const str = value.trim();
  // ISO date, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return !isNaN(Date.parse(str));
  if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(str)) return !isNaN(Date.parse(str));
  return false;
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;
  const str = value.trim().replace(/[,%£$€]/g, "");
  return str !== "" && !isNaN(Number(str));
}

function isPercentageValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^\s*-?\d+(\.\d+)?\s*%\s*$/.test(value);
}

function isDemographicColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase();
  return DEMOGRAPHIC_KEYWORDS.some(
    (kw) => lower.includes(kw) || lower === kw
  );
}

function isLikertColumn(values: unknown[]): boolean {
  const stringValues = values
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.toLowerCase().trim());

  if (stringValues.length === 0) return false;

  const uniqueStrings = [...new Set(stringValues)];

  // Check against known Likert patterns
  for (const pattern of LIKERT_PATTERNS) {
    const matches = uniqueStrings.filter((v) =>
      pattern.some((p) => v.includes(p))
    );
    if (matches.length >= 3) return true;
  }

  // Check for numeric 1-5 or 1-7 scale
  const numericValues = values.filter(
    (v): v is number => typeof v === "number"
  );
  if (numericValues.length > 0) {
    const unique = [...new Set(numericValues)].sort((a, b) => a - b);
    if (
      unique.length >= 3 &&
      unique.length <= 7 &&
      unique[0] === 1 &&
      (unique[unique.length - 1] === 5 || unique[unique.length - 1] === 7)
    ) {
      return true;
    }
  }

  return false;
}

function detectColumnType(
  columnName: string,
  values: unknown[],
  totalRows: number
): ColumnType {
  if (values.length === 0) return "text";

  const threshold = 0.9;

  // Check percentage first (before numeric, since "45%" is also numeric)
  const percentCount = values.filter(isPercentageValue).length;
  if (percentCount / values.length >= threshold) return "percentage";

  // Check date
  const dateCount = values.filter(isDateValue).length;
  if (dateCount / values.length >= threshold) return "date";

  // Check numeric
  const numericCount = values.filter(isNumericValue).length;
  if (numericCount / values.length >= threshold) {
    // Could be Likert scale
    if (isLikertColumn(values)) return "likert_scale";
    return "numeric";
  }

  // Check Likert (string-based)
  if (isLikertColumn(values)) return "likert_scale";

  // Check demographic
  if (isDemographicColumn(columnName)) return "demographic";

  // Check categorical
  const uniqueCount = new Set(values.map((v) => String(v).trim())).size;
  if (
    uniqueCount <= CATEGORICAL_MAX_UNIQUE &&
    uniqueCount / totalRows <= CATEGORICAL_MAX_RATIO
  ) {
    return "categorical";
  }

  return "text";
}

export function detectColumnTypes(parseResult: ParseResult): ColumnMeta[] {
  const { rows, headers } = parseResult;
  const sampled = sampleRows(rows, TYPE_DETECTION_SAMPLE_SIZE);

  return headers.map((header) => {
    const allValues = rows.map((row) => row[header]);
    const nonNull = getNonNullValues(sampled, header);
    const missingCount = allValues.filter(
      (v) => v === null || v === undefined || v === ""
    ).length;
    const uniqueValues = new Set(
      getNonNullValues(rows, header).map((v) => String(v).trim())
    ).size;

    const detectedType = detectColumnType(header, nonNull, rows.length);

    return {
      name: header,
      detectedType,
      overriddenType: null,
      uniqueValues,
      missingCount,
      missingPercent: rows.length > 0 ? (missingCount / rows.length) * 100 : 0,
      sampleValues: nonNull.slice(0, 5),
    };
  });
}

export function getEffectiveType(column: ColumnMeta): ColumnType {
  return column.overriddenType ?? column.detectedType;
}
