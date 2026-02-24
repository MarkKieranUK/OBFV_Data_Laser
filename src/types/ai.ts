import type { ChartType } from "@/types/data";

export interface DatasetSummary {
  fileName: string;
  rowCount: number;
  columns: ColumnSummary[];
  sampleRows: Record<string, unknown>[];
}

export interface ColumnSummary {
  name: string;
  type: string;
  uniqueValues: number;
  missingPercent: number;
  stats?: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
  topValues?: { value: string; count: number }[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: InlineChatChart[];
  suggestions?: string[];
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

export interface InlineChatChart {
  type: ChartType;
  title?: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface ToolCallInfo {
  name: string;
  status: "running" | "complete" | "error";
}
