"use client";

import { useRouter } from "next/navigation";
import { Zap, Upload, PanelLeftClose, PanelLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDatasetStore } from "@/stores/dataset-store";
import { useUIStore } from "@/stores/ui-store";
import { useChatStore } from "@/stores/chat-store";

export function AppHeader() {
  const router = useRouter();
  const fileName = useDatasetStore((s) => s.fileName);
  const rowCount = useDatasetStore((s) => s.rowCount);
  const columnCount = useDatasetStore((s) => s.columns.length);
  const clearDataset = useDatasetStore((s) => s.clearDataset);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleChat = useChatStore((s) => s.toggleOpen);
  const chatOpen = useChatStore((s) => s.isOpen);

  const handleNewUpload = () => {
    clearDataset();
    router.push("/");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent-red" />
          <span className="text-sm font-semibold text-foreground">
            Data Laser
          </span>
        </div>

        {fileName && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">{fileName}</span>
            <Badge variant="secondary" className="text-xs">
              {rowCount.toLocaleString()} rows
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {columnCount} cols
            </Badge>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={chatOpen ? "default" : "outline"}
          size="sm"
          onClick={toggleChat}
          className={chatOpen ? "bg-accent-blue hover:bg-accent-blue/80" : ""}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          AI Analyst
        </Button>
        <Button variant="outline" size="sm" onClick={handleNewUpload}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          New Upload
        </Button>
      </div>
    </header>
  );
}
