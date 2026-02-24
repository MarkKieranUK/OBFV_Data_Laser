# Phase 2: Claude AI Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Claude-powered AI analyst side panel to the dashboard that can answer natural language questions about uploaded datasets using tool-use, render inline charts, and proactively suggest analyses.

**Architecture:** A Next.js streaming API route calls Claude Sonnet with tool definitions that map to the existing pure-TypeScript analysis functions. A collapsible side panel renders the conversation with Markdown formatting and inline Chart.js charts. Small datasets (≤5,000 rows) send full data to the server; large datasets execute tools client-side.

**Tech Stack:** `@anthropic-ai/sdk`, `react-markdown`, `remark-gfm`, existing Chart.js + Zustand + shadcn/ui

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install the Anthropic SDK and Markdown rendering packages**

Run:
```bash
cd /Users/markkieran/CODING/obfv-data-laser && npm install @anthropic-ai/sdk react-markdown remark-gfm
```

**Step 2: Create .env.local for the API key**

Create: `/Users/markkieran/CODING/obfv-data-laser/.env.local`

```
ANTHROPIC_API_KEY=your-key-here
```

**Step 3: Add .env.local to .gitignore if not already there**

Check `.gitignore` for `.env*.local`. Next.js projects include this by default — verify and add if missing.

**Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add anthropic sdk, react-markdown, remark-gfm"
```

---

### Task 2: Dataset Summary Builder

**Files:**
- Create: `src/lib/ai/dataset-summary.ts`
- Create: `src/types/ai.ts`

**Step 1: Define AI types**

Create `src/types/ai.ts`:

```typescript
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
  // Numeric columns only
  stats?: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
  // Categorical columns only
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
```

**Step 2: Build the dataset summary function**

Create `src/lib/ai/dataset-summary.ts`:

```typescript
import type { ColumnMeta } from "@/types/data";
import type { DatasetSummary, ColumnSummary } from "@/types/ai";
import { computeColumnStats } from "@/lib/analysis/statistics";

export function buildDatasetSummary(
  fileName: string,
  rows: Record<string, unknown>[],
  columns: ColumnMeta[]
): DatasetSummary {
  const columnSummaries: ColumnSummary[] = columns.map((col) => {
    const effectiveType = col.overriddenType ?? col.detectedType;
    const summary: ColumnSummary = {
      name: col.name,
      type: effectiveType,
      uniqueValues: col.uniqueValues,
      missingPercent: Math.round(col.missingPercent * 10) / 10,
    };

    // Add stats for numeric columns
    if (effectiveType === "numeric" || effectiveType === "percentage") {
      const stats = computeColumnStats(rows, col.name);
      summary.stats = {
        mean: Math.round(stats.mean * 100) / 100,
        median: Math.round(stats.median * 100) / 100,
        min: stats.min,
        max: stats.max,
        stdDev: Math.round(stats.stdDev * 100) / 100,
      };
    }

    // Add top values for categorical columns
    if (
      effectiveType === "categorical" ||
      effectiveType === "demographic" ||
      effectiveType === "likert_scale"
    ) {
      const freq = new Map<string, number>();
      for (const row of rows) {
        const val = row[col.name];
        if (val === null || val === undefined || val === "") continue;
        const label = String(val).trim();
        if (label) freq.set(label, (freq.get(label) ?? 0) + 1);
      }
      summary.topValues = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));
    }

    return summary;
  });

  return {
    fileName,
    rowCount: rows.length,
    columns: columnSummaries,
    sampleRows: rows.slice(0, 5),
  };
}
```

**Step 3: Commit**

```bash
git add src/types/ai.ts src/lib/ai/dataset-summary.ts
git commit -m "feat: add AI types and dataset summary builder"
```

---

### Task 3: System Prompt & Tool Definitions

**Files:**
- Create: `src/lib/ai/system-prompt.ts`
- Create: `src/lib/ai/tools.ts`

**Step 1: Write the system prompt builder**

Create `src/lib/ai/system-prompt.ts`:

```typescript
import type { DatasetSummary } from "@/types/ai";

export function buildSystemPrompt(summary: DatasetSummary): string {
  const columnDescriptions = summary.columns
    .map((col) => {
      let desc = `- "${col.name}" (${col.type}, ${col.uniqueValues} unique values, ${col.missingPercent}% missing)`;
      if (col.stats) {
        desc += `\n    Stats: mean=${col.stats.mean}, median=${col.stats.median}, min=${col.stats.min}, max=${col.stats.max}, stdDev=${col.stats.stdDev}`;
      }
      if (col.topValues && col.topValues.length > 0) {
        const topStr = col.topValues
          .slice(0, 5)
          .map((v) => `"${v.value}" (${v.count})`)
          .join(", ");
        desc += `\n    Top values: ${topStr}`;
      }
      return desc;
    })
    .join("\n");

  const sampleRowsStr = JSON.stringify(summary.sampleRows.slice(0, 3), null, 2);

  return `You are an expert data analyst working with the user's uploaded dataset. You provide clear, insightful analysis with narrative explanations — not just raw numbers.

## Dataset: "${summary.fileName}"
- **Rows:** ${summary.rowCount.toLocaleString()}
- **Columns:** ${summary.columns.length}

### Column Details:
${columnDescriptions}

### Sample Rows:
\`\`\`json
${sampleRowsStr}
\`\`\`

## Your Behavior

1. **Be proactive.** When you discover something interesting, mention it. Suggest follow-up analyses.
2. **Write narratively.** Contextualize numbers: "Sales peak in Q3 at $42K — 35% above the yearly average" rather than just showing a table.
3. **Use tools.** Call the analysis tools to compute real statistics. Never guess or estimate numbers — always compute them.
4. **Suggest charts.** When a visual would help, use the create_chart tool to render an inline chart.
5. **Follow-up suggestions.** End each response with 2-3 brief follow-up questions the user might want to explore next. Format them as a JSON array in a special block:

<suggestions>["suggestion 1", "suggestion 2", "suggestion 3"]</suggestions>

6. **Be concise but thorough.** Aim for 2-4 paragraphs per response. Use bullet points and bold for key findings.`;
}
```

**Step 2: Write the tool definitions and executor**

Create `src/lib/ai/tools.ts`:

```typescript
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
        row_column: {
          type: "string",
          description: "Categorical column for rows.",
        },
        col_column: {
          type: "string",
          description: "Categorical column for columns.",
        },
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
        group_column: {
          type: "string",
          description: "Categorical column to group by.",
        },
        value_column: {
          type: "string",
          description: "Numeric column to compute statistics for.",
        },
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
        top_n: {
          type: "number",
          description: "Max number of values to return. Default all.",
        },
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
              value: {
                description: "The value to compare against. For 'in' operator, provide an array of strings.",
              },
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
    description:
      "Return a sample of rows from the dataset. Useful for inspecting actual values.",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Number of rows to return. Default 5, max 20.",
        },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Specific columns to include. Default all.",
        },
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
        title: {
          type: "string",
          description: "Chart title.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "X-axis labels or category names.",
        },
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

/**
 * Execute a tool call against the dataset and return the result as a string.
 */
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
        const r = computeCorrelation(
          rows,
          toolInput.column_a as string,
          toolInput.column_b as string
        );
        return JSON.stringify({
          column_a: toolInput.column_a,
          column_b: toolInput.column_b,
          correlation: Math.round(r * 1000) / 1000,
        });
      }

      case "correlation_matrix": {
        const numericCols = columns
          .filter((c) => {
            const t = c.overriddenType ?? c.detectedType;
            return t === "numeric" || t === "percentage";
          })
          .map((c) => c.name);
        const { matrix } = computeCorrelationMatrix(rows, numericCols);
        const topN = (toolInput.top_n as number) || 10;
        const strongest = getStrongestCorrelations(matrix, numericCols, topN);
        return JSON.stringify({
          columns: numericCols,
          strongest_correlations: strongest.map((p) => ({
            ...p,
            r: Math.round(p.r * 1000) / 1000,
          })),
        }, null, 2);
      }

      case "cross_tab": {
        const result = computeCrossTab(
          rows,
          toolInput.row_column as string,
          toolInput.col_column as string
        );
        return JSON.stringify(result, null, 2);
      }

      case "group_by": {
        const result = computeGroupBy(
          rows,
          toolInput.group_column as string,
          toolInput.value_column as string
        );
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
          if (val === null || val === undefined || val === "") {
            missing++;
            continue;
          }
          const label = String(val).trim();
          if (label === "") {
            missing++;
            continue;
          }
          freq.set(label, (freq.get(label) ?? 0) + 1);
          total++;
        }

        let entries = Array.from(freq.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({
            value,
            count,
            percent: Math.round((count / total) * 1000) / 10,
          }));

        if (topN) entries = entries.slice(0, topN);

        return JSON.stringify({
          column,
          total_valid: total,
          missing,
          unique_values: freq.size,
          values: entries,
        }, null, 2);
      }

      case "filter_data": {
        const conditions = toolInput.conditions as Array<{
          column: string;
          operator: string;
          value: unknown;
        }>;

        const filtered = rows.filter((row) =>
          conditions.every((cond) => {
            const val = row[cond.column];
            const numVal = Number(val);
            const strVal = String(val ?? "").toLowerCase();
            const condStr = String(cond.value ?? "").toLowerCase();

            switch (cond.operator) {
              case "equals":
                return strVal === condStr;
              case "not_equals":
                return strVal !== condStr;
              case "greater_than":
                return !isNaN(numVal) && numVal > Number(cond.value);
              case "less_than":
                return !isNaN(numVal) && numVal < Number(cond.value);
              case "greater_or_equal":
                return !isNaN(numVal) && numVal >= Number(cond.value);
              case "less_or_equal":
                return !isNaN(numVal) && numVal <= Number(cond.value);
              case "contains":
                return strVal.includes(condStr);
              case "in":
                return (cond.value as string[]).map((v) => v.toLowerCase()).includes(strVal);
              default:
                return true;
            }
          })
        );

        return JSON.stringify({
          original_count: rows.length,
          filtered_count: filtered.length,
          percent: Math.round((filtered.length / rows.length) * 1000) / 10,
          sample_rows: filtered.slice(0, 5),
        }, null, 2);
      }

      case "get_sample_rows": {
        const count = Math.min((toolInput.count as number) || 5, 20);
        const selectedCols = toolInput.columns as string[] | undefined;
        let sampleRows = rows.slice(0, count);

        if (selectedCols && selectedCols.length > 0) {
          sampleRows = sampleRows.map((row) => {
            const filtered: Record<string, unknown> = {};
            for (const col of selectedCols) {
              filtered[col] = row[col];
            }
            return filtered;
          });
        }

        return JSON.stringify(sampleRows, null, 2);
      }

      case "create_chart": {
        // The chart spec is returned as-is — the frontend will render it
        return JSON.stringify({
          _type: "chart",
          chart_type: toolInput.chart_type,
          title: toolInput.title,
          labels: toolInput.labels,
          datasets: toolInput.datasets,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/ai/system-prompt.ts src/lib/ai/tools.ts
git commit -m "feat: add system prompt builder and tool definitions"
```

---

### Task 4: Streaming API Route

**Files:**
- Create: `src/app/api/chat/route.ts`

**Step 1: Create the streaming chat API route**

Create `src/app/api/chat/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/ai/tools";
import type { DatasetSummary } from "@/types/ai";
import type { ColumnMeta } from "@/types/data";

const anthropic = new Anthropic();

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  datasetSummary: DatasetSummary;
  datasetRows?: Record<string, unknown>[];
  columns: ColumnMeta[];
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const { messages, datasetSummary, datasetRows, columns } = body;

  if (!datasetRows || datasetRows.length === 0) {
    return new Response(
      JSON.stringify({ error: "No dataset rows provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = buildSystemPrompt(datasetSummary);

  // Build Anthropic messages from conversation history
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        let currentMessages = [...anthropicMessages];
        let toolUseLoop = true;

        while (toolUseLoop) {
          toolUseLoop = false;

          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools: TOOL_DEFINITIONS,
            messages: currentMessages,
            stream: true,
          });

          let currentText = "";
          const toolCalls: Array<{
            id: string;
            name: string;
            input: string;
          }> = [];
          let currentToolId = "";
          let currentToolName = "";
          let currentToolInput = "";

          for await (const event of response) {
            switch (event.type) {
              case "content_block_start": {
                if (event.content_block.type === "text") {
                  // Text block starting
                } else if (event.content_block.type === "tool_use") {
                  currentToolId = event.content_block.id;
                  currentToolName = event.content_block.name;
                  currentToolInput = "";
                  send("tool_start", { name: currentToolName });
                }
                break;
              }

              case "content_block_delta": {
                if (event.delta.type === "text_delta") {
                  currentText += event.delta.text;
                  send("text", { text: event.delta.text });
                } else if (event.delta.type === "input_json_delta") {
                  currentToolInput += event.delta.partial_json;
                }
                break;
              }

              case "content_block_stop": {
                if (currentToolName && currentToolId) {
                  toolCalls.push({
                    id: currentToolId,
                    name: currentToolName,
                    input: currentToolInput,
                  });
                  currentToolId = "";
                  currentToolName = "";
                  currentToolInput = "";
                }
                break;
              }

              case "message_stop": {
                // Message complete
                break;
              }
            }
          }

          // If there were tool calls, execute them and continue the loop
          if (toolCalls.length > 0) {
            toolUseLoop = true;

            // Build the assistant message with tool use blocks
            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (currentText) {
              assistantContent.push({ type: "text", text: currentText });
            }
            for (const tc of toolCalls) {
              let parsedInput = {};
              try {
                parsedInput = JSON.parse(tc.input);
              } catch {
                // empty
              }
              assistantContent.push({
                type: "tool_use",
                id: tc.id,
                name: tc.name,
                input: parsedInput,
              });
            }

            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: assistantContent },
            ];

            // Execute each tool and build tool results
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const tc of toolCalls) {
              let parsedInput = {};
              try {
                parsedInput = JSON.parse(tc.input);
              } catch {
                // empty
              }

              const result = executeTool(
                tc.name,
                parsedInput as Record<string, unknown>,
                datasetRows,
                columns
              );

              // If it's a chart spec, also send it to the frontend
              if (tc.name === "create_chart") {
                try {
                  const chartSpec = JSON.parse(result);
                  if (chartSpec._type === "chart") {
                    send("chart", chartSpec);
                  }
                } catch {
                  // not valid JSON, skip
                }
              }

              send("tool_end", { name: tc.name });

              toolResults.push({
                type: "tool_result",
                tool_use_id: tc.id,
                content: result,
              });
            }

            currentMessages = [
              ...currentMessages,
              { role: "user", content: toolResults },
            ];

            // Reset text for next iteration
            currentText = "";
          }
        }

        send("done", {});
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: add streaming chat API route with tool-use loop"
```

---

### Task 5: Chat Store

**Files:**
- Create: `src/stores/chat-store.ts`

**Step 1: Create the Zustand chat store**

Create `src/stores/chat-store.ts`:

```typescript
import { create } from "zustand";
import type { ChatMessage, ToolCallInfo } from "@/types/ai";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  hasRunWelcome: boolean;

  addUserMessage: (content: string) => string;
  addAssistantMessage: () => string;
  appendToAssistant: (id: string, text: string) => void;
  addChartToAssistant: (id: string, chart: ChatMessage["charts"][0]) => void;
  setSuggestions: (id: string, suggestions: string[]) => void;
  addToolCall: (id: string, tool: ToolCallInfo) => void;
  updateToolCall: (id: string, toolName: string, status: ToolCallInfo["status"]) => void;
  finishAssistant: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setHasRunWelcome: (v: boolean) => void;
  clearMessages: () => void;
}

let idCounter = 0;
function nextId() {
  return `msg-${Date.now()}-${++idCounter}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  isOpen: false,
  hasRunWelcome: false,

  addUserMessage: (content) => {
    const id = nextId();
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "user", content, charts: [], suggestions: [], toolCalls: [] },
      ],
    }));
    return id;
  },

  addAssistantMessage: () => {
    const id = nextId();
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id,
          role: "assistant",
          content: "",
          charts: [],
          suggestions: [],
          toolCalls: [],
          isStreaming: true,
        },
      ],
    }));
    return id;
  },

  appendToAssistant: (id, text) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + text } : m
      ),
    })),

  addChartToAssistant: (id, chart) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, charts: [...(m.charts ?? []), chart] } : m
      ),
    })),

  setSuggestions: (id, suggestions) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, suggestions } : m
      ),
    })),

  addToolCall: (id, tool) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? { ...m, toolCalls: [...(m.toolCalls ?? []), tool] }
          : m
      ),
    })),

  updateToolCall: (id, toolName, status) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              toolCalls: (m.toolCalls ?? []).map((tc) =>
                tc.name === toolName ? { ...tc, status } : tc
              ),
            }
          : m
      ),
    })),

  finishAssistant: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setHasRunWelcome: (v) => set({ hasRunWelcome: v }),
  clearMessages: () => set({ messages: [], hasRunWelcome: false }),
}));
```

**Step 2: Commit**

```bash
git add src/stores/chat-store.ts
git commit -m "feat: add chat store for conversation state management"
```

---

### Task 6: Chat Send Hook

**Files:**
- Create: `src/hooks/use-chat.ts`

**Step 1: Create the hook that sends messages and processes the SSE stream**

Create `src/hooks/use-chat.ts`:

```typescript
"use client";

import { useCallback } from "react";
import { useDatasetStore } from "@/stores/dataset-store";
import { useChatStore } from "@/stores/chat-store";
import { buildDatasetSummary } from "@/lib/ai/dataset-summary";
import type { InlineChatChart } from "@/types/ai";

const MAX_ROWS_TO_SEND = 5000;

export function useChat() {
  const fileName = useDatasetStore((s) => s.fileName);
  const rows = useDatasetStore((s) => s.rows);
  const columns = useDatasetStore((s) => s.columns);

  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const addAssistantMessage = useChatStore((s) => s.addAssistantMessage);
  const appendToAssistant = useChatStore((s) => s.appendToAssistant);
  const addChartToAssistant = useChatStore((s) => s.addChartToAssistant);
  const setSuggestions = useChatStore((s) => s.setSuggestions);
  const addToolCall = useChatStore((s) => s.addToolCall);
  const updateToolCall = useChatStore((s) => s.updateToolCall);
  const finishAssistant = useChatStore((s) => s.finishAssistant);
  const setLoading = useChatStore((s) => s.setLoading);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!fileName || isLoading) return;

      addUserMessage(content);
      setLoading(true);
      const assistantId = addAssistantMessage();

      const summary = buildDatasetSummary(fileName, rows, columns);

      // Build message history for the API (exclude the new assistant placeholder)
      const history = useChatStore
        .getState()
        .messages.filter((m) => m.id !== assistantId && !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add the new user message
      history.push({ role: "user" as const, content });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            datasetSummary: summary,
            datasetRows: rows.length <= MAX_ROWS_TO_SEND ? rows : rows.slice(0, MAX_ROWS_TO_SEND),
            columns,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (eventType) {
                  case "text":
                    appendToAssistant(assistantId, data.text);
                    break;
                  case "chart":
                    addChartToAssistant(assistantId, {
                      type: data.chart_type,
                      title: data.title,
                      labels: data.labels,
                      datasets: data.datasets,
                    } as InlineChatChart);
                    break;
                  case "tool_start":
                    addToolCall(assistantId, {
                      name: data.name,
                      status: "running",
                    });
                    break;
                  case "tool_end":
                    updateToolCall(assistantId, data.name, "complete");
                    break;
                  case "error":
                    appendToAssistant(
                      assistantId,
                      `\n\n**Error:** ${data.message}`
                    );
                    break;
                  case "done":
                    break;
                }
              } catch {
                // skip malformed JSON
              }
              eventType = "";
            } else if (line === "") {
              eventType = "";
            }
          }
        }

        // Parse suggestions from the final content
        const finalMsg = useChatStore
          .getState()
          .messages.find((m) => m.id === assistantId);
        if (finalMsg) {
          const sugMatch = finalMsg.content.match(
            /<suggestions>\s*(\[.*?\])\s*<\/suggestions>/s
          );
          if (sugMatch) {
            try {
              const suggestions = JSON.parse(sugMatch[1]);
              setSuggestions(assistantId, suggestions);
              // Remove the suggestions tag from displayed content
              appendToAssistant(assistantId, "");
              useChatStore.setState((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content.replace(
                          /<suggestions>[\s\S]*?<\/suggestions>/,
                          ""
                        ).trim(),
                      }
                    : m
                ),
              }));
            } catch {
              // invalid JSON in suggestions
            }
          }
        }
      } catch (err) {
        appendToAssistant(
          assistantId,
          `**Error:** ${err instanceof Error ? err.message : "Failed to connect to AI"}`
        );
      } finally {
        finishAssistant(assistantId);
        setLoading(false);
      }
    },
    [
      fileName,
      rows,
      columns,
      isLoading,
      addUserMessage,
      addAssistantMessage,
      appendToAssistant,
      addChartToAssistant,
      setSuggestions,
      addToolCall,
      updateToolCall,
      finishAssistant,
      setLoading,
    ]
  );

  return { sendMessage, isLoading };
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-chat.ts
git commit -m "feat: add useChat hook for streaming AI conversation"
```

---

### Task 7: Chat UI Components

**Files:**
- Create: `src/components/chat/chat-panel.tsx`
- Create: `src/components/chat/chat-messages.tsx`
- Create: `src/components/chat/chat-message.tsx`
- Create: `src/components/chat/chat-input.tsx`
- Create: `src/components/chat/chat-suggestions.tsx`
- Create: `src/components/chat/inline-chart.tsx`
- Create: `src/components/chat/tool-indicator.tsx`

These are all client components. Build them in this order:

**Step 1: Tool indicator component**

Create `src/components/chat/tool-indicator.tsx`:

```tsx
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
```

**Step 2: Inline chart component**

Create `src/components/chat/inline-chart.tsx`:

```tsx
"use client";

import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import type { InlineChatChart } from "@/types/ai";
import { CHART_COLORS } from "@/lib/constants";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

const MINI_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  color: "#e2e8f0",
  plugins: {
    legend: {
      display: false,
      labels: { color: "#e2e8f0", font: { size: 10 } },
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      cornerRadius: 4,
      padding: 6,
      titleFont: { size: 11 },
      bodyFont: { size: 10 },
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: { color: "#94a3b8", font: { size: 9 }, maxRotation: 45 },
      grid: { color: "#1e293b" },
    },
    y: {
      ticks: { color: "#94a3b8", font: { size: 9 } },
      grid: { color: "#1e293b" },
      beginAtZero: true,
    },
  },
} as const;

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  color: "#e2e8f0",
  plugins: {
    legend: {
      display: true,
      position: "right" as const,
      labels: { color: "#e2e8f0", font: { size: 9 }, padding: 8 },
    },
    tooltip: MINI_OPTIONS.plugins.tooltip,
  },
} as const;

export function InlineChart({ chart }: { chart: InlineChatChart }) {
  const colors = chart.datasets.length > 1
    ? CHART_COLORS
    : chart.type === "pie" || chart.type === "doughnut"
    ? CHART_COLORS
    : [CHART_COLORS[0]];

  const data = {
    labels: chart.labels,
    datasets: chart.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor:
        chart.type === "pie" || chart.type === "doughnut"
          ? CHART_COLORS.slice(0, chart.labels.length)
          : colors[i % colors.length],
      borderColor:
        chart.type === "line"
          ? colors[i % colors.length]
          : undefined,
      borderWidth: chart.type === "line" ? 2 : 0,
      tension: 0.3,
    })),
  };

  const ChartComponent = {
    bar: Bar,
    horizontalBar: Bar,
    line: Line,
    pie: Pie,
    doughnut: Doughnut,
    scatter: Scatter,
  }[chart.type] ?? Bar;

  const options =
    chart.type === "pie" || chart.type === "doughnut"
      ? PIE_OPTIONS
      : chart.type === "horizontalBar"
      ? { ...MINI_OPTIONS, indexAxis: "y" as const }
      : MINI_OPTIONS;

  return (
    <div className="my-2 rounded-md border border-border bg-background p-2">
      {chart.title && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {chart.title}
        </p>
      )}
      <div className="h-48">
        <ChartComponent data={data} options={options as any} />
      </div>
    </div>
  );
}
```

**Step 3: Chat suggestions component**

Create `src/components/chat/chat-suggestions.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function ChatSuggestions({
  suggestions,
  onSelect,
  disabled,
}: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {suggestions.map((s, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          className="h-auto whitespace-normal rounded-full px-3 py-1 text-left text-xs"
          onClick={() => onSelect(s)}
          disabled={disabled}
        >
          <Sparkles className="mr-1 h-3 w-3 shrink-0 text-accent-blue" />
          {s}
        </Button>
      ))}
    </div>
  );
}
```

**Step 4: Single chat message component**

Create `src/components/chat/chat-message.tsx`:

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "@/types/ai";
import { ToolIndicator } from "./tool-indicator";
import { InlineChart } from "./inline-chart";
import { ChatSuggestions } from "./chat-suggestions";
import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestionSelect: (suggestion: string) => void;
  isLoading: boolean;
}

export function ChatMessage({
  message,
  onSuggestionSelect,
  isLoading,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  // Strip <suggestions> tags from displayed content
  const displayContent = message.content
    .replace(/<suggestions>[\s\S]*?<\/suggestions>/g, "")
    .trim();

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-accent-red" : "bg-accent-blue"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-white" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-white" />
        )}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-accent-red/20 text-foreground"
            : "bg-surface-raised text-foreground"
        }`}
      >
        {/* Tool indicators */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.toolCalls.map((tc, i) => (
              <ToolIndicator key={i} tool={tc} />
            ))}
          </div>
        )}

        {/* Text content */}
        {displayContent && (
          <div className="prose prose-sm prose-invert max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_pre]:bg-background [&_pre]:text-xs [&_code]:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </div>
        )}

        {/* Streaming cursor */}
        {message.isStreaming && !displayContent && (
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-100" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-200" />
          </div>
        )}

        {/* Inline charts */}
        {message.charts && message.charts.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.charts.map((chart, i) => (
              <InlineChart key={i} chart={chart} />
            ))}
          </div>
        )}

        {/* Follow-up suggestions */}
        {!message.isStreaming && message.suggestions && (
          <ChatSuggestions
            suggestions={message.suggestions}
            onSelect={onSuggestionSelect}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 5: Chat input component**

Create `src/components/chat/chat-input.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizonal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border bg-surface p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder ?? "Ask about your data..."}
        disabled={disabled}
        rows={1}
        className="max-h-[120px] min-h-[36px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:opacity-50"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="h-9 w-9 shrink-0 bg-accent-blue hover:bg-accent-blue/80"
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

**Step 6: Chat messages list component**

Create `src/components/chat/chat-messages.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessage } from "./chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";

interface ChatMessagesProps {
  onSuggestionSelect: (suggestion: string) => void;
  isLoading: boolean;
}

export function ChatMessages({
  onSuggestionSelect,
  isLoading,
}: ChatMessagesProps) {
  const messages = useChatStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-blue/20">
          <Bot className="h-6 w-6 text-accent-blue" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">AI Data Analyst</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask me anything about your dataset. I can compute statistics,
            find patterns, create charts, and explain what the data means.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onSuggestionSelect={onSuggestionSelect}
            isLoading={isLoading}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
```

**Step 7: Main chat panel component**

Create `src/components/chat/chat-panel.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useDatasetStore } from "@/stores/dataset-store";
import { useChat } from "@/hooks/use-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Trash2 } from "lucide-react";

export function ChatPanel() {
  const isOpen = useChatStore((s) => s.isOpen);
  const setOpen = useChatStore((s) => s.setOpen);
  const hasRunWelcome = useChatStore((s) => s.hasRunWelcome);
  const setHasRunWelcome = useChatStore((s) => s.setHasRunWelcome);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const { sendMessage, isLoading } = useChat();

  // Auto-run welcome analysis when panel first opens with data
  useEffect(() => {
    if (isOpen && isLoaded && !hasRunWelcome) {
      setHasRunWelcome(true);
      sendMessage(
        "Give me an executive summary of this dataset. What are the key patterns, notable statistics, and any data quality issues I should know about?"
      );
    }
  }, [isOpen, isLoaded, hasRunWelcome, setHasRunWelcome, sendMessage]);

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-[400px] shrink-0 flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-blue" />
          <span className="text-sm font-semibold text-foreground">
            AI Analyst
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages
        onSuggestionSelect={sendMessage}
        isLoading={isLoading}
      />

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

**Step 8: Commit**

```bash
git add src/components/chat/
git commit -m "feat: add chat panel UI components"
```

---

### Task 8: Integrate Chat Panel into Dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/layout/app-header.tsx`

**Step 1: Add chat toggle button to the AppHeader**

In `src/components/layout/app-header.tsx`:

- Add import: `import { Sparkles } from "lucide-react";`
- Add import: `import { useChatStore } from "@/stores/chat-store";`
- Inside the component, add: `const toggleChat = useChatStore((s) => s.toggleOpen);` and `const chatOpen = useChatStore((s) => s.isOpen);`
- Before the "New Upload" button, add a chat toggle button:

```tsx
<Button
  variant={chatOpen ? "default" : "outline"}
  size="sm"
  onClick={toggleChat}
  className={chatOpen ? "bg-accent-blue hover:bg-accent-blue/80" : ""}
>
  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
  AI Analyst
</Button>
```

**Step 2: Add ChatPanel to the dashboard layout**

In `src/app/dashboard/page.tsx`:

- Add import: `import { ChatPanel } from "@/components/chat/chat-panel";`
- Wrap the main content area to include the chat panel:

Change the return JSX from:
```tsx
<div className="flex flex-1 overflow-hidden">
  <SidebarNav />
  <main className="flex-1 overflow-auto p-6">
    <ActiveComponent />
  </main>
</div>
```

To:
```tsx
<div className="flex flex-1 overflow-hidden">
  <SidebarNav />
  <main className="flex-1 overflow-auto p-6">
    <ActiveComponent />
  </main>
  <ChatPanel />
</div>
```

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/layout/app-header.tsx
git commit -m "feat: integrate chat panel into dashboard layout"
```

---

### Task 9: Build Verification & Manual Test

**Step 1: Verify the build compiles cleanly**

Run:
```bash
cd /Users/markkieran/CODING/obfv-data-laser && npm run build
```

Expected: Clean build with no TypeScript errors.

**Step 2: Fix any type errors**

Common issues to watch for:
- `react-markdown` may need `@types/react-markdown` or its types may not align with React 19. Use dynamic import or `as any` if needed.
- Chart.js options type mismatches — use `as any` as done in Phase 1.
- Anthropic SDK types for streaming events — verify event type names match the SDK version.

**Step 3: Test manually**

Run:
```bash
cd /Users/markkieran/CODING/obfv-data-laser && npm run dev
```

1. Upload a CSV file
2. Click "AI Analyst" button in header
3. Verify the welcome analysis fires automatically
4. Type a question like "What are the strongest correlations?"
5. Verify tool indicators show, text streams in, and suggestions appear
6. Try "Show me a bar chart of [column] by [column]" and verify inline chart renders

**Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: resolve build issues from Phase 2 integration"
```

---

### Task 10: Push to GitHub

**Step 1: Push all Phase 2 commits**

```bash
cd /Users/markkieran/CODING/obfv-data-laser && git push origin main
```

**Step 2: Verify on GitHub**

Run:
```bash
gh repo view MarkKieranUK/OBFV_Data_Laser --web
```
