import type { ColumnType, ChartType } from "@/types/data";

export const CHART_COLORS = [
  "#c0392b", // warm red
  "#2980b9", // steel blue
  "#27ae60", // green
  "#f39c12", // amber
  "#8e44ad", // purple
  "#16a085", // teal
  "#d35400", // burnt orange
  "#7f8c8d", // slate grey
] as const;

export const CHART_COLORS_ALPHA = CHART_COLORS.map((c) => `${c}cc`) as string[];

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  numeric: "Numeric",
  categorical: "Categorical",
  date: "Date",
  text: "Text",
  percentage: "Percentage",
  likert_scale: "Likert Scale",
  demographic: "Demographic",
};

export const COLUMN_TYPE_COLORS: Record<ColumnType, string> = {
  numeric: "#2980b9",
  categorical: "#8e44ad",
  date: "#16a085",
  text: "#7f8c8d",
  percentage: "#f39c12",
  likert_scale: "#c0392b",
  demographic: "#27ae60",
};

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar Chart",
  horizontalBar: "Horizontal Bar",
  groupedBar: "Grouped Bar",
  stackedBar: "Stacked Bar",
  line: "Line Chart",
  pie: "Pie Chart",
  doughnut: "Donut Chart",
  scatter: "Scatter Plot",
};

export const DEMOGRAPHIC_KEYWORDS = [
  "age",
  "gender",
  "sex",
  "income",
  "education",
  "region",
  "ethnicity",
  "race",
  "occupation",
  "employment",
  "marital",
  "religion",
  "social_grade",
  "social grade",
  "socioeconomic",
  "class",
  "constituency",
  "country",
  "county",
  "city",
  "postcode",
  "zip",
];

export const LIKERT_PATTERNS = [
  ["strongly agree", "agree", "neutral", "disagree", "strongly disagree"],
  ["strongly agree", "agree", "neither agree nor disagree", "disagree", "strongly disagree"],
  ["very satisfied", "satisfied", "neutral", "dissatisfied", "very dissatisfied"],
  ["very likely", "likely", "neutral", "unlikely", "very unlikely"],
  ["very good", "good", "fair", "poor", "very poor"],
  ["excellent", "good", "fair", "poor", "terrible"],
];

export const MAX_FILE_SIZE_MB = 100;
export const WARN_FILE_SIZE_MB = 50;
export const TYPE_DETECTION_SAMPLE_SIZE = 1000;
export const CATEGORICAL_MAX_UNIQUE = 20;
export const CATEGORICAL_MAX_RATIO = 0.5;
export const MIN_RELIABLE_SAMPLE = 30;
