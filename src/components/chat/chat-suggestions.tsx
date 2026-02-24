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
