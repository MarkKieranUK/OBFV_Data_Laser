export type ColumnType =
  | "numeric"
  | "categorical"
  | "date"
  | "text"
  | "percentage"
  | "likert_scale"
  | "demographic";

export interface ColumnMeta {
  name: string;
  detectedType: ColumnType;
  overriddenType: ColumnType | null;
  uniqueValues: number;
  missingCount: number;
  missingPercent: number;
  sampleValues: unknown[];
}

export interface ParseResult {
  rows: Record<string, unknown>[];
  headers: string[];
  rowCount: number;
  parseWarnings: string[];
}

export interface ActiveFilter {
  column: string;
  type: "equals" | "contains" | "range" | "in" | "dateRange";
  value: unknown;
}

export type ChartType =
  | "bar"
  | "horizontalBar"
  | "groupedBar"
  | "stackedBar"
  | "line"
  | "pie"
  | "doughnut"
  | "scatter";

export interface ChartConfig {
  xColumn: string | null;
  yColumn: string | null;
  groupByColumn: string | null;
  chartType: ChartType;
}

export interface DatasetInfo {
  fileName: string;
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
  rowCount: number;
  parseWarnings: string[];
}

export type DashboardSection =
  | "overview"
  | "table"
  | "charts"
  | "crosstab"
  | "stats"
  | "groupby";

export interface CrossTabResult {
  rowVariable: string;
  colVariable: string;
  rowLabels: string[];
  colLabels: string[];
  counts: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export interface GroupByResult {
  groupColumn: string;
  valueColumn: string;
  groups: {
    label: string;
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
  }[];
}

export interface ColumnStats {
  column: string;
  count: number;
  mean: number;
  median: number;
  mode: unknown;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
}

export interface Insight {
  type: "correlation" | "distribution" | "outlier" | "pattern" | "quality";
  title: string;
  description: string;
  severity: "info" | "warning" | "notable";
}
