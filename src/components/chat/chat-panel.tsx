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

      <ChatMessages
        onSuggestionSelect={sendMessage}
        isLoading={isLoading}
      />

      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
