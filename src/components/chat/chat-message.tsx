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

  const displayContent = message.content
    .replace(/<suggestions>[\s\S]*?<\/suggestions>/g, "")
    .trim();

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
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

      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-accent-red/20 text-foreground"
            : "bg-surface-raised text-foreground"
        }`}
      >
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.toolCalls.map((tc, i) => (
              <ToolIndicator key={i} tool={tc} />
            ))}
          </div>
        )}

        {displayContent && (
          <div className="prose prose-sm prose-invert max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_pre]:bg-background [&_pre]:text-xs [&_code]:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </div>
        )}

        {message.isStreaming && !displayContent && (
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-100" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground delay-200" />
          </div>
        )}

        {message.charts && message.charts.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.charts.map((chart, i) => (
              <InlineChart key={i} chart={chart} />
            ))}
          </div>
        )}

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
