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
          const toolCalls: Array<{ id: string; name: string; input: string }> = [];
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
                  toolCalls.push({ id: currentToolId, name: currentToolName, input: currentToolInput });
                  currentToolId = "";
                  currentToolName = "";
                  currentToolInput = "";
                }
                break;
              }
              case "message_stop": {
                break;
              }
            }
          }

          if (toolCalls.length > 0) {
            toolUseLoop = true;

            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (currentText) {
              assistantContent.push({ type: "text", text: currentText });
            }
            for (const tc of toolCalls) {
              let parsedInput = {};
              try { parsedInput = JSON.parse(tc.input); } catch { /* empty */ }
              assistantContent.push({ type: "tool_use", id: tc.id, name: tc.name, input: parsedInput });
            }

            currentMessages = [...currentMessages, { role: "assistant", content: assistantContent }];

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const tc of toolCalls) {
              let parsedInput = {};
              try { parsedInput = JSON.parse(tc.input); } catch { /* empty */ }

              const result = executeTool(tc.name, parsedInput as Record<string, unknown>, datasetRows, columns);

              if (tc.name === "create_chart") {
                try {
                  const chartSpec = JSON.parse(result);
                  if (chartSpec._type === "chart") send("chart", chartSpec);
                } catch { /* not valid JSON */ }
              }

              send("tool_end", { name: tc.name });
              toolResults.push({ type: "tool_result", tool_use_id: tc.id, content: result });
            }

            currentMessages = [...currentMessages, { role: "user", content: toolResults }];
            currentText = "";
          }
        }

        send("done", {});
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
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
