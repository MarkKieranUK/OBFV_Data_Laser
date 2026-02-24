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
