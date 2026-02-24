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
