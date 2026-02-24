# Phase 2 Design: Claude AI Integration

## Overview

Add a Claude-powered AI analyst to OBFV Data Laser. Users ask natural language questions about their uploaded data and receive narrative answers with inline charts. The AI proactively suggests follow-up analyses and writes executive summaries.

## Architecture: Tool-Use

Claude receives a dataset summary in its system prompt and a set of tool definitions mapping to the app's existing pure-TypeScript analysis functions. When answering questions, Claude calls tools to compute stats, correlations, cross-tabs, etc., then synthesizes the results into narrative responses.

This was chosen over pre-computed context (doesn't scale, can't do ad-hoc analysis) and hybrid approaches (same build cost as full tool-use, more ambiguity).

## Model & API Key

- **Model**: `claude-sonnet-4-20250514`
- **API key**: Server-side environment variable (`ANTHROPIC_API_KEY`), set in Vercel and `.env.local` for development
- Users do not need their own key

## API Route

Single streaming endpoint: `app/api/chat/route.ts`

Request payload:
- `messages`: Conversation history (user + assistant messages)
- `datasetSummary`: Pre-computed dataset metadata
- `datasetRows`: Full rows for small datasets (<=5,000 rows), omitted for large datasets
- `toolResult`: Optional — client-side tool execution result being sent back

Response: Server-Sent Events stream containing text deltas, tool calls, and completion signals.

### Tool-Use Loop

1. User sends message
2. Route builds system prompt + tools, calls Anthropic SDK with streaming
3. If Claude returns a tool call:
   - **Small dataset**: Execute tool server-side against `datasetRows`, feed result back to Claude, continue streaming
   - **Large dataset**: Stream `tool_call` event to client. Client executes tool locally, sends result back via new request. Route feeds result to Claude and continues.
4. Stream final text response to client

## Tool Definitions

| Tool | Existing Function | Purpose |
|---|---|---|
| `compute_stats` | `computeColumnStats()` | Descriptive stats for one or more columns |
| `compute_correlation` | `computeCorrelation()` | Pearson r between two numeric columns |
| `correlation_matrix` | `computeCorrelationMatrix()` | Full correlation matrix |
| `cross_tab` | `computeCrossTab()` | Contingency table for two categorical columns |
| `group_by` | `computeGroupBy()` | Stats broken down by categorical groups |
| `filter_data` | New | Filter rows by conditions, return filtered subset summary |
| `create_chart` | New | Return chart spec (type, x, y, groupBy) rendered inline by frontend |
| `get_sample_rows` | New | Return N rows (optionally filtered) for value inspection |
| `get_value_counts` | New | Frequency distribution for a categorical column |

Tools 1-5 wrap existing functions. Tools 6-9 are new thin wrappers.

## Chat UI: Side Panel

- **Position**: Right side of dashboard, collapsible, ~400px wide
- **Toggle**: Button in AppHeader (sparkle icon), pushes main content left
- **Messages**: User bubbles right-aligned, AI messages left-aligned rendered as Markdown
- **Inline charts**: When Claude calls `create_chart`, a small Chart.js chart renders in the message bubble
- **Tool indicators**: Subtle animated pills ("Analyzing correlations...") shown during tool execution
- **Input**: Text input at bottom, Enter to send, Shift+Enter for newline
- **Streaming**: Token-by-token response rendering
- **State**: Conversation history in Zustand store, cleared on new dataset upload

## Data Flow & Payload Strategy

### Dataset Summary (sent every request, ~2-4KB)

- Column names, detected types, unique value counts, missing percentages
- Numeric columns: mean, median, min, max, std dev
- Categorical columns: top 10 values with counts
- First 5 sample rows
- Total row count

### Tool Execution Split

- **<=5,000 rows**: Full dataset sent to API route on first message, cached for conversation. Tools run server-side.
- **>5,000 rows**: Tools execute client-side. API streams `tool_call` events; frontend runs analysis locally; result sent back to continue.

### Context Window Management

- System prompt + dataset summary always included
- Conversation history trimmed to last 10 exchanges if approaching context limit
- Older messages summarized or dropped (newest retained)

## Proactive Analyst Behavior

### Welcome Analysis

On first chat panel open after data upload, Claude automatically:
1. Calls `compute_stats`, `correlation_matrix`, `get_value_counts` on key columns
2. Writes a 2-3 paragraph executive summary of the dataset
3. Highlights data quality issues, key patterns, notable correlations

### Follow-Up Suggestions

After each AI response, 2-3 clickable suggestion chips appear below the message. Contextual to what was just discussed. Clicking sends as next user message.

### Narrative Style

Claude writes in natural language, not just tables. Numbers are contextualized: "Sales peak in Q3, averaging $42K — 35% higher than the yearly mean."

All driven by system prompt engineering — no special code paths.

## Dependencies

- `@anthropic-ai/sdk` — Official Anthropic TypeScript SDK
- `react-markdown` + `remark-gfm` — Render AI responses as Markdown with tables
- Existing: `chart.js`, `react-chartjs-2` — Inline charts in chat

## Dark Theme

Chat panel matches existing dashboard palette:
- Panel background: `var(--surface)` (#141b2d)
- User bubbles: `var(--primary)` (#c0392b)
- AI bubbles: `var(--surface-raised)` (#1a2340)
- Text: `var(--foreground)` (#e8ecf4)

## New Files (estimated)

- `src/app/api/chat/route.ts` — Streaming API route with tool-use loop
- `src/lib/ai/system-prompt.ts` — System prompt builder
- `src/lib/ai/tools.ts` — Tool definitions and execution mapping
- `src/lib/ai/dataset-summary.ts` — Pre-compute dataset summary for context
- `src/stores/chat-store.ts` — Conversation state (messages, loading, suggestions)
- `src/components/chat/chat-panel.tsx` — Main side panel container
- `src/components/chat/chat-messages.tsx` — Message list with scroll
- `src/components/chat/chat-message.tsx` — Single message bubble (markdown + charts)
- `src/components/chat/chat-input.tsx` — Text input with send button
- `src/components/chat/chat-suggestions.tsx` — Clickable follow-up chips
- `src/components/chat/inline-chart.tsx` — Chart.js chart inside a message bubble
- `src/components/chat/tool-indicator.tsx` — "Analyzing..." status pills
