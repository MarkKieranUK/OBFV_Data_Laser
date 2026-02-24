"use client";

import type { ToolCallInfo } from "@/types/ai";
import { Loader2, Check, AlertCircle } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  compute_stats: "Computing statistics",
  compute_correlation: "Calculating correlation",
  correlation_matrix: "Building correlation matrix",
  cross_tab: "Cross-tabulating",
  group_by: "Grouping data",
  get_value_counts: "Counting values",
  filter_data: "Filtering data",
  get_sample_rows: "Sampling rows",
  create_chart: "Creating chart",
};

export function ToolIndicator({ tool }: { tool: ToolCallInfo }) {
  const label = TOOL_LABELS[tool.name] ?? tool.name;

  return (
    <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">
      {tool.status === "running" && (
        <Loader2 className="h-3 w-3 animate-spin text-accent-blue" />
      )}
      {tool.status === "complete" && (
        <Check className="h-3 w-3 text-success" />
      )}
      {tool.status === "error" && (
        <AlertCircle className="h-3 w-3 text-error" />
      )}
      <span>{label}...</span>
    </div>
  );
}
