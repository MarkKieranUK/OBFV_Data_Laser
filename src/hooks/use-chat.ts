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
            /<suggestions>\s*([\s\S]*?)\s*<\/suggestions>/
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
