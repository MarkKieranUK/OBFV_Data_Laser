import { create } from "zustand";
import type { ChatMessage, InlineChatChart, ToolCallInfo } from "@/types/ai";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  hasRunWelcome: boolean;

  addUserMessage: (content: string) => string;
  addAssistantMessage: () => string;
  appendToAssistant: (id: string, text: string) => void;
  addChartToAssistant: (id: string, chart: InlineChatChart) => void;
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
