import type Anthropic from "@anthropic-ai/sdk";
import type { ColumnMeta } from "@/types/data";
import { computeColumnStats, computeCorrelation } from "@/lib/analysis/statistics";
import { computeCorrelationMatrix, getStrongestCorrelations } from "@/lib/analysis/correlations";
import { computeCrossTab } from "@/lib/analysis/cross-tab";
import { computeGroupBy } from "@/lib/analysis/group-by";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "compute_stats",
    description:
      "Compute descriptive statistics (count, mean, median, mode, std dev, min, max, Q1, Q3) for one or more numeric columns.",
    input_schema: {
      type: "object" as const,
      properties: {
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Column names to compute statistics for.",
        },
      },
      required: ["columns"],
    },
  },
  {
    name: "compute_correlation",
    description:
      "Compute the Pearson correlation coefficient between two numeric columns. Returns a value from -1 to 1.",
    input_schema: {
      type: "object" as const,
      properties: {
        column_a: { type: "string", description: "First numeric column name." },
        column_b: { type: "string", description: "Second numeric column name." },
      },
      required: ["column_a", "column_b"],
    },
  },
  {
    name: "correlation_matrix",
    description:
      "Compute a full Pearson correlation matrix for all numeric columns, and return the strongest correlations.",
    input_schema: {
      type: "object" as const,
      properties: {
        top_n: {
          type: "number",
          description: "Number of strongest correlations to return. Default 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "cross_tab",
    description:
      "Compute a cross-tabulation (contingency table) between two categorical columns. Shows frequency counts for each combination.",
    input_schema: {
      type: "object" as const,
      properties: {
        row_column: { type: "string", description: "Categorical column for rows." },
        col_column: { type: "string", description: "Categorical column for columns." },
      },
      required: ["row_column", "col_column"],
    },
  },
  {
    name: "group_by",
    description:
      "Group data by a categorical column and compute statistics (count, mean, median, min, max) for a numeric column within each group.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_column: { type: "string", description: "Categorical column to group by." },
        value_column: { type: "string", description: "Numeric column to compute statistics for." },
      },
      required: ["group_column", "value_column"],
    },
  },
  {
    name: "get_value_counts",
    description:
      "Get the frequency distribution (value counts) for a categorical column. Returns each unique value and its count, sorted by frequency.",
    input_schema: {
      type: "object" as const,
      properties: {
        column: { type: "string", description: "Column name." },
        top_n: { type: "number", description: "Max number of values to return. Default all." },
      },
      required: ["column"],
    },
  },
  {
    name: "filter_data",
    description:
      "Filter the dataset by conditions and return a summary of the filtered subset. Use for questions like 'How many rows have age > 30?'",
    input_schema: {
      type: "object" as const,
      properties: {
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: {
                type: "string",
                enum: ["equals", "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal", "contains", "in"],
              },
              value: { description: "The value to compare against. For 'in' operator, provide an array of strings." },
            },
            required: ["column", "operator", "value"],
          },
          description: "Array of filter conditions. All conditions are ANDed together.",
        },
      },
      required: ["conditions"],
    },
  },
  {
    name: "get_sample_rows",
    description: "Return a sample of rows from the dataset. Useful for inspecting actual values.",
    input_schema: {
      type: "object" as const,
      properties: {
        count: { type: "number", description: "Number of rows to return. Default 5, max 20." },
        columns: { type: "array", items: { type: "string" }, description: "Specific columns to include. Default all." },
      },
      required: [],
    },
  },
  {
    name: "create_chart",
    description:
      "Create an inline chart that will be rendered in the chat. Use this when a visual representation would help the user understand the data.",
    input_schema: {
      type: "object" as const,
      properties: {
        chart_type: {
          type: "string",
          enum: ["bar", "horizontalBar", "line", "pie", "doughnut", "scatter"],
          description: "Type of chart to create.",
        },
        title: { type: "string", description: "Chart title." },
        labels: { type: "array", items: { type: "string" }, description: "X-axis labels or category names." },
        datasets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              data: { type: "array", items: { type: "number" } },
            },
            required: ["label", "data"],
          },
          description: "One or more datasets to plot.",
        },
      },
      required: ["chart_type", "labels", "datasets"],
    },
  },
];

export function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  rows: Record<string, unknown>[],
  columns: ColumnMeta[]
): string {
  try {
    switch (toolName) {
      case "compute_stats": {
        const colNames = toolInput.columns as string[];
        const results = colNames.map((col) => computeColumnStats(rows, col));
        return JSON.stringify(results, null, 2);
      }
      case "compute_correlation": {
        const r = computeCorrelation(rows, toolInput.column_a as string, toolInput.column_b as string);
        return JSON.stringify({ column_a: toolInput.column_a, column_b: toolInput.column_b, correlation: Math.round(r * 1000) / 1000 });
      }
      case "correlation_matrix": {
        const numericCols = columns.filter((c) => { const t = c.overriddenType ?? c.detectedType; return t === "numeric" || t === "percentage"; }).map((c) => c.name);
        const { matrix } = computeCorrelationMatrix(rows, numericCols);
        const topN = (toolInput.top_n as number) || 10;
        const strongest = getStrongestCorrelations(matrix, numericCols, topN);
        return JSON.stringify({ columns: numericCols, strongest_correlations: strongest.map((p) => ({ ...p, r: Math.round(p.r * 1000) / 1000 })) }, null, 2);
      }
      case "cross_tab": {
        const result = computeCrossTab(rows, toolInput.row_column as string, toolInput.col_column as string);
        return JSON.stringify(result, null, 2);
      }
      case "group_by": {
        const result = computeGroupBy(rows, toolInput.group_column as string, toolInput.value_column as string);
        return JSON.stringify(result, null, 2);
      }
      case "get_value_counts": {
        const column = toolInput.column as string;
        const topN = toolInput.top_n as number | undefined;
        const freq = new Map<string, number>();
        let total = 0;
        let missing = 0;
        for (const row of rows) {
          const val = row[column];
          if (val === null || val === undefined || val === "") { missing++; continue; }
          const label = String(val).trim();
          if (label === "") { missing++; continue; }
          freq.set(label, (freq.get(label) ?? 0) + 1);
          total++;
        }
        let entries = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count, percent: Math.round((count / total) * 1000) / 10 }));
        if (topN) entries = entries.slice(0, topN);
        return JSON.stringify({ column, total_valid: total, missing, unique_values: freq.size, values: entries }, null, 2);
      }
      case "filter_data": {
        const conditions = toolInput.conditions as Array<{ column: string; operator: string; value: unknown }>;
        const filtered = rows.filter((row) =>
          conditions.every((cond) => {
            const val = row[cond.column];
            const numVal = Number(val);
            const strVal = String(val ?? "").toLowerCase();
            const condStr = String(cond.value ?? "").toLowerCase();
            switch (cond.operator) {
              case "equals": return strVal === condStr;
              case "not_equals": return strVal !== condStr;
              case "greater_than": return !isNaN(numVal) && numVal > Number(cond.value);
              case "less_than": return !isNaN(numVal) && numVal < Number(cond.value);
              case "greater_or_equal": return !isNaN(numVal) && numVal >= Number(cond.value);
              case "less_or_equal": return !isNaN(numVal) && numVal <= Number(cond.value);
              case "contains": return strVal.includes(condStr);
              case "in": return (cond.value as string[]).map((v) => v.toLowerCase()).includes(strVal);
              default: return true;
            }
          })
        );
        return JSON.stringify({ original_count: rows.length, filtered_count: filtered.length, percent: Math.round((filtered.length / rows.length) * 1000) / 10, sample_rows: filtered.slice(0, 5) }, null, 2);
      }
      case "get_sample_rows": {
        const count = Math.min((toolInput.count as number) || 5, 20);
        const selectedCols = toolInput.columns as string[] | undefined;
        let sampleRows = rows.slice(0, count);
        if (selectedCols && selectedCols.length > 0) {
          sampleRows = sampleRows.map((row) => {
            const filtered: Record<string, unknown> = {};
            for (const col of selectedCols) filtered[col] = row[col];
            return filtered;
          });
        }
        return JSON.stringify(sampleRows, null, 2);
      }
      case "create_chart": {
        return JSON.stringify({ _type: "chart", chart_type: toolInput.chart_type, title: toolInput.title, labels: toolInput.labels, datasets: toolInput.datasets });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({ error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}
